"""Activities, push-token registration, the invite page, and health checks."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

import db
import ids
import invite_page
import serialize
from deps import current_user, get_env
from schemas import DeviceTokenBody, UnregisterTokenBody

router = APIRouter()


@router.get("/api/activities")
async def list_activities(request: Request):
    env = get_env(request)
    claims = current_user(request)

    rows = await db.query(
        env,
        """
        SELECT a.*,
               g.name AS group_name, g.emoji AS group_emoji,
               u.name AS user_name, u.avatarUrl AS user_avatarUrl
          FROM activities a
          JOIN groups g ON g.id = a.groupId
          JOIN users u  ON u.id = a.userId
         WHERE a.groupId IN (SELECT groupId FROM group_members WHERE userId = ?)
         ORDER BY a.createdAt DESC
         LIMIT 100
        """,
        claims["userId"],
    )
    return [serialize.activity(row) for row in rows]


@router.post("/api/notifications/register")
async def register_device(request: Request, body: DeviceTokenBody):
    env = get_env(request)
    claims = current_user(request)

    now = ids.now_iso()
    # The token is unique across users: a device that changes hands must follow
    # the account that registered it last, or its owner would keep getting
    # someone else's notifications.
    await db.execute(
        env,
        """
        INSERT INTO device_tokens (id, userId, token, platform, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(token) DO UPDATE SET
            userId = excluded.userId,
            platform = excluded.platform,
            updatedAt = excluded.updatedAt
        """,
        ids.cuid(),
        claims["userId"],
        body.token,
        body.platform,
        now,
        now,
    )
    return {"success": True}


@router.post("/api/notifications/unregister")
async def unregister_device(request: Request, body: UnregisterTokenBody):
    env = get_env(request)
    claims = current_user(request)

    if body.token:
        await db.execute(
            env,
            "DELETE FROM device_tokens WHERE userId = ? AND token = ?",
            claims["userId"],
            body.token,
        )
    else:
        await db.execute(env, "DELETE FROM device_tokens WHERE userId = ?", claims["userId"])
    return {"success": True}


@router.get("/invite/{code}", response_class=HTMLResponse)
async def invite(code: str):
    return HTMLResponse(invite_page.render(code))


@router.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": ids.now_iso()}


@router.get("/")
async def root():
    return {"message": "RachaMais API", "status": "running"}
