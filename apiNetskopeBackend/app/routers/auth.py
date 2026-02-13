import os
import random
import re
from datetime import datetime, timedelta
import secrets
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, EmailStr, constr

from ..dependencies import get_db, Base, engine
from ..models.user import User
from ..models.login_2fa import Login2FACode
from ..config import settings
from ..utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
)
from .schemas_auth import (
    RegisterIn,
    VerifyIn,
    LoginIn,
    TokenOut,
    MessageOut,
    ForgotIn,
    Verify2FAIn,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme = HTTPBearer(auto_error=True)


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

def _env_bool(name: str, default: bool = False) -> bool:
    """
    Lee booleanos desde variables de entorno, soportando: true/false, 1/0, yes/no, on/off.
    """
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "y", "on")


def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _validar_password(password: str) -> bool:
    return (
        len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[\W_]", password)
    )


def _es_corporativo(correo: str) -> bool:
    return correo.lower().endswith("@" + settings.ALLOWED_EMAIL_DOMAIN.lower())


def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    token = (creds.credentials or "").strip()
    subject = decode_token(token)

    if not subject:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    # ✅ No permitir token temporal 2FA como sesión final
    if str(subject).startswith("2fa:"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token temporal 2FA no es válido para esta operación",
        )

    user = db.query(User).filter(User.correo == subject).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    return user


# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------

class ResetByCodeIn(BaseModel):
    correo: EmailStr
    codigo: constr(min_length=6, max_length=6)  # type: ignore
    new_password: str


# -------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------

@router.get("/me", summary="Devuelve el usuario autenticado")
def me(current: User = Depends(get_current_user)):
    return {
        "correo": current.correo,
        "nombre": current.nombre,
        "apellido": current.apellido,
        "is_verified": current.is_verified,
    }


@router.post("/register", response_model=MessageOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    try:
        correo_norm = validate_email(payload.correo).email
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not _es_corporativo(correo_norm):
        raise HTTPException(
            status_code=400,
            detail=f"Solo correos @{settings.ALLOWED_EMAIL_DOMAIN}",
        )

    if not _validar_password(payload.password):
        raise HTTPException(status_code=400, detail="Contraseña inválida")

    if db.query(User).filter(User.correo == correo_norm).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    code = f"{random.randint(100000, 999999)}"
    user = User(
        nombre=payload.nombre,
        apellido=payload.apellido,
        correo=correo_norm,
        password=get_password_hash(payload.password),
        verification_code=code,
        is_verified=False,
    )
    db.add(user)
    db.commit()

    from ..services.email import enviar_correo_verificacion
    enviar_correo_verificacion(correo_norm, payload.nombre, code)

    return {"message": "Usuario creado. Revisa tu correo para verificar la cuenta."}


@router.post("/verify", response_model=MessageOut)
def verify(payload: VerifyIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.correo == payload.correo).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.is_verified:
        return {"message": "Usuario ya verificado"}

    if user.verification_code != payload.codigo:
        raise HTTPException(status_code=400, detail="Código incorrecto")

    user.is_verified = True
    user.verification_code = None
    db.commit()

    return {"message": "Cuenta verificada correctamente"}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.correo == payload.correo).first()
    if not user:
        raise HTTPException(status_code=401, detail="Correo no registrado")

    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Usuario no verificado")

    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    # ✅ lee el flag desde ENV directamente (evita problemas de settings)
    enable_2fa = _env_bool("ENABLE_2FA", default=False)

    # ------------------------------------------------------------
    # SIN 2FA
    # ------------------------------------------------------------
    if not enable_2fa:
        token = create_access_token(subject=user.correo)
        return {
            "access_token": token,
            "token_type": "bearer",
            "requires_2fa": False,
        }

    # ------------------------------------------------------------
    # CON 2FA
    # ------------------------------------------------------------
    code = f"{secrets.randbelow(1_000_000):06d}"
    expire_minutes = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
    expires_at = datetime.utcnow() + timedelta(minutes=expire_minutes)

    otp = Login2FACode(
        user_id=user.id,
        code_hash=_hash_otp(code),
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()

    from ..services.email import enviar_correo_2fa_codigo
    enviar_correo_2fa_codigo(user.correo, user.nombre or "usuario", code)

    temp_token = create_access_token(subject=f"2fa:{user.correo}:{otp.id}")
    return {
        "access_token": temp_token,
        "token_type": "bearer",
        "requires_2fa": True,
    }


@router.post("/verify-2fa", response_model=TokenOut)
def verify_2fa(
    payload: Verify2FAIn,
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    subject = decode_token((creds.credentials or "").strip())

    if not subject or not str(subject).startswith("2fa:"):
        raise HTTPException(status_code=401, detail="Token 2FA inválido")

    try:
        _, correo, otp_id = str(subject).split(":")
    except ValueError:
        raise HTTPException(status_code=401, detail="Token 2FA malformado")

    otp = db.query(Login2FACode).filter(Login2FACode.id == int(otp_id)).first()

    if not otp or otp.consumed:
        raise HTTPException(status_code=400, detail="Código inválido")

    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="Código expirado")

    max_attempts = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    if otp.attempts >= max_attempts:
        raise HTTPException(status_code=429, detail="Demasiados intentos")

    if otp.code_hash != _hash_otp(payload.codigo):
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Código incorrecto")

    otp.consumed = True
    db.commit()

    final_token = create_access_token(subject=correo)
    return {
        "access_token": final_token,
        "token_type": "bearer",
        "requires_2fa": False,
    }


@router.post("/forgot", response_model=MessageOut)
def forgot(payload: ForgotIn, db: Session = Depends(get_db)):
    generic = {"message": "Si el correo existe, enviaremos instrucciones."}

    try:
        correo_norm = validate_email(payload.correo).email
    except EmailNotValidError:
        return generic

    user = db.query(User).filter(User.correo == correo_norm).first()
    if not user or not user.is_verified:
        return generic

    code = f"{random.randint(100000, 999999)}"
    user.verification_code = code
    db.commit()

    from ..services.email import enviar_correo_reset_codigo
    enviar_correo_reset_codigo(correo_norm, user.nombre or "usuario", code)

    return generic


@router.post("/reset", response_model=MessageOut)
def reset_password(payload: ResetByCodeIn, db: Session = Depends(get_db)):
    try:
        correo_norm = validate_email(payload.correo).email
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Correo inválido")

    user = db.query(User).filter(User.correo == correo_norm).first()
    if not user or not user.is_verified:
        raise HTTPException(status_code=400, detail="Cuenta no válida")

    if user.verification_code != payload.codigo:
        raise HTTPException(status_code=400, detail="Código inválido")

    if not _validar_password(payload.new_password):
        raise HTTPException(status_code=400, detail="Contraseña inválida")

    user.password = get_password_hash(payload.new_password)
    user.verification_code = None
    db.commit()

    return {"message": "Contraseña actualizada correctamente"}
