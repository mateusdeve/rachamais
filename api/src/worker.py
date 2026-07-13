"""RachaMais API — FastAPI on Cloudflare Python Workers, backed by D1.

Entrypoint. The Worker hands each request to the ASGI app; bindings (DB,
JWT_SECRET, ...) travel on the ASGI scope and are read via deps.get_env.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from workers import WorkerEntrypoint

import routes_auth
import routes_expenses
import routes_groups
import routes_misc
import routes_settlements
import routes_users
import deps
from deps import ApiError

app = FastAPI(title="RachaMais API", docs_url=None, redoc_url=None)

# The API is consumed by a native app and the web build; it authenticates with a
# bearer token rather than cookies, so there is no credentialed cross-origin
# surface to protect here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def handle_api_error(request: Request, exc: ApiError):
    return JSONResponse({"error": exc.message, **exc.extra}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    """Surface only the first problem, as {"error": "..."}.

    The app reads `error` and shows it to the user verbatim, so the pt-BR
    messages from schemas.py have to survive intact — FastAPI's default
    `detail` array would render as an unreadable blob in the UI.
    """
    errors = exc.errors()
    if not errors:
        return JSONResponse({"error": "Requisição inválida"}, status_code=400)

    first = errors[0]
    if first["type"] == "missing":
        message = "Required"
    else:
        # Pydantic prefixes messages raised from validators.
        message = str(first.get("msg", "")).removeprefix("Value error, ")
    return JSONResponse({"error": message or "Requisição inválida"}, status_code=400)


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    print(f"unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse({"error": "Erro interno do servidor"}, status_code=500)


app.include_router(routes_auth.router)
app.include_router(routes_groups.router)
app.include_router(routes_expenses.router)
app.include_router(routes_settlements.router)
app.include_router(routes_users.router)
app.include_router(routes_misc.router)


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        # The ASGI scope carries `env` but not the execution context, so hand it
        # over here — deps.background needs it to run pushes past the response.
        deps.set_worker_ctx(self.ctx)
        return await asgi.fetch(app, request.js_object, self.env, self.ctx)
