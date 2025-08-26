from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_status_code():
    resp = client.get("/")
    assert resp.status_code == 200

def test_root_content():
    resp = client.get("/")
    data = resp.json()
    # Tu endpoint devuelve {"message": "HOLA JPZ"}
    assert data.get("message") == "CAMBIO Numero milll"