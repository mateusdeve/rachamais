"""Auth primitives: JWT, password hashing, and social ID-token verification.

Pyodide has no native extension modules, so the Node stack's crypto does not
port over directly:

  * jsonwebtoken (HS256) -> hmac + hashlib from the stdlib. Signing one token is
    a single SHA-256; pure Python is fine here.
  * bcryptjs           -> impossible in-Worker. New passwords use PBKDF2-SHA256
    via native Web Crypto. Hashes written by the old Express server are verified
    by the LEGACY_BCRYPT service binding (a tiny JS Worker) and transparently
    upgraded to PBKDF2 on first successful login, so the binding drains over
    time and can eventually be removed.
  * google-auth-library / verify-apple-id-token -> JWKS fetched over HTTP and
    RS256 signatures verified with Web Crypto's RSASSA-PKCS1-v1_5.
"""

import base64
import hashlib
import hmac
import json
import time

from js import JSON as JS_JSON
from js import Uint8Array, crypto, fetch

PBKDF2_ITERATIONS = 100_000
PBKDF2_PREFIX = "pbkdf2_sha256"
JWT_TTL_SECONDS = 7 * 24 * 60 * 60  # 7d, matching the Express server

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"

_jwks_cache: dict[str, tuple[float, dict]] = {}
_JWKS_TTL_SECONDS = 3600


# --------------------------------------------------------------------------
# base64url
# --------------------------------------------------------------------------

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _to_uint8(raw: bytes):
    return Uint8Array.new(list(raw))


def _from_buffer(buf) -> bytes:
    return bytes(Uint8Array.new(buf).to_py())


def _js_obj(value: dict | list):
    """Build a real JS object/array from a Python dict — JSON.parse keeps the
    nested structure intact without Pyodide's dict->Map conversion surprises."""
    return JS_JSON.parse(json.dumps(value))


# --------------------------------------------------------------------------
# JWT (HS256) — issued and consumed by us
# --------------------------------------------------------------------------

def create_token(user_id: str, email: str, secret: str) -> str:
    issued_at = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "userId": user_id,
        "email": email,
        "iat": issued_at,
        "exp": issued_at + JWT_TTL_SECONDS,
    }
    segments = [
        _b64url_encode(json.dumps(header, separators=(",", ":")).encode()),
        _b64url_encode(json.dumps(payload, separators=(",", ":")).encode()),
    ]
    signing_input = ".".join(segments).encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    segments.append(_b64url_encode(signature))
    return ".".join(segments)


