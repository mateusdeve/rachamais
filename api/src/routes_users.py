"""/api/users/* — search, profile, account deletion."""

import re

from fastapi import APIRouter, Request

import balances as balances_lib
import db
import ids
from deps import ApiError, current_user, get_env
from schemas import UpdateUserBody

router = APIRouter(prefix="/api/users")

_CPF_RE = re.compile(r"^\d{11}$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE_RE = re.compile(r"^(\+55\d{10,11}|\d{10,11})$")
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

PIX_ERROR = (
    "Chave PIX inválida. Use CPF (11 dígitos), email, telefone (+55DDD...) "
    "ou chave aleatória (UUID)"
)


def _valid_pix_key(key: str) -> bool:
    # Order matters: 11 digits is a CPF, not a phone number.
    return bool(
        _CPF_RE.match(key)
        or _EMAIL_RE.match(key)
        or _PHONE_RE.match(key)
        or _UUID_RE.match(key)
    )


@router.get("/search")
async def search_users(request: Request, q: str = ""):
    env = get_env(request)
    claims = current_user(request)

    query = (q or "").strip()
    if len(query) < 2:
        return []

    pattern = f"%{query.lower()}%"
    return await db.query(
        env,
        """
        SELECT id, name, email, avatarUrl FROM users
         WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
           AND id != ?
         ORDER BY name ASC
         LIMIT 10
        """,
        pattern,
        pattern,
        claims["userId"],
    )


@router.put("/me")
async def update_me(request: Request, body: UpdateUserBody):
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]

    changes = body.model_dump(exclude_unset=True)

    if "pixKey" in changes:
        key = (changes["pixKey"] or "").strip()
        if not key:
            changes["pixKey"] = None  # clearing the key is allowed
        elif not _valid_pix_key(key):
            raise ApiError(400, PIX_ERROR)
        else:
            changes["pixKey"] = key

    if changes:
        assignments = ", ".join(f"{field} = ?" for field in changes)
        await db.execute(
            env,
            f"UPDATE users SET {assignments}, updatedAt = ? WHERE id = ?",
            *changes.values(),
            ids.now_iso(),
            user_id,
        )

    user = await db.query_one(
        env,
        "SELECT id, name, email, avatarUrl, pixKey, createdAt FROM users WHERE id = ?",
        user_id,
    )
    if user is None:
        raise ApiError(404, "Usuário não encontrado")
    return user


@router.delete("/me")
async def delete_me(request: Request):
    """Delete the caller's account.

    The Express version deleted the user's expense_splits outright but kept the
    expenses they had paid (reassigning them to an arbitrary other member). That
    silently rewrote everyone else's balances — money the leaver owed simply
    vanished from the ledger, and the group could never settle to zero again.

    A shared ledger cannot forget a participant who still owes or is owed, so
    instead of destroying rows we:
      * drop the account's PII and credentials, so it can no longer be used and
        holds no personal data (which is what "delete my account" has to mean);
      * leave every group where the balance is already settled;
      * stay a member (now anonymous) of any group where money is still open,
        so the remaining members' balances stay correct.
    """
    env = get_env(request)
    claims = current_user(request)
    user_id = claims["userId"]

    user = await db.query_one(env, "SELECT id FROM users WHERE id = ?", user_id)
    if user is None:
        raise ApiError(404, "Usuário não encontrado")

    memberships = await db.query(
        env, "SELECT groupId FROM group_members WHERE userId = ?", user_id
    )

    for membership in memberships:
        group_id = membership["groupId"]
        others = await db.query(
            env,
            "SELECT userId, role FROM group_members WHERE groupId = ? AND userId != ? "
            "ORDER BY joinedAt ASC",
            group_id,
            user_id,
        )

        if not others:
            # Sole member: nothing of anyone else's is at stake, so the group and
            # its expenses/settlements/activities go with them (all cascade).
            await db.execute(env, "DELETE FROM groups WHERE id = ?", group_id)
            continue

        group = await db.query_one(
            env, "SELECT createdById FROM groups WHERE id = ?", group_id
        )
        if group and group["createdById"] == user_id:
            # Hand the group over, preferring an existing admin.
            heir = next((m for m in others if m["role"] == "ADMIN"), others[0])
            await db.execute(
                env,
                "UPDATE groups SET createdById = ?, updatedAt = ? WHERE id = ?",
                heir["userId"],
                ids.now_iso(),
                group_id,
            )
            await db.execute(
                env,
                "UPDATE group_members SET role = 'ADMIN' WHERE groupId = ? AND userId = ?",
                group_id,
                heir["userId"],
            )

        balance = await balances_lib.user_balance(env, group_id, user_id)
        if abs(balance) < balances_lib.DUST_CENTS:
            await db.execute(
                env,
                "DELETE FROM group_members WHERE groupId = ? AND userId = ?",
                group_id,
                user_id,
            )

    now = ids.now_iso()
    await db.batch(
        env,
        [
            ("DELETE FROM device_tokens WHERE userId = ?", [user_id]),
            (
                """UPDATE users
                      SET name = 'Usuário removido',
                          email = ?,
                          password = ?,
                          avatarUrl = NULL,
                          pixKey = NULL,
                          updatedAt = ?
                    WHERE id = ?""",
                # A password that no hash function can ever produce: the account
                # is unreachable by any login path.
                [f"deleted+{user_id}@rachamais.invalid", "!", now, user_id],
            ),
        ],
    )

    return {"success": True, "message": "Conta deletada com sucesso"}
