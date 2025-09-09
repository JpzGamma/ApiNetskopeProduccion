import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # .../apiNetskopeBackend/app -> /apiNetskopeBackend
APP_ENV = os.getenv("APP_ENV", "dev").lower()
ENV_FILE = BASE_DIR / (".env.dev" if APP_ENV == "dev" else ".env.prod")

# Carga el .env adecuado (ruta absoluta)
load_dotenv(dotenv_path=ENV_FILE)

class Settings:
    APP_ENV: str = APP_ENV
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALLOWED_EMAIL_DOMAIN: str = os.getenv("ALLOWED_EMAIL_DOMAIN", "gammaingenieros.com")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15"))
     # GAMMA
    NETSKOPE_TENANT_GAMMA: str = os.getenv("NETSKOPE_TENANT_GAMMA", "")
    NETSKOPE_TOKEN_GAMMA: str  = os.getenv("NETSKOPE_TOKEN_GAMMA", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3005")

    class Config:
        env_file = ".env.dev" 

settings = Settings()