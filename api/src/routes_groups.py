"""/api/groups/* — CRUD, join, members, invite links and balances."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import balances as balances_lib
import db
import ids
import push
import serialize
from deps import ApiError, background, current_user, get_env, require_admin, require_membership
from money import to_reais
from schemas import CreateGroupBody, JoinGroupBody, UpdateGroupBody

router = APIRouter(prefix="/api/groups")

_MEMBERS_SQL = """
    SELECT gm.id, gm.groupId, gm.userId, gm.role, gm.joinedAt,
           u.name AS user_name, u.email AS user_email, u.avatarUrl AS user_avatarUrl
      FROM group_members gm
      JOIN users u ON u.id = gm.userId
     WHERE gm.groupId = ?
     ORDER BY gm.joinedAt ASC
"""


async def _members_of(env, group_id):
    return [serialize.member(row) for row in await db.query(env, _MEMBERS_SQL, group_id)]


async def _expenses_count(env, group_id) -> int:
    row = await db.query_one(
        env, "SELECT COUNT(*) AS total FROM expenses WHERE groupId = ?", group_id
    )
    return int(row["total"]) if row else 0


async def _touch(env, group_id):
    await db.execute(env, "UPDATE groups SET updatedAt = ? WHERE id = ?", ids.now_iso(), group_id)


@router.get("")
async def list_groups(request: Request):
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]

    groups = await db.query(
        env,
        """
        SELECT g.* FROM groups g
          JOIN group_members gm ON gm.groupId = g.id
         WHERE gm.userId = ?
         ORDER BY g.updatedAt DESC
        """,
        user_id,
    )
    if not groups:
        return []

    group_ids = [g["id"] for g in groups]
    placeholders = ",".join("?" for _ in group_ids)

    member_rows = await db.query(
        env,
        f"""
        SELECT gm.id, gm.groupId, gm.userId, gm.role, gm.joinedAt,
               u.name AS user_name, u.email AS user_email, u.avatarUrl AS user_avatarUrl
          FROM group_members gm
          JOIN users u ON u.id = gm.userId
         WHERE gm.groupId IN ({placeholders})
         ORDER BY gm.joinedAt ASC
        """,
        *group_ids,
    )
    count_rows = await db.query(
        env,
        f"""
        SELECT groupId, COUNT(*) AS total FROM expenses
         WHERE groupId IN ({placeholders}) GROUP BY groupId
        """,
        *group_ids,
    )

    members_by_group = {}
    for row in member_rows:
        members_by_group.setdefault(row["groupId"], []).append(serialize.member(row))
    counts = {row["groupId"]: int(row["total"]) for row in count_rows}
    balance_by_group = await balances_lib.user_balances_by_group(env, user_id)

    return [
        serialize.group(
            group,
            members_by_group.get(group["id"], []),
            user_balance=to_reais(balance_by_group.get(group["id"], 0)),
            expenses_count=counts.get(group["id"], 0),
        )
        for group in groups
    ]


@router.post("", status_code=201)
async def create_group(request: Request, body: CreateGroupBody):
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]

    # The creator is always a member; drop them from memberIds so the
    # (groupId, userId) unique constraint cannot be tripped by the client.
    invited = [uid for uid in dict.fromkeys(body.memberIds) if uid != user_id]

    if invited:
        placeholders = ",".join("?" for _ in invited)
        found = await db.query(
            env, f"SELECT id FROM users WHERE id IN ({placeholders})", *invited
        )
        if len(found) != len(invited):
            raise ApiError(400, "Um ou mais usuários convidados não existem")

    now = ids.now_iso()
    group_id = ids.cuid()

    statements = [
        (
            """INSERT INTO groups (id, name, emoji, description, inviteCode, createdById,
                                   createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [group_id, body.name, body.emoji, body.description, ids.uuid4(), user_id, now, now],
        ),
        (
            """INSERT INTO group_members (id, groupId, userId, role, joinedAt)
               VALUES (?, ?, ?, 'ADMIN', ?)""",
            [ids.cuid(), group_id, user_id, now],
        ),
    ]
    statements += [
        (
            """INSERT INTO group_members (id, groupId, userId, role, joinedAt)
               VALUES (?, ?, ?, 'MEMBER', ?)""",
            [ids.cuid(), group_id, member_id, now],
        )
        for member_id in invited
    ]
    statements.append(
        (
            """INSERT INTO activities (id, groupId, userId, type, description, metadata, createdAt)
               VALUES (?, ?, ?, 'GROUP_CREATED', ?, ?, ?)""",
            [ids.cuid(), group_id, user_id, f'Criou o grupo "{body.name}"', None, now],
        )
    )
    # One D1 batch => one implicit transaction. The group can never exist
    # without its creator-membership row.
    await db.batch(env, statements)

    group = await db.query_one(env, "SELECT * FROM groups WHERE id = ?", group_id)
    return JSONResponse(
        serialize.group(group, await _members_of(env, group_id), user_balance=0),
        status_code=201,
    )


