"""Shared request plumbing: env access, auth, and authorization."""

from contextvars import ContextVar

from fastapi import Request

import db
from security import verify_token


class ApiError(Exception):
    """An error the client should see, rendered as {"error": message}."""

    def __init__(self, status: int, message: str, **extra):
        self.status = status
        self.message = message
        self.extra = extra
        super().__init__(message)


def get_env(request: Request):
    """Worker bindings (DB, secrets, vars) ride in on the ASGI scope."""
    return request.scope["env"]


# The ASGI adapter only puts `env` on the scope — there is no execution context
# there — so the entrypoint stashes it here instead. A ContextVar (not a plain
# global) keeps it correct when requests overlap: each request task gets its own.
_worker_ctx: ContextVar = ContextVar("worker_ctx", default=None)


def set_worker_ctx(ctx) -> None:
    _worker_ctx.set(ctx)


def current_user(request: Request) -> dict:
    """Claims of the caller's JWT. Raises 401 if absent or invalid."""
    env = get_env(request)
    header = request.headers.get("authorization") or ""
    if not header.startswith("Bearer "):
        raise ApiError(401, "Não autorizado")

    secret = getattr(env, "JWT_SECRET", None)
    if not secret:
        raise ApiError(500, "Erro de configuração do servidor")

    claims = verify_token(header[7:], secret)
    if not claims or not claims.get("userId"):
        raise ApiError(401, "Não autorizado")
    return claims


async def background(coro):
    """Run work after the response is sent, without blocking the client.

    Falls back to awaiting inline if waitUntil is unavailable. Dropping the
    coroutine instead would silently swallow every push notification.
    """
    ctx = _worker_ctx.get()
    if ctx is not None:
        try:
            ctx.waitUntil(coro)
            return
        except Exception as error:  # noqa: BLE001
            print(f"waitUntil unavailable, running inline: {error}")
    await coro


# --------------------------------------------------------------------------
# Authorization
# --------------------------------------------------------------------------
#
# The Express server only ever asked "is this a valid JWT?" on most group
# routes — balances, members, invite, expenses (read *and* write) and
# settlements (read) were readable and writable by ANY authenticated user for
# ANY group id. These helpers close that hole. The app never relied on it: it
# only ever requests groups the user belongs to.

async def require_membership(env, group_id: str, user_id: str) -> dict:
    """Caller must be a member of the group. Raises 404 / 403."""
    group = await db.query_one(env, "SELECT * FROM groups WHERE id = ?", group_id)
    if group is None:
        raise ApiError(404, "Grupo não encontrado")

    membership = await db.query_one(
        env,
        "SELECT * FROM group_members WHERE groupId = ? AND userId = ?",
        group_id,
        user_id,
    )
    if membership is None:
        raise ApiError(403, "Você não é membro deste grupo")

    return {"group": group, "membership": membership}


async def require_admin(env, group_id: str, user_id: str) -> dict:
    context = await require_membership(env, group_id, user_id)
    if context["membership"]["role"] != "ADMIN":
        raise ApiError(403, "Apenas admins podem editar o grupo")
    return context
