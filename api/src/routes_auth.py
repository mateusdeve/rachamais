"""/api/auth/* — register, login, Google, Apple, me."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import db
import ids
import security
from deps import ApiError, current_user, get_env
from schemas import AppleAuthBody, GoogleAuthBody, LoginBody, RegisterBody

router = APIRouter(prefix="/api/auth")


def _auth_response(user: dict, secret: str, *, include_created=False, status=200):
    payload = {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "avatarUrl": user.get("avatarUrl"),
        },
        "token": security.create_token(user["id"], user["email"], secret),
    }
    if include_created:
        payload["user"]["createdAt"] = user["createdAt"]
    return JSONResponse(payload, status_code=status)


def _jwt_secret(env) -> str:
    secret = getattr(env, "JWT_SECRET", None)
    if not secret:
        raise ApiError(500, "Erro de configuração do servidor")
    return secret


async def _create_user(env, *, name, email, password_hash, avatar_url=None) -> dict:
    now = ids.now_iso()
    user = {
        "id": ids.cuid(),
        "name": name,
        "email": email,
        "password": password_hash,
        "avatarUrl": avatar_url,
        "pixKey": None,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.execute(
        env,
        """INSERT INTO users (id, name, email, password, avatarUrl, pixKey, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        user["id"],
        user["name"],
        user["email"],
        user["password"],
        user["avatarUrl"],
        None,
        now,
        now,
    )
    return user


@router.post("/register")
async def register(request: Request, body: RegisterBody):
    env = get_env(request)
    secret = _jwt_secret(env)

    existing = await db.query_one(env, "SELECT id FROM users WHERE email = ?", body.email)
    if existing:
        raise ApiError(409, "Email já cadastrado")

    user = await _create_user(
        env,
        name=body.name,
        email=body.email,
        password_hash=await security.hash_password(body.password),
    )
    return _auth_response(user, secret, include_created=True, status=201)


@router.post("/login")
async def login(request: Request, body: LoginBody):
    env = get_env(request)
    secret = _jwt_secret(env)

    user = await db.query_one(env, "SELECT * FROM users WHERE email = ?", body.email)
    if user is None:
        raise ApiError(401, "Email ou senha inválidos")

    valid, upgraded_hash = await security.verify_password(env, body.password, user["password"])
    if not valid:
        raise ApiError(401, "Email ou senha inválidos")

    # The password was still a bcrypt hash from the Express server. It verified,
    # so replace it with PBKDF2 now — this is what eventually retires the
    # LEGACY_BCRYPT binding.
    if upgraded_hash:
        await db.execute(
            env,
            "UPDATE users SET password = ?, updatedAt = ? WHERE id = ?",
            upgraded_hash,
            ids.now_iso(),
            user["id"],
        )

    return _auth_response(user, secret)


@router.post("/google")
async def google_login(request: Request, body: GoogleAuthBody):
    env = get_env(request)
    secret = _jwt_secret(env)

    raw_ids = getattr(env, "GOOGLE_OAUTH_CLIENT_IDS", "") or ""
    client_ids = [cid.strip() for cid in raw_ids.split(",") if cid.strip()]
    if not client_ids:
        raise ApiError(
            500,
            "Login com Google não está configurado no servidor. Tente novamente mais tarde.",
        )

    try:
        claims = await security.verify_google_token(body.idToken, client_ids)
    except Exception as error:  # noqa: BLE001
        print(f"google auth failed: {error}")
        raise ApiError(500, "Erro ao autenticar com Google")

    email = claims.get("email")
    if not email:
        raise ApiError(400, "Conta Google não possui email válido.")

    name = claims.get("name") or "Usuário"
    picture = claims.get("picture")

    # Accounts are linked purely by email — there is no googleId column, and the
    # original server behaved the same way.
    user = await db.query_one(env, "SELECT * FROM users WHERE email = ?", email)
    if user is None:
        user = await _create_user(
            env,
            name=name,
            email=email,
            # Social accounts get an unusable random password: they can never be
            # used to sign in through /login, which is the intent.
            password_hash=await security.hash_password(f"google-{email}-{ids.cuid()}"),
            avatar_url=picture,
        )
    elif not user.get("avatarUrl") and picture:
        await db.execute(
            env,
            "UPDATE users SET avatarUrl = ?, updatedAt = ? WHERE id = ?",
            picture,
            ids.now_iso(),
            user["id"],
        )
        user["avatarUrl"] = picture

    return _auth_response(user, secret)


@router.post("/apple")
async def apple_login(request: Request, body: AppleAuthBody):
    env = get_env(request)
    secret = _jwt_secret(env)

    raw_ids = getattr(env, "APPLE_BUNDLE_ID", "") or "com.rachamais.app"
    bundle_ids = [bid.strip() for bid in raw_ids.split(",") if bid.strip()]

    try:
        claims = await security.verify_apple_token(body.identityToken, bundle_ids)
    except Exception as error:  # noqa: BLE001
        raise ApiError(401, "Token da Apple inválido ou expirado.", details=str(error))

    subject = claims.get("sub")
    email = claims.get("email")
    # Apple's "Hide My Email" users arrive without one; the synthetic address
    # keeps the account stable across logins because sub is stable.
    user_email = email if email else f"apple_{subject}@privaterelay.appleid.com"
    full_name = (body.fullName or "").strip()
    user_name = full_name if full_name else "Usuário Apple"

    user = await db.query_one(env, "SELECT * FROM users WHERE email = ?", user_email)
    if user is None:
        user = await _create_user(
            env,
            name=user_name,
            email=user_email,
            password_hash=await security.hash_password(f"apple-{subject}-{ids.cuid()}"),
        )
    elif user["name"] == "Usuário Apple" and full_name:
        # Apple only sends the real name on the very first authorization, so
        # backfill it if we stored the placeholder last time.
        await db.execute(
            env,
            "UPDATE users SET name = ?, updatedAt = ? WHERE id = ?",
            full_name,
            ids.now_iso(),
            user["id"],
        )
        user["name"] = full_name

    return _auth_response(user, secret)


@router.get("/me")
async def me(request: Request):
    env = get_env(request)
    claims = current_user(request)

    user = await db.query_one(
        env,
        "SELECT id, name, email, avatarUrl, pixKey, createdAt FROM users WHERE id = ?",
        claims["userId"],
    )
    if user is None:
        raise ApiError(404, "Usuário não encontrado")
    return user