@router.get("/{group_id}")
async def get_group(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    context = await require_membership(env, group_id, claims["userId"])

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

    splits_by_expense = {}
    if expense_rows:
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
        for row in split_rows:
            splits_by_expense.setdefault(row["expenseId"], []).append(serialize.split(row))

    expenses = [
        serialize.expense(row, splits_by_expense.get(row["id"], [])) for row in expense_rows
    ]

    return serialize.group(
        context["group"],
        await _members_of(env, group_id),
        expenses=expenses,
        expenses_count=len(expenses),
    )


@router.put("/{group_id}")
async def update_group(request: Request, group_id: str, body: UpdateGroupBody):
    env = get_env(request)
    claims = current_user(request)
    await require_admin(env, group_id, claims["userId"])

    changes = body.model_dump(exclude_unset=True)
    if changes:
        assignments = ", ".join(f"{field} = ?" for field in changes)
        await db.execute(
            env,
            f"UPDATE groups SET {assignments}, updatedAt = ? WHERE id = ?",
            *changes.values(),
            ids.now_iso(),
            group_id,
        )

    group = await db.query_one(env, "SELECT * FROM groups WHERE id = ?", group_id)
    return serialize.group(
        group,
        await _members_of(env, group_id),
        expenses_count=await _expenses_count(env, group_id),
    )


@router.delete("/{group_id}")
async def delete_group(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)

    group = await db.query_one(env, "SELECT * FROM groups WHERE id = ?", group_id)
    if group is None:
        raise ApiError(404, "Grupo não encontrado")
    if group["createdById"] != claims["userId"]:
        raise ApiError(403, "Apenas o criador pode excluir o grupo")

    # members, expenses (-> splits), settlements and activities all cascade.
    await db.execute(env, "DELETE FROM groups WHERE id = ?", group_id)
    return {"success": True}


@router.post("/join")
async def join_group(request: Request, body: JoinGroupBody):
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]

    group = await db.query_one(
        env, "SELECT * FROM groups WHERE inviteCode = ?", body.inviteCode
    )
    if group is None:
        raise ApiError(404, "Código de convite inválido")

    existing = await db.query_one(
        env,
        "SELECT id FROM group_members WHERE groupId = ? AND userId = ?",
        group["id"],
        user_id,
    )
    if existing:
        raise ApiError(409, "Você já é membro deste grupo")

    user = await db.query_one(env, "SELECT name FROM users WHERE id = ?", user_id)
    now = ids.now_iso()
    await db.batch(
        env,
        [
            (
                """INSERT INTO group_members (id, groupId, userId, role, joinedAt)
                   VALUES (?, ?, ?, 'MEMBER', ?)""",
                [ids.cuid(), group["id"], user_id, now],
            ),
            (
                """INSERT INTO activities (id, groupId, userId, type, description, metadata, createdAt)
                   VALUES (?, ?, ?, 'MEMBER_JOINED', 'Entrou no grupo', ?, ?)""",
                [ids.cuid(), group["id"], user_id, None, now],
            ),
        ],
    )

    await background(
        push.send_to_group(
            env,
            group["id"],
            user_id,
            "Novo membro no grupo",
            f"{user['name']} entrou no grupo {group['name']}",
            {"groupId": group["id"], "type": "MEMBER_JOINED"},
        ),
    )
    return {"success": True, "groupId": group["id"]}


