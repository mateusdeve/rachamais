"""Balance computation and debt simplification.

Sign convention (unchanged from the Express server):
    balance = paid_for_others - own_share - settlements_received + settlements_paid
    positive => the group owes this user;  negative => this user owes the group.

All arithmetic is in integer cents. The old server pulled Decimals out of
Postgres, coerced them to JS floats, and then rounded at the edges with
Math.round; the rounding was there to paper over float drift. In cents the sums
are exact, so the results match what that code was trying to compute — without
the dust.
"""

import db

# A balance under one cent is treated as settled, matching the old
# `>= 0.01` / `<= -0.01` thresholds.
DUST_CENTS = 1

_BALANCE_EXPR = """
  COALESCE((SELECT SUM(e.amount) FROM expenses e
             WHERE e.groupId = :gid AND e.paidById = :uid), 0)
- COALESCE((SELECT SUM(es.amount) FROM expense_splits es
             JOIN expenses e2 ON e2.id = es.expenseId
            WHERE e2.groupId = :gid AND es.userId = :uid), 0)
- COALESCE((SELECT SUM(s.amount) FROM settlements s
             WHERE s.groupId = :gid AND s.toUserId = :uid), 0)
+ COALESCE((SELECT SUM(s.amount) FROM settlements s
             WHERE s.groupId = :gid AND s.fromUserId = :uid), 0)
"""


async def user_balance(env, group_id: str, user_id: str) -> int:
    """Net balance of one user in one group, in cents."""
    sql = f"SELECT ({_BALANCE_EXPR.replace(':gid', '?').replace(':uid', '?')}) AS balance"
    # The expression references gid/uid four times each, interleaved.
    params = [group_id, user_id] * 4
    row = await db.query_one(env, sql, *params)
    return int(row["balance"] or 0) if row else 0


async def group_balances(env, group_id: str) -> list[dict]:
    """Every member's balance in one round trip, in member-row order.

    The Express version ran four aggregate queries *per member* (an N+1 storm);
    this collapses to a single statement.
    """
    expr = _BALANCE_EXPR.replace(":gid", "gm.groupId").replace(":uid", "gm.userId")
    rows = await db.query(
        env,
        f"""
        SELECT gm.userId          AS userId,
               u.name             AS userName,
               u.avatarUrl        AS avatarUrl,
               u.pixKey           AS pixKey,
               ({expr})           AS balance
          FROM group_members gm
          JOIN users u ON u.id = gm.userId
         WHERE gm.groupId = ?
         ORDER BY gm.joinedAt ASC
        """,
        group_id,
    )
    for row in rows:
        row["balance"] = int(row["balance"] or 0)
    return rows


async def user_balances_by_group(env, user_id: str) -> dict[str, int]:
    """The caller's balance in every group they belong to, keyed by group id.

    Backs GET /api/groups, which previously fired four aggregate queries per
    group per request.
    """
    expr = _BALANCE_EXPR.replace(":gid", "gm.groupId").replace(":uid", "gm.userId")
    rows = await db.query(
        env,
        f"""
        SELECT gm.groupId AS groupId, ({expr}) AS balance
          FROM group_members gm
         WHERE gm.userId = ?
        """,
        user_id,
    )
    return {row["groupId"]: int(row["balance"] or 0) for row in rows}


async def total_spent(env, group_id: str) -> int:
    """Gross spend of the group in cents — not net of settlements."""
    row = await db.query_one(
        env,
        "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE groupId = ?",
        group_id,
    )
    return int(row["total"] or 0) if row else 0


def simplify_debts(balances: list[dict]) -> list[dict]:
    """Greedy two-pointer settle-up: biggest creditor against biggest debtor.

    Produces at most (members - 1) transfers. Ported from the Express
    implementation, including the ordering (both sides sorted by magnitude,
    descending) so the app shows the same suggested payments.
    """
    creditors = sorted(
        (dict(b) for b in balances if b["balance"] >= DUST_CENTS),
        key=lambda b: -b["balance"],
    )
    debtors = sorted(
        (dict(b, balance=-b["balance"]) for b in balances if b["balance"] <= -DUST_CENTS),
        key=lambda b: -b["balance"],
    )

    debts = []
    i = j = 0
    while i < len(creditors) and j < len(debtors):
        creditor = creditors[i]
        debtor = debtors[j]
        amount = min(creditor["balance"], debtor["balance"])
        if amount < DUST_CENTS:
            break

        debts.append(
            {
                "from": _party(debtor),
                "to": _party(creditor),
                "amount_cents": amount,
            }
        )

        creditor["balance"] -= amount
        debtor["balance"] -= amount
        if creditor["balance"] < DUST_CENTS:
            i += 1
        if debtor["balance"] < DUST_CENTS:
            j += 1

    return debts


def _party(row: dict) -> dict:
    return {
        "id": row["userId"],
        "name": row["userName"],
        "avatarUrl": row.get("avatarUrl"),
        "pixKey": row.get("pixKey"),
    }
