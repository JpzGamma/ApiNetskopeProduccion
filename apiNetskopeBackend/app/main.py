from fastapi import FastAPI
from fastapi.responses import Response
from datetime import datetime, timezone

from app.routers import auth
from app.config import settings

app = FastAPI(
    title="ApiNetskope - Auth",
    description="Módulo de Login con validación de correo corporativo, verificación por código y JWT.",
    version="1.0.0",
)

app.include_router(auth.router)

# Mensaje en la raíz
@app.get("/", include_in_schema=False, tags=["Meta"], summary="Service status")
def root():
    return {
        "status": "running",
        "service": "ApiNetskope - Auth",
        "env": settings.APP_ENV,
        "docs": "/docs",
        "time": datetime.now(timezone.utc).isoformat()
    }

# Evitar 404 de favicon del navegador (opcional)
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

# (Opcional) Si quieres que /auth también responda con algo útil
@app.get("/auth", include_in_schema=False)
def auth_index():
    return {"message": "Usa POST /auth/register, POST /auth/verify, POST /auth/login o abre /docs"}