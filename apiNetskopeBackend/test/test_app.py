from fastapi.testclient import TestClient
from app.main import app  # <-- import correcto

client = TestClient(app)

def test_root_status_code():
    resp = client.get("/")
    assert resp.status_code == 200

def test_root_content():
    resp = client.get("/")
    assert isinstance(resp.text, str)