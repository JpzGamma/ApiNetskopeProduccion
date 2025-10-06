import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.routers.netskopeCCIRouter import enrich_app_names, enrich_excel_file
from app.routers.auth import get_current_user

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 1,
        "username": "testuser",
        "correo": "testuser@gammaingenieros.com",
        "is_verified": True,
    }
    yield
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture(autouse=True)
def mock_cci_calls():
    def _mock(names, **kwargs):
        return {str(n).strip().lower(): f"Cat{idx+1}" for idx, n in enumerate(names)}
    
    with patch("app.routers.netskopeCCIRouter.enrich_app_names", side_effect=_mock):
        yield

def test_cci_enrich_names_success(client):
    payload = {"names": ["App1", "App2"]}
    r = client.post("/Gamma/cci/enrich/names", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 2
    assert data["categories"]["app1"] == "Cat1"
    assert data["categories"]["app2"] == "Cat2"

def test_cci_enrich_names_empty(client):
    payload = {"names": []}
    r = client.post("/Gamma/cci/enrich/names", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 0
    assert data["categories"] == {}

def test_cci_enrich_names_custom_params(client):
    payload = {"names": ["App1", "App2", "App3"]}
    r = client.post("/Gamma/cci/enrich/names?batch_size=2&pause=0.1&timeout=10", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 3
    assert data["categories"]["app3"] == "Cat3"

@pytest.fixture
def sample_excel_bytes():
    import pandas as pd
    df = pd.DataFrame({
        "current_name": ["App1", "App2", "App3"]
    })
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    buf.seek(0)
    return buf.read()

def test_cci_enrich_excel_success(client, sample_excel_bytes):
    files = {"file": ("test.xlsx", sample_excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post("/Gamma/cci/enrich/excel", files=files)
    assert r.status_code == 200
    assert "attachment; filename=" in r.headers["content-disposition"]
    content = r.content
    assert len(content) > 0

def test_cci_enrich_excel_invalid_file(client):
    files = {"file": ("test.txt", b"no es excel", "text/plain")}
    r = client.post("/Gamma/cci/enrich/excel", files=files)
    assert r.status_code == 400
    assert "Debe subir un archivo .xlsx" in r.json()["detail"]

def test_cci_enrich_excel_empty_column(client):
    import pandas as pd
    buf = io.BytesIO()
    df = pd.DataFrame({"wrong_column": ["App1", "App2"]})
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    buf.seek(0)
    files = {"file": ("test.xlsx", buf.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post("/Gamma/cci/enrich/excel", files=files)
    assert r.status_code == 500
    assert "El Excel debe tener la columna" in r.json()["detail"]
