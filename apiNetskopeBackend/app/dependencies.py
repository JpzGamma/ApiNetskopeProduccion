import psycopg2
from psycopg2 import sql
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine.url import make_url
from .config import settings


def create_database_if_not_exists():
    """
    Crea la base de datos en PostgreSQL si no existe.
    Usa la URL definida en settings.DATABASE_URL.
    """
    db_url = settings.DATABASE_URL
    parsed = urlparse(db_url)

    db_name = parsed.path.lstrip("/")      
    user = parsed.username                 
    password = parsed.password            
    host = parsed.hostname                
    port = parsed.port or 5432             

    conn = psycopg2.connect(
        dbname="postgres", user=user, password=password, host=host, port=port
    )
    conn.autocommit = True
    cursor = conn.cursor()


    cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cursor.fetchone()

    if not exists:
        print(f"🆕 Creando base de datos '{db_name}' en PostgreSQL...")
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
        print(f"✅ Base de datos '{db_name}' creada correctamente.")
    else:
        print(f"🟢 Base de datos '{db_name}' ya existe.")

    cursor.close()
    conn.close()

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está definido. Revisa .env.dev/.env.prod")

try:
    make_url(settings.DATABASE_URL)
except Exception as e:
    raise RuntimeError(f"DATABASE_URL inválido: {settings.DATABASE_URL!r}. Detalle: {e}")

create_database_if_not_exists()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()