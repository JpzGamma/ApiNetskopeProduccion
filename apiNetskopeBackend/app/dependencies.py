from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine.url import make_url
from .config import settings

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está definido. Revisa .env.dev/.env.prod")

# Valida formato del URL para dar error claro
try:
    make_url(settings.DATABASE_URL)
except Exception as e:
    raise RuntimeError(f"DATABASE_URL inválido: {settings.DATABASE_URL!r}. Detalle: {e}")

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()