# app/main.py
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse

# Routers
from app.routers import auth
from app.routers import netskopeGammaRouter
from app.routers import netskopeCCIRouter
from app.routers import netskopeUsersRouter
from app.routers import netskopeGroupsRouter
from app.routers import netskopePrivateAppsRouter
from app.routers import netskopePoliciesRouter
from app.routers.auth import get_current_user

# Config / DB
from app.config import settings
from app.dependencies import Base, engine

def _parse_origins(*vals: str) -> List[str]:
    out: List[str] = []
    for v in vals:
        if not v:
            continue
        for p in v.split(","):
            p = p.strip().rstrip("/")
            if p:
                out.append(p)
    seen = set()
    uniques: List[str] = []
    for o in out:
        if o not in seen:
            uniques.append(o)
            seen.add(o)
    return uniques

app = FastAPI(
    title="ApiNetskope",
    description="Documentacion ApiNetskope",
    version="1.0.0",
)

# --------- CORS robusto (DEV vs PROD) ----------
origins = _parse_origins(
    getattr(settings, "FRONTEND_URL", None),
    getattr(settings, "FRONTEND_URLS", None),  # opcional: "http://localhost:3005,http://127.0.0.1:3005"
)

is_dev = (getattr(settings, "APP_ENV", "dev") or "").lower() == "dev"

# Regla: si hay orígenes declarados, usar esos; si no, en DEV acepta localhost/127.0.0.1 vía regex.
allow_all = is_dev and not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all else origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handler explícito para TODOS los preflight
@app.options("/{path:path}")
def any_preflight(path: str, request: Request):
    return Response(status_code=200)

# --------------- Eventos ---------------
@app.on_event("startup")
def on_startup():
    print("🔧 Verificando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas verificadas / creadas correctamente.")
    if is_dev:
        if origins:
            print(f"🟢 DEV CORS -> allow_origins: {origins}")
        else:
            print("🟢 DEV CORS -> allow_origin_regex: localhost/127.0.0.1")

# --------------- Routers ---------------
app.include_router(auth.router)  # público

# protegidos
app.include_router(netskopeGammaRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeCCIRouter.router,          dependencies=[Depends(get_current_user)])
app.include_router(netskopeUsersRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeGroupsRouter.router,       dependencies=[Depends(get_current_user)])
app.include_router(netskopePrivateAppsRouter.router,  dependencies=[Depends(get_current_user)])
app.include_router(netskopePoliciesRouter.router,     dependencies=[Depends(get_current_user)])

# --------------- Meta ---------------
@app.get("/", include_in_schema=False, tags=["Meta"], summary="Service status")
def root():
    return {
        "status": "running",
        "service": "ApiNetskope - Auth",
        "env": settings.APP_ENV,
        "docs": "/docs",
        "time": datetime.now(timezone.utc).isoformat()
    }

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/auth", include_in_schema=False)
def auth_index():
    return {"message": "Usa POST /auth/register, POST /auth/verify, POST /auth/login o abre /docs"}