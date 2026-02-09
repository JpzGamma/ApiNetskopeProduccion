# app/main.py
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# Routers
from app.routers import auth
from app.routers import netskopeGammaRouter
from app.routers import netskopeCCIRouter
from app.routers import netskopeUsersRouter
from app.routers import netskopeGroupsRouter
from app.routers import netskopePrivateAppsRouter
from app.routers import netskopePoliciesRouter
from app.routers import netskopeScoreRouter
from app.routers import netskopeChatRouter 
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
    # únicos y en orden
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

# --------- CORS (incluye la nueva dirección) ----------
# Puedes manejarlo por env:
# FRONTEND_URL=http://10.1.10.195:3005
# FRONTEND_URLS=http://10.1.10.195:3005,https://apinetskope.gammaingenieros.com:3005
origins = _parse_origins(
    getattr(settings, "FRONTEND_URL", None),
    getattr(settings, "FRONTEND_URLS", None),
)

# Añadimos por código la IP/dominio si aún no está en las env (seguro para dev/test)
_default_allow = [
    "http://10.1.10.195:3005",
    "https://10.1.10.195:3005",
    "https://apinetskope.gammaingenieros.com:3005",
    "https://apinetskope.gammaingenieros.com",
    "http://apinetskope.gammaingenieros.com:3005",
]
for o in _default_allow:
    if o and o.rstrip("/") not in origins:
        origins.append(o.rstrip("/"))

is_dev = (getattr(settings, "APP_ENV", "dev") or "").lower() == "dev"
# Si no hay ninguna URL y estamos en dev, aceptamos localhost/127.0.0.1 via regex.
allow_all = is_dev and not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all else origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handler explícito para preflight (OPTIONS) en cualquier ruta
@app.options("/{path:path}")
def any_preflight(path: str, request: Request):
    return Response(status_code=200)

# --------------- Eventos ---------------
@app.on_event("startup")
def on_startup():
    print("🔧 Verificando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas verificadas / creadas correctamente.")
    if origins:
        print(f"🟢 CORS allow_origins: {origins}")
    elif allow_all:
        print("🟢 DEV CORS -> allow_origin_regex: localhost/127.0.0.1")

# --------------- Routers ---------------
app.include_router(auth.router)  # público
app.include_router(netskopeChatRouter.router)
# protegidos
app.include_router(netskopeGammaRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeCCIRouter.router,          dependencies=[Depends(get_current_user)])
app.include_router(netskopeUsersRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeGroupsRouter.router,       dependencies=[Depends(get_current_user)])
app.include_router(netskopePrivateAppsRouter.router,  dependencies=[Depends(get_current_user)])
app.include_router(netskopePoliciesRouter.router,     dependencies=[Depends(get_current_user)])
app.include_router(netskopeScoreRouter.router,     dependencies=[Depends(get_current_user)])


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
