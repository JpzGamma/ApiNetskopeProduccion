import random, re
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from email_validator import validate_email, EmailNotValidError

from ..dependencies import get_db, Base, engine
from ..models.user import User
from ..config import settings
from ..utils.security import get_password_hash, verify_password, create_access_token, decode_token
from .schemas_auth import RegisterIn, VerifyIn, LoginIn, TokenOut, MessageOut

router = APIRouter(prefix="/auth", tags=["Auth"])

# Crea tablas si no existen al cargar el router
Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def _validar_password(password: str) -> bool:
    return (
        len(password) >= 8 and
        re.search(r"[A-Z]", password) and
        re.search(r"[a-z]", password) and
        re.search(r"[0-9]", password) and
        re.search(r"[\W_]", password)
    )

def _es_corporativo(correo: str) -> bool:
    return correo.lower().endswith("@" + settings.ALLOWED_EMAIL_DOMAIN.lower())

def _get_user_by_token(db: Session, token: str) -> User:
    correo = decode_token(token)
    if not correo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(User).filter(User.correo == correo).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user

@router.post(
    "/register",
    response_model=MessageOut,
    summary="Registro de usuario (requiere correo corporativo) y envío de código",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    # Normaliza email
    try:
        correo_norm = validate_email(payload.correo).email
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not _es_corporativo(correo_norm):
        raise HTTPException(status_code=400, detail=f"Solo correos @{settings.ALLOWED_EMAIL_DOMAIN}")

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
        enviar_correo_verificacion(destinatario=correo_norm, nombre=payload.nombre, codigo=code)
    except Exception as e:
        return {"message": f"Usuario creado, pero no se pudo enviar el correo ({e})."}

    return {"message": "Usuario creado. Revisa tu correo para verificar la cuenta."}

@router.post("/verify", response_model=MessageOut, summary="Verificación por código enviado al correo")
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

@router.post("/login", response_model=TokenOut, summary="Login (JWT) solo para usuarios verificados")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.correo == payload.correo).first()
    if not user:
        raise HTTPException(status_code=401, detail="Correo no registrado")
    if not user.is_verified:
        raise HTTPException(status_code=401, detail="Usuario no verificado. Revisa tu correo.")
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    token = create_access_token(subject=user.correo)
    return {"access_token": token, "token_type": "bearer"}