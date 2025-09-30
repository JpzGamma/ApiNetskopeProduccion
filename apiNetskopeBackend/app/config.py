import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
APP_ENV = os.getenv("APP_ENV", "dev").lower()
ENV_FILE = BASE_DIR / (".env.dev" if APP_ENV == "dev" else ".env.prod")

load_dotenv(dotenv_path=ENV_FILE)


class Settings:
    """
    Summary:
        Proveedor centralizado de configuración de la aplicación. Carga variables desde .env según APP_ENV.

    Attributes:
        APP_ENV (str): Entorno actual ("dev" o "prod").
        SECRET_KEY (str): Clave para firmar tokens u otros secretos.
        ALLOWED_EMAIL_DOMAIN (str): Dominio permitido para registro de usuarios.
        ACCESS_TOKEN_EXPIRE_MINUTES (int): Minutos de expiración del JWT.
        DATABASE_URL (str): URL de conexión a la base de datos.
        SMTP_HOST (str): Host SMTP para envío de correos.
        SMTP_PORT (int): Puerto SMTP.
        MAIL_USERNAME (str): Usuario/correo autenticado para SMTP.
        MAIL_PASSWORD (str): Contraseña para SMTP.
        RESET_TOKEN_EXPIRE_MINUTES (int): Minutos de expiración del token/código de reset.
        NETSKOPE_TENANT_GAMMA (str): URL base del tenant de Netskope (Gamma).
        NETSKOPE_TOKEN_GAMMA (str): Token Bearer para consumir APIs de Netskope (Gamma).
        FRONTEND_URL (str): URL del frontend para configurar CORS.

    Return:
        Settings: Instancia con valores ya leídos del entorno.
    """

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

    NETSKOPE_TENANT_GAMMA: str = os.getenv("NETSKOPE_TENANT_GAMMA", "")
    NETSKOPE_TOKEN_GAMMA: str = os.getenv("NETSKOPE_TOKEN_GAMMA", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3005")

    class Config:
        """
        Summary:
            Metaconfiguración para librerías que lean .env por convención.
        Params:
            None
        Return:
            None
        """
        env_file = ".env.dev"


settings = Settings()