"""/api/groups/{id}/expenses — list and create."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import db
import ids
import push
import serialize
from deps import ApiError, background, current_user, get_env, require_membership
from money import to_br_string, to_cents, to_decimal_string
from schemas import CreateExpenseBody

router = APIRouter(prefix="/api/groups")


def compute_splits(total_cents: int, split_type: str, splits) -> list[dict]:
    """Turn the client's split request into exact per-person amounts, in cents.

    The invariant that matters: the parts must sum to the whole. If they don't,
    the money that goes missing never shows up in anyone's balance and the group
    can never settle to zero.

    EQUAL is computed server-side. EXACT / PERCENTAGE / SHARES arrive with the
    amounts already worked out by the app (the old server did no math for them
    either), so here we only verify the sum and absorb sub-cent rounding dust.
    """
    count = len(splits)

    if split_type == "EQUAL":
        base, remainder = divmod(total_cents, count)
        # The first `remainder` participants each carry one extra cent, so the
        # parts add up exactly. R$10 across 3 people => 3.34 / 3.33 / 3.33.
        return [
            {
                "userId": s.userId,
                "amount": base + (1 if index < remainder else 0),
                "percentage": s.percentage,
            }
            for index, s in enumerate(splits)
        ]

    computed = [
        {
            "userId": s.userId,
            "amount": to_cents(s.amount) if s.amount else total_cents // count,
            "percentage": s.percentage,
        }
        for s in splits
    ]

    difference = total_cents - sum(s["amount"] for s in computed)
    if difference:
        # Tolerate at most one cent of rounding per participant — that is dust
        # from the client's own division. Anything larger is a real mismatch and
        # would quietly corrupt the group's balances, so reject it.
        if abs(difference) > count:
            raise ApiError(
                400,
                f"A soma das divisões (R$ {to_decimal_string(total_cents - difference)}) "
                f"não confere com o valor da despesa (R$ {to_decimal_string(total_cents)}).",
            )
        largest = max(computed, key=lambda s: s["amount"])
        largest["amount"] += difference

    return computed


@router.get("/{group_id}/expenses")
async def list_expenses(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    await require_membership(env, group_id, claims["userId"])

    expense_rows = await db.query(
        env,
        """
        SELECT e.*, u.name AS payer_name, u.avatarUrl AS payer_avatarUrl
          FROM expenses e
          JOIN users u ON u.id = e.paidById
         WHERE e.groupId = ?
         ORDER BY e.date DESC
        """,
        group_id,
    )
    if not expense_rows:
        return []

    placeholders = ",".join("?" for _ in expense_rows)
    split_rows = await db.query(
        env,
        f"""
        SELECT es.*, u.name AS user_name
          FROM expense_splits es
          JOIN users u ON u.id = es.userId
         WHERE es.expenseId IN ({placeholders})
        """,
        *[e["id"] for e in expense_rows],
    )

    splits_by_expense = {}
    for row in split_rows:
        splits_by_expense.setdefault(row["expenseId"], []).append(serialize.split(row))

    return [
        serialize.expense(row, splits_by_expense.get(row["id"], [])) for row in expense_rows
    ]


@router.post("/{group_id}/expenses", status_code=201)
async def create_expense(request: Request, group_id: str, body: CreateExpenseBody):
    env = get_env(request)
    claims = current_user(request)
    await require_membership(env, group_id, claims["userId"])

    # The payer and everyone in the split must belong to the group. The Express
    # version checked none of this and let a bad id through to a 500.
    participants = {body.paidById} | {s.userId for s in body.splits}
    placeholders = ",".join("?" for _ in participants)
    members = await db.query(
        env,
        f"""SELECT userId FROM group_members
             WHERE groupId = ? AND userId IN ({placeholders})""",
        group_id,
        *participants,
    )
    if len(members) != len(participants):
        raise ApiError(400, "Todos os participantes devem ser membros do grupo")

    total_cents = to_cents(body.amount)
    computed = compute_splits(total_cents, body.splitType, body.splits)

    now = ids.now_iso()
    expense_id = ids.cuid()
    date = body.date or now

    statements = [
        (
            """INSERT INTO expenses (id, groupId, paidById, amount, description, category,
                                     splitType, date, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                expense_id,
                group_id,
                body.paidById,
                total_cents,
                body.description,
                body.category,
                body.splitType,
                date,
                now,
                now,
            ],
        )
    ]
    statements += [
        (
            """INSERT INTO expense_splits (id, expenseId, userId, amount, percentage)
               VALUES (?, ?, ?, ?, ?)""",
            [ids.cuid(), expense_id, s["userId"], s["amount"], s["percentage"]],
        )
        for s in computed
    ]
    statements.append(
        (
            """INSERT INTO activities (id, groupId, userId, type, description, metadata, createdAt)
               VALUES (?, ?, ?, 'EXPENSE_ADDED', ?, ?, ?)""",
            [
                ids.cuid(),
                group_id,
                claims["userId"],
                f'Adicionou despesa "{body.description}" de R$ {to_decimal_string(total_cents)}',
                None,
                now,
            ],
        )
    )
    # An expense without its splits would be money owed by nobody, so the whole
    # thing goes in as one transactional batch.
    await db.batch(env, statements)
    await db.execute(env, "UPDATE groups SET updatedAt = ? WHERE id = ?", now, group_id)

    row = await db.query_one(
        env,
        """SELECT e.*, u.name AS payer_name, u.avatarUrl AS payer_avatarUrl
             FROM expenses e JOIN users u ON u.id = e.paidById
            WHERE e.id = ?""",
        expense_id,
    )
    split_rows = await db.query(
        env,
        """SELECT es.*, u.name AS user_name
             FROM expense_splits es JOIN users u ON u.id = es.userId
            WHERE es.expenseId = ?""",
        expense_id,
    )
    payload = serialize.expense(row, [serialize.split(s) for s in split_rows])

    audience = [uid for uid in participants if uid != claims["userId"]]
    await background(
        push.send_to_users(
            env,
            audience,
            "Nova despesa adicionada",
            f'{row["payer_name"]} adicionou "{body.description}" '
            f"de R$ {to_br_string(total_cents)}",
            {"groupId": group_id, "type": "EXPENSE_ADDED", "expenseId": expense_id},
        ),
    )
    return JSONResponse(payload, status_code=201)
