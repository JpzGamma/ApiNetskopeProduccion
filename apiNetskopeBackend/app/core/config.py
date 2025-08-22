from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "apiNetskope"
    DEBUG: bool = True
    # Coma-separados, ej: http://localhost:5173,http://localhost:3000
    ALLOWED_ORIGINS: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins_list(self) -> List[str]:
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [s.strip() for s in self.ALLOWED_ORIGINS.split(",") if s.strip()]

settings = Settings()