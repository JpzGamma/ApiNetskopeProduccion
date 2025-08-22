from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

# CORS (ajusta origins si tienes frontend en 5173/3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.origins_list == ["*"] else settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}

app.include_router(api_v1)