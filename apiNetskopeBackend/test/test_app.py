from fastapi.testclient import TestClient
from app.main import app   # importa tu FastAPI app

client = TestClient(app)

def test_root_status_code():
    response = client.get("/")
    assert response.status_code == 200

def test_root_content():
    response = client.get("/")
    assert "Hello" in response.text or "FastAPI" in response.text