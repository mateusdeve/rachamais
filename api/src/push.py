"""Expo push notifications.

Notification delivery must never fail a request — the old server swallowed every
error, and so do we. Sends are fired through Worker `waitUntil` so the user is
not kept waiting on Expo's API.
"""

import json

from js import JSON as JS_JSON
from js import fetch

import db

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_CHUNK_SIZE = 100  # Expo rejects batches larger than this.

# Expo tells us a token is dead in these cases; anything else is transient.
_DEAD_TOKEN_ERRORS = {"DeviceNotRegistered", "InvalidCredentials", "MessageTooBig"}


async def send_to_users(env, user_ids, title, body, data=None):
    """Push to every device belonging to the given users. Never raises."""
    try:
        recipients = [uid for uid in dict.fromkeys(user_ids) if uid]
        if not recipients:
            return

        access_token = getattr(env, "EXPO_ACCESS_TOKEN", None)
        if not access_token:
            print("EXPO_ACCESS_TOKEN not set; skipping push")
            return

        placeholders = ",".join("?" for _ in recipients)
        tokens = await db.query(
            env,
            f"SELECT id, token FROM device_tokens WHERE userId IN ({placeholders})",
            *recipients,
        )
        if not tokens:
            return

        dead_token_ids = []
        for start in range(0, len(tokens), EXPO_CHUNK_SIZE):
            chunk = tokens[start : start + EXPO_CHUNK_SIZE]
            messages = [
                {
                    "to": t["token"],
                    "sound": "default",
                    "title": title,
                    "body": body,
                    "data": data or {},
                }
                for t in chunk
            ]
            dead_token_ids += await _post_chunk(access_token, messages, chunk)

        if dead_token_ids:
            placeholders = ",".join("?" for _ in dead_token_ids)
            await db.execute(
                env,
                f"DELETE FROM device_tokens WHERE id IN ({placeholders})",
                *dead_token_ids,
            )
    except Exception as error:  # noqa: BLE001 — push must never break a request
        print(f"push failed: {error}")


async def _post_chunk(access_token, messages, chunk) -> list[str]:
    """Send one batch; return the ids of tokens Expo reported as dead."""
    response = await fetch(
        EXPO_PUSH_URL,
        JS_JSON.parse(
            json.dumps(
                {
                    "method": "POST",
                    "headers": {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {access_token}",
                    },
                    "body": json.dumps(messages),
                }
            )
        ),
    )
    if not response.ok:
        print(f"Expo push returned {response.status}")
        return []

    payload = json.loads(await response.text())
    results = payload.get("data") or []

    dead = []
    # Expo answers positionally: results[i] corresponds to chunk[i].
    for token, result in zip(chunk, results):
        if result.get("status") == "ok":
            continue
        error = (result.get("details") or {}).get("error") or ""
        if error in _DEAD_TOKEN_ERRORS or "Invalid" in error:
            dead.append(token["id"])
        else:
            print(f"Expo push error: {error}")
    return dead


async def send_to_group(env, group_id, exclude_user_id, title, body, data=None):
    """Push to every member of a group except the one who triggered the event."""
    try:
        members = await db.query(
            env,
            "SELECT userId FROM group_members WHERE groupId = ? AND userId != ?",
            group_id,
            exclude_user_id,
        )
        await send_to_users(env, [m["userId"] for m in members], title, body, data)
    except Exception as error:  # noqa: BLE001
        print(f"group push failed: {error}")
