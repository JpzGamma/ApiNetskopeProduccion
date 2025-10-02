from fastapi import FastAPI, Depends
from fastapi.responses import Response
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.routers import netskopeGammaRouter
from app.routers import netskopeCCIRouter
from app.routers import netskopeUsersRouter
from app.routers import netskopeGroupsRouter
from app.routers import netskopePrivateAppsRouter
from app.routers import netskopePoliciesRouter
from app.models import user
from app.config import settings
from app.routers.auth import get_current_user

app = FastAPI(
    title="ApiNetskope",
    description="Documentacion ApiNetskope",
    version="1.0.0",
)

app.include_router(auth.router)

app.include_router(netskopeGammaRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeCCIRouter.router,          dependencies=[Depends(get_current_user)])
app.include_router(netskopeUsersRouter.router,        dependencies=[Depends(get_current_user)])
app.include_router(netskopeGroupsRouter.router,       dependencies=[Depends(get_current_user)])
app.include_router(netskopePrivateAppsRouter.router,  dependencies=[Depends(get_current_user)])
app.include_router(netskopePoliciesRouter.router,        dependencies=[Depends(get_current_user)])


app.add_middleware(
    CORSMiddleware,
    allow_origins=[(settings.FRONTEND_URL or "").rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False, tags=["Meta"], summary="Service status")
def root():
    """
    Summary:
        Endpoint de estado del servicio.
    Params:
        None
    Return:
        dict: Información básica del servicio (estado, nombre, entorno, ruta de docs y hora UTC).
    """
    return {
        "status": "running",
        "service": "ApiNetskope - Auth",
        "env": settings.APP_ENV,
        "docs": "/docs",
        "time": datetime.now(timezone.utc).isoformat()
    }
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """
    Summary:
        Evita error 404 del favicon solicitado por el navegador.
    Params:
        None
    Return:
        fastapi.Response: Respuesta vacía con status 204.
    """
    return Response(status_code=204)

@app.get("/auth", include_in_schema=False)
def auth_index():
    """
    Summary:
        Pista rápida para el uso de las rutas de autenticación.
    Params:
        None
    Return:
        dict: Mensaje indicando endpoints de autenticación disponibles.
    """
    return {"message": "Usa POST /auth/register, POST /auth/verify, POST /auth/login o abre /docs"}