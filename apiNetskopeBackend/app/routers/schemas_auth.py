from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterIn(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    correo: EmailStr
    password: str = Field(..., min_length=8)


class VerifyIn(BaseModel):
    correo: EmailStr
    codigo: str = Field(..., min_length=6, max_length=6)


class LoginIn(BaseModel):
    correo: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # ✅ clave para que NO se pierda en response_model
    requires_2fa: Optional[bool] = None


class MessageOut(BaseModel):
    message: str


class ForgotIn(BaseModel):
    correo: EmailStr


class ResetTokenIn(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class Verify2FAIn(BaseModel):
    codigo: str = Field(..., min_length=6, max_length=6)
