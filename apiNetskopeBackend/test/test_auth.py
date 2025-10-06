import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.dependencies import get_db
from app.models.user import User
from app.utils.security import get_password_hash, verify_password
from sqlalchemy.orm import Session
import uuid

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db() -> Session:  # type: ignore
    db = next(get_db())
    try:
        
        db.query(User).filter(User.correo.like("%@gammaingenieros.com")).delete()
        db.commit()
        yield db
    finally:
        db.close()

@pytest.fixture
def mock_email():
    with patch("app.services.email.enviar_correo_verificacion") as m1, \
         patch("app.services.email.enviar_correo_reset_codigo") as m2:
        yield (m1, m2)

@pytest.fixture
def test_user(db: Session):
    """
    Fixture para crear un usuario de prueba.
    Se limpia automáticamente después del test.
    """
    correo = f"testuser_{uuid.uuid4().hex[:6]}@gammaingenieros.com"
    user = User(
        nombre="Test",
        apellido="User",
        correo=correo,
        password=get_password_hash("Abc123!@#"),
        is_verified=True,
        verification_code=None,
    )
    db.add(user)
    db.commit()
    yield user
    db.delete(user)
    db.commit()

def test_register_success(client, db, mock_email):
    unique_email = f"newuser_{uuid.uuid4().hex[:6]}@gammaingenieros.com"
    payload = {
        "nombre": "Test",
        "apellido": "User",
        "correo": unique_email,
        "password": "Abc123!@#"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Usuario creado" in data["message"] or "no se pudo enviar" in data["message"]
    mock_email[0].assert_called_once()

    user = db.query(User).filter(User.correo == unique_email).first()
    if user:
        db.delete(user)
        db.commit()

def test_login_success(client, test_user):
    payload = {"correo": test_user.correo, "password": "Abc123!@#"}
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_me_endpoint(client, test_user):
    login_payload = {"correo": test_user.correo, "password": "Abc123!@#"}
    token_response = client.post("/auth/login", json=login_payload)
    token_data = token_response.json()
    token = token_data.get("access_token")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["correo"] == test_user.correo
    assert data["is_verified"] is True

def test_forgot_password(client, mock_email, test_user):
    payload = {"correo": test_user.correo}
    response = client.post("/auth/forgot", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Si el correo existe" in data["message"]
    mock_email[1].assert_called_once()

def test_reset_password(client, db, test_user):
    code = "123456"
    test_user.verification_code = code
    db.commit()

    payload = {
        "correo": test_user.correo,
        "codigo": code,
        "new_password": "Newpass1!"
    }

    response = client.post("/auth/reset", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Contraseña actualizada correctamente" in data["message"]

    db.refresh(test_user)

    assert test_user.verification_code is None
    assert verify_password("Newpass1!", test_user.password)
