import random
import re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, EmailStr, constr
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..dependencies import get_db, Base, engine
from ..models.user import User
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
)

router = APIRouter(prefix="/auth", tags=["Auth"])

Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """
    Summary:
        Obtiene el usuario autenticado a partir de un token Bearer JWT.

    Params:
        db (Session): Sesión de base de datos inyectada.
        creds (HTTPAuthorizationCredentials): Credenciales Bearer extraídas del header Authorization.

    Return:
        User: Instancia del usuario autenticado. Lanza HTTP 401 si el token es inválido/expirado o el usuario no existe.
    """
    token = (creds.credentials or "").strip()
    correo = decode_token(token)
    if not correo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    user = db.query(User).filter(User.correo == correo).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    return user


def _validar_password(password: str) -> bool:
    """
    Summary:
        Valida la complejidad de una contraseña.

    Params:
        password (str): Contraseña en texto plano.

    Return:
        bool: True si cumple requisitos (>=8, mayúscula, minúscula, número y símbolo); False en caso contrario.
    """
    return (
        len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[\W_]", password)
    )


def _es_corporativo(correo: str) -> bool:
    """
    Summary:
        Verifica si el correo pertenece al dominio corporativo permitido.

    Params:
        correo (str): Dirección de correo a validar.

    Return:
        bool: True si el dominio coincide con settings.ALLOWED_EMAIL_DOMAIN; False en caso contrario.
    """
    return correo.lower().endswith("@" + settings.ALLOWED_EMAIL_DOMAIN.lower())


def _get_user_by_token(db: Session, token: str) -> User:
    """
    Summary:
        Resuelve un usuario a partir de un token JWT.

    Params:
        db (Session): Sesión de base de datos.
        token (str): Token JWT codificando el correo del usuario.

    Return:
        User: Usuario encontrado. Lanza HTTP 401 si el token es inválido o el usuario no existe.
    """
    correo = decode_token(token)
    if not correo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido"
        )
    user = db.query(User).filter(User.correo == correo).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
        )
    return user


class ResetByCodeIn(BaseModel):
    """
    Summary:
        Modelo de entrada para restablecer contraseña mediante código.

    Fields:
        correo (EmailStr): Correo del usuario.
        codigo (constr): Código de 6 dígitos recibido por correo.
        new_password (str): Nueva contraseña en texto plano.
    """
    correo: EmailStr
    codigo: constr(min_length=6, max_length=6)  # type: ignore
    new_password: str


@router.get("/me", summary="Devuelve el usuario autenticado")
def me(current: User = Depends(get_current_user)):
    """
    Summary:
        Retorna datos básicos del usuario autenticado.

    Params:
        current (User): Usuario autenticado inyectado por dependencia.

    Return:
        dict: Información pública del usuario (correo, nombre, apellido, is_verified).
    """
    return {
        "correo": current.correo,
        "nombre": current.nombre,
        "apellido": current.apellido,
        "is_verified": current.is_verified,
    }


@router.post(
    "/register",
    response_model=MessageOut,
    summary="Registro de usuario (requiere correo corporativo) y envío de código",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """
    Summary:
        Registra un nuevo usuario, valida dominio corporativo y complejidad de contraseña,
        genera código de verificación y lo envía por correo.

    Params:
        payload (RegisterIn): Datos de registro (nombre, apellido, correo, password).
        db (Session): Sesión de base de datos.

    Return:
        MessageOut: Mensaje de confirmación. Puede indicar que el correo no se pudo enviar aunque se creó el usuario.
    """
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
        raise HTTPException(
            status_code=400,
            detail="Contraseña inválida: mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo",
        )

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

    try:
        from ..services.email import enviar_correo_verificacion
        enviar_correo_verificacion(
            destinatario=correo_norm, nombre=payload.nombre, codigo=code
        )
    except Exception as e:
        return {
            "message": f"Usuario creado, pero no se pudo enviar el correo ({e})."
        }

    return {"message": "Usuario creado. Revisa tu correo para verificar la cuenta."}


@router.post(
    "/verify", response_model=MessageOut, summary="Verificación por código enviado al correo"
)
def verify(payload: VerifyIn, db: Session = Depends(get_db)):
    """
    Summary:
        Verifica la cuenta del usuario comparando el código recibido por correo.

    Params:
        payload (VerifyIn): Correo y código de verificación.
        db (Session): Sesión de base de datos.

    Return:
        MessageOut: Mensaje indicando el resultado de la verificación.
    """
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


@router.post(
    "/login", response_model=TokenOut, summary="Login (JWT) solo para usuarios verificados"
)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """
    Summary:
        Autentica al usuario verificado y emite un token JWT.

    Params:
        payload (LoginIn): Correo y contraseña.
        db (Session): Sesión de base de datos.

    Return:
        TokenOut: access_token (JWT) y token_type ('bearer').
    """
    user = db.query(User).filter(User.correo == payload.correo).first()
    if not user:
        raise HTTPException(status_code=401, detail="Correo no registrado")
    if not user.is_verified:
        raise HTTPException(
            status_code=401, detail="Usuario no verificado. Revisa tu correo."
        )
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    token = create_access_token(subject=user.correo)
    return {"access_token": token, "token_type": "bearer"}


@router.post(
    "/forgot",
    response_model=MessageOut,
    summary="Solicita código para restablecer contraseña (respuesta genérica: anti-enumeración)",
)
def forgot(payload: ForgotIn, db: Session = Depends(get_db)):
    """
    Summary:
        Genera y envía un código de restablecimiento de contraseña si el usuario existe y está verificado.
        Siempre responde con un mensaje genérico para evitar enumeración de usuarios.

    Params:
        payload (ForgotIn): Correo del usuario.
        db (Session): Sesión de base de datos.

    Return:
        MessageOut: Mensaje genérico indicando que, si el correo existe, se enviarán instrucciones.
    """
    generic = {
        "message": "Si el correo existe, enviaremos instrucciones para restablecer tu contraseña."
    }

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

    try:
        from ..services.email import enviar_correo_reset_codigo
        enviar_correo_reset_codigo(
            destinatario=correo_norm,
            nombre=user.nombre or "usuario",
            codigo=code,
        )
    except Exception as e:
        print(f"[FORGOT] Error enviando código de reset a {correo_norm}: {e}")

    return generic


@router.post(
    "/reset",
    response_model=MessageOut,
    summary="Restablece la contraseña usando correo + código (no hay links)",
)
def reset_password(payload: ResetByCodeIn, db: Session = Depends(get_db)):
    """
    Summary:
        Restablece la contraseña validando correo, código y complejidad de la nueva contraseña.

    Params:
        payload (ResetByCodeIn): Correo, código de 6 dígitos y nueva contraseña.
        db (Session): Sesión de base de datos.

    Return:
        MessageOut: Mensaje de confirmación al actualizar la contraseña.
    """
    try:
        correo_norm = validate_email(payload.correo).email
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Correo inválido")

    user = db.query(User).filter(User.correo == correo_norm).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="La cuenta no está verificada")

    if not user.verification_code or user.verification_code != payload.codigo:
        raise HTTPException(status_code=400, detail="Código inválido")

    if not _validar_password(payload.new_password):
        raise HTTPException(
            status_code=400,
            detail="Contraseña inválida: mínimo 8 caracteres con mayúscula, minúscula, número y símbolo",
        )

    user.password = get_password_hash(payload.new_password)
    user.verification_code = None
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}