@router.get("/{group_id}/members")
async def list_members(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    await require_membership(env, group_id, claims["userId"])
    return await _members_of(env, group_id)


@router.delete("/{group_id}/members")
async def remove_member(request: Request, group_id: str, userId: str | None = None):
    env = get_env(request)
    claims = current_user(request)
    actor_id = claims["userId"]

    if not userId:
        raise ApiError(400, "userId é obrigatório")

    context = await require_membership(env, group_id, actor_id)
    group = context["group"]

    # Anyone could remove anyone in the Express version. Now you may remove
    # yourself, or an admin may remove someone else.
    is_self = userId == actor_id
    if not is_self and context["membership"]["role"] != "ADMIN":
        raise ApiError(403, "Apenas admins podem remover outros membros")

    target = await db.query_one(
        env,
        """SELECT gm.id, u.name FROM group_members gm
             JOIN users u ON u.id = gm.userId
            WHERE gm.groupId = ? AND gm.userId = ?""",
        group_id,
        userId,
    )
    if target is None:
        raise ApiError(404, "Usuário não é membro deste grupo")

    # Leaving with money on the table silently corrupts everyone else's
    # balances: the splits stay behind but the person no longer appears.
    balance = await balances_lib.user_balance(env, group_id, userId)
    if abs(balance) >= balances_lib.DUST_CENTS:
        raise ApiError(
            400,
            "Este membro ainda tem saldo pendente no grupo. Acerte as contas antes de sair."
            if not is_self
            else "Você ainda tem saldo pendente neste grupo. Acerte as contas antes de sair.",
        )

    now = ids.now_iso()
    await db.batch(
        env,
        [
            ("DELETE FROM group_members WHERE id = ?", [target["id"]]),
            (
                """INSERT INTO activities (id, groupId, userId, type, description, metadata, createdAt)
                   VALUES (?, ?, ?, 'MEMBER_LEFT', 'Saiu do grupo', ?, ?)""",
                [ids.cuid(), group_id, actor_id, None, now],
            ),
        ],
    )

    await background(
        push.send_to_group(
            env,
            group_id,
            actor_id,
            "Membro saiu do grupo",
            f"{target['name']} saiu do grupo {group['name']}",
            {"groupId": group_id, "type": "MEMBER_LEFT"},
        ),
    )
    return {"success": True}


@router.get("/{group_id}/invite")
async def get_invite(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    context = await require_membership(env, group_id, claims["userId"])
    group = context["group"]

    base_url = getattr(env, "INVITE_BASE_URL", "") or ""
    return {
        "inviteCode": group["inviteCode"],
        "inviteLink": f"{base_url}/invite/{group['inviteCode']}",
        "groupName": group["name"],
    }


@router.get("/{group_id}/balances")
async def get_balances(request: Request, group_id: str):
    env = get_env(request)
    claims = current_user(request)
    await require_membership(env, group_id, claims["userId"])

    rows = await balances_lib.group_balances(env, group_id)
    debts = balances_lib.simplify_debts(rows)
    spent = await balances_lib.total_spent(env, group_id)

    return {
        "balances": [
            {
                "userId": row["userId"],
                "userName": row["userName"],
                "avatarUrl": row.get("avatarUrl"),
                "pixKey": row.get("pixKey"),
                "amount": to_reais(row["balance"]),
            }
            for row in rows
        ],
        "debts": [
            {"from": d["from"], "to": d["to"], "amount": to_reais(d["amount_cents"])}
            for d in debts
        ],
        "totalSpent": to_reais(spent),
    }