def verify_token(token: str, secret: str) -> dict | None:
    """Return the JWT claims, or None if the token is invalid or expired."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    try:
        header = json.loads(_b64url_decode(header_b64))
        # Reject "alg": "none" and any algorithm swap outright.
        if header.get("alg") != "HS256":
            return None

        expected = hmac.new(
            secret.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected, _b64url_decode(signature_b64)):
            return None

        claims = json.loads(_b64url_decode(payload_b64))
    except Exception:
        return None

    if claims.get("exp") is not None and time.time() >= claims["exp"]:
        return None
    return claims


# --------------------------------------------------------------------------
# Passwords
# --------------------------------------------------------------------------

def is_legacy_bcrypt(stored: str) -> bool:
    return isinstance(stored, str) and stored.startswith(("$2a$", "$2b$", "$2y$"))


def _pbkdf2_params(salt: bytes, iterations: int):
    params = _js_obj({"name": "PBKDF2", "iterations": iterations, "hash": "SHA-256"})
    # salt must reach Web Crypto as a BufferSource, which cannot survive the
    # JSON round-trip used to build the rest of the params object.
    params.salt = _to_uint8(salt)
    return params


async def _pbkdf2(password: str, salt: bytes, iterations: int) -> bytes:
    key = await crypto.subtle.importKey(
        "raw",
        _to_uint8(password.encode()),
        _js_obj({"name": "PBKDF2"}),
        False,
        _js_obj(["deriveBits"]),
    )
    bits = await crypto.subtle.deriveBits(
        _pbkdf2_params(salt, iterations), key, 256
    )
    return _from_buffer(bits)


async def hash_password(password: str) -> str:
    salt = _from_buffer(crypto.getRandomValues(Uint8Array.new(16)))
    digest = await _pbkdf2(password, salt, PBKDF2_ITERATIONS)
    return "$".join(
        [
            PBKDF2_PREFIX,
            str(PBKDF2_ITERATIONS),
            _b64url_encode(salt),
            _b64url_encode(digest),
        ]
    )


async def verify_password(env, password: str, stored: str) -> tuple[bool, str | None]:
    """Check a password against its stored hash.

    Returns (is_valid, upgraded_hash). `upgraded_hash` is non-None only when a
    legacy bcrypt hash verified successfully and should be rewritten as PBKDF2.
    """
    if not stored:
        return False, None

    if is_legacy_bcrypt(stored):
        valid = await _verify_bcrypt_via_binding(env, password, stored)
        if not valid:
            return False, None
        return True, await hash_password(password)

    try:
        prefix, iterations, salt_b64, digest_b64 = stored.split("$")
    except ValueError:
        return False, None
    if prefix != PBKDF2_PREFIX:
        return False, None

    candidate = await _pbkdf2(password, _b64url_decode(salt_b64), int(iterations))
    if not hmac.compare_digest(candidate, _b64url_decode(digest_b64)):
        return False, None
    return True, None


async def _verify_bcrypt_via_binding(env, password: str, stored: str) -> bool:
    binding = getattr(env, "LEGACY_BCRYPT", None)
    if binding is None:
        # Without the shim a legacy user simply cannot log in. Fail closed and
        # make the reason obvious in the logs rather than silently rejecting.
        print("LEGACY_BCRYPT binding missing; cannot verify legacy password hash")
        return False

    response = await binding.fetch(
        "https://legacy-bcrypt/verify",
        _js_obj(
            {
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"password": password, "hash": stored}),
            }
        ),
    )
    if not response.ok:
        print(f"LEGACY_BCRYPT returned {response.status}")
        return False
    result = json.loads(await response.text())
    return bool(result.get("valid"))


# --------------------------------------------------------------------------
# Social ID tokens (RS256 against the provider's JWKS)
# --------------------------------------------------------------------------

async def _get_jwks(url: str) -> dict:
    cached = _jwks_cache.get(url)
    now = time.time()
    if cached and cached[0] > now:
        return cached[1]

    response = await fetch(url)
    if not response.ok:
        raise ValueError(f"Falha ao obter JWKS ({response.status})")
    jwks = json.loads(await response.text())
    _jwks_cache[url] = (now + _JWKS_TTL_SECONDS, jwks)
    return jwks


async def _verify_rs256(token: str, jwks_url: str) -> dict:
    """Verify an RS256 JWT signature against a JWKS and return its claims.

    Signature verification only — the caller checks iss/aud/exp.
    """
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        header = json.loads(_b64url_decode(header_b64))
    except Exception:
        raise ValueError("Token malformado")

    if header.get("alg") != "RS256":
        raise ValueError("Algoritmo do token não suportado")

    jwks = await _get_jwks(jwks_url)
    jwk = next((k for k in jwks.get("keys", []) if k.get("kid") == header.get("kid")), None)
    if jwk is None:
        # Providers rotate keys; drop the cache once and retry before giving up.
        _jwks_cache.pop(jwks_url, None)
        jwks = await _get_jwks(jwks_url)
        jwk = next((k for k in jwks.get("keys", []) if k.get("kid") == header.get("kid")), None)
    if jwk is None:
        raise ValueError("Chave de assinatura não encontrada")

    key = await crypto.subtle.importKey(
        "jwk",
        _js_obj({k: v for k, v in jwk.items() if k not in ("use", "key_ops")}),
        _js_obj({"name": "RSASSA-PKCS1-v1_5", "hash": "SHA-256"}),
        False,
        _js_obj(["verify"]),
    )
    verified = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        _to_uint8(_b64url_decode(signature_b64)),
        _to_uint8(f"{header_b64}.{payload_b64}".encode()),
    )
    if not verified:
        raise ValueError("Assinatura do token inválida")

    return json.loads(_b64url_decode(payload_b64))


def _check_claims(claims: dict, issuers: tuple[str, ...], audiences: list[str]) -> None:
    if claims.get("iss") not in issuers:
        raise ValueError("Emissor do token inválido")

    audience = claims.get("aud")
    audience_list = audience if isinstance(audience, list) else [audience]
    if not any(a in audiences for a in audience_list):
        raise ValueError("Token não pertence a este aplicativo")

    exp = claims.get("exp")
    if exp is None or time.time() >= exp:
        raise ValueError("Token expirado")


async def verify_google_token(token: str, client_ids: list[str]) -> dict:
    claims = await _verify_rs256(token, GOOGLE_JWKS_URL)
    _check_claims(claims, GOOGLE_ISSUERS, client_ids)
    return claims


async def verify_apple_token(token: str, bundle_ids: list[str]) -> dict:
    claims = await _verify_rs256(token, APPLE_JWKS_URL)
    _check_claims(claims, (APPLE_ISSUER,), bundle_ids)
    return claims
