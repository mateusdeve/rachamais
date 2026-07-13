"""/api/groups/{id}/settlements — list and record payments."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import balances as balances_lib
import db
import ids
import push
import serialize
from deps import ApiError, background, current_user, get_env, require_membership
from money import to_br_string, to_cents, to_decimal_string
from schemas import CreateSettlementBody

router = APIRouter(prefix="/api/groups")


@router.get("/{group_id}/settlements")
async def list_settlements(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    await require_membership(env, group_id, claims["userId"])

    rows = await db.query(
        env,
        """
        SELECT s.*,
               f.name AS from_name, f.avatarUrl AS from_avatarUrl,
               t.name AS to_name,   t.avatarUrl AS to_avatarUrl
          FROM settlements s
          JOIN users f ON f.id = s.fromUserId
          JOIN users t ON t.id = s.toUserId
         WHERE s.groupId = ?
         ORDER BY s.settledAt DESC
        """,
        group_id,
    )
    return [serialize.settlement(row) for row in rows]


@router.post("/{group_id}/settlements", status_code=201)
async def create_settlement(request: Request, group_id: str, body: CreateSettlementBody):
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]
    await require_membership(env, group_id, user_id)

    if body.fromUserId == body.toUserId:
        raise ApiError(400, "Não é possível pagar para si mesmo")

    members = await db.query(
        env,
        "SELECT userId FROM group_members WHERE groupId = ? AND userId IN (?, ?)",
        group_id,
        body.fromUserId,
        body.toUserId,
    )
    if len(members) != 2:
        raise ApiError(400, "Ambos usuários devem ser membros do grupo")

    is_payer = user_id == body.fromUserId
    is_receiver = user_id == body.toUserId
    if not is_payer and not is_receiver:
        raise ApiError(403, "Você não pode criar este settlement")

    # A settlement is only meaningful if the payer actually owes the group, and
    # it must never exceed the debt — otherwise it flips their balance positive
    # and invents money.
    balance = await balances_lib.user_balance(env, group_id, body.fromUserId)
    if balance >= 0:
        raise ApiError(
            400,
            ("Você não deve dinheiro neste grupo" if is_payer
             else "Este usuário não deve dinheiro neste grupo"),
        )

    amount_due = abs(balance)
    amount_cents = to_cents(body.amount)

    if amount_cents > amount_due:
        subject = "Você deve apenas" if is_payer else "Este usuário deve apenas"
        raise ApiError(
            400,
            f"{subject} R$ {to_br_string(amount_due)}. "
            "O valor do pagamento não pode exceder esse valor.",
        )
    if amount_cents < 1:
        raise ApiError(400, "Valor do pagamento deve ser pelo menos R$ 0,01")

    now = ids.now_iso()
    settlement_id = ids.cuid()
    await db.batch(
        env,
        [
            (
                """INSERT INTO settlements (id, groupId, fromUserId, toUserId, amount,
                                            paymentMethod, note, settledAt, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    settlement_id,
                    group_id,
                    body.fromUserId,
                    body.toUserId,
                    amount_cents,
                    body.paymentMethod,
                    body.note,
                    now,
                    now,
                ],
            ),
            (
                """INSERT INTO activities (id, groupId, userId, type, description, metadata, createdAt)
                   VALUES (?, ?, ?, 'SETTLEMENT_MADE', ?, ?, ?)""",
                [
                    ids.cuid(),
                    group_id,
                    user_id,
                    f"Registrou acerto de R$ {to_decimal_string(amount_cents)}",
                    None,
                    now,
                ],
            ),
        ],
    )
    await db.execute(env, "UPDATE groups SET updatedAt = ? WHERE id = ?", now, group_id)

    row = await db.query_one(
        env,
        """
        SELECT s.*,
               f.name AS from_name, f.avatarUrl AS from_avatarUrl,
               t.name AS to_name,   t.avatarUrl AS to_avatarUrl
          FROM settlements s
          JOIN users f ON f.id = s.fromUserId
          JOIN users t ON t.id = s.toUserId
         WHERE s.id = ?
        """,
        settlement_id,
    )
    formatted = to_br_string(amount_cents)

    async def notify():
        await push.send_to_users(
            env,
            [body.toUserId],
            "Você recebeu um pagamento!",
            f"{row['from_name']} pagou R$ {formatted} para você",
            {"groupId": group_id, "type": "SETTLEMENT_RECEIVED"},
        )
        await push.send_to_users(
            env,
            [body.fromUserId],
            "Pagamento registrado",
            f"Você pagou R$ {formatted} para {row['to_name']}",
            {"groupId": group_id, "type": "SETTLEMENT_MADE"},
        )

    await background(notify())
    return JSONResponse(serialize.settlement(row), status_code=201)
