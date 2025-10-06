import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.routers.auth import get_current_user

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 1,
        "username": "testuser",
        "correo": "testuser@gammaingenieros.com",
        "is_verified": True,
    }
    yield
    if get_current_user in app.dependency_overrides:
        app.dependency_overrides.pop(get_current_user)

client = TestClient(app)

@patch("app.routers.netskopeGammaRouter.list_url_lists")
def test_list_url_lists(mock_list):
    mock_list.return_value = [{"id": 1, "name": "ListaPrueba", "type": "exact"}]
    r = client.get("/Gamma/url-lists")
    assert r.status_code == 200
    assert r.json() == [{"id": 1, "name": "ListaPrueba", "type": "exact"}]


@patch("app.routers.netskopeGammaRouter.find_url_list_by_name")
def test_get_url_list_by_name_found(mock_find):
    mock_find.return_value = {"id": 1, "name": "ListaPrueba", "type": "exact"}
    r = client.get("/Gamma/url-lists", params={"name": "ListaPrueba"})
    assert r.status_code == 200
    assert r.json() == {"id": 1, "name": "ListaPrueba", "type": "exact"}

@patch("app.routers.netskopeGammaRouter.find_url_list_by_name")
def test_get_url_list_by_name_not_found(mock_find):
    mock_find.return_value = None
    r = client.get("/Gamma/url-lists", params={"name": "NoExiste"})
    assert r.status_code == 404

@patch("app.routers.netskopeGammaRouter.count_url_lists")
def test_count_url_lists(mock_count):
    mock_count.return_value = 5
    r = client.get("/Gamma/url-lists/count")
    assert r.status_code == 200
    assert r.json() == {"count": 5}

@patch("app.routers.netskopeGammaRouter.create_url_list")
@patch("app.routers.netskopeGammaRouter.deploy_url_lists")
def test_create_url_list(mock_deploy, mock_create):
    mock_create.return_value = {
        "created": {"id": 123, "name": "NuevaLista", "data": {"type": "exact", "urls": ["example.com"]}},
        "accepted": {"exact": ["example.com"]},
        "rejected": [],
        "type_used": "exact",
        "sent": 1,
    }
    mock_deploy.return_value = {"status": "ok"}

    payload = {"name": "NuevaLista", "urls": ["example.com"], "allow_regex": False}
    r = client.post("/Gamma/url-lists", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "create" in data
    assert data["create"]["created"]["name"] == "NuevaLista"

@patch("app.routers.netskopeGammaRouter.put_url_list_by_id")
@patch("app.routers.netskopeGammaRouter.deploy_url_lists")
def test_put_url_list(mock_deploy, mock_put):
    mock_put.return_value = {
        "put": {"id": 99},
        "accepted": {"exact": ["test.com"]},
        "rejected": [],
        "type_used": "exact",
        "sent": 1,
    }
    mock_deploy.return_value = {"status": "ok"}

    payload = {"name": "Modificada", "urls": ["test.com"], "allow_regex": False}
    r = client.put("/Gamma/url-lists/99", json=payload)
    assert r.status_code == 200
    out = r.json()
    assert "put" in out

@patch("app.routers.netskopeGammaRouter.delete_url_list_by_name")
@patch("app.routers.netskopeGammaRouter.deploy_url_lists")
def test_delete_url_list_by_name(mock_deploy, mock_delete):
    mock_delete.return_value = {"id": 5, "status": 200}
    mock_deploy.return_value = {"status": "ok"}

    r = client.delete("/Gamma/url-lists/by-name", params={"name": "ListaPrueba"})
    assert r.status_code == 200
    assert r.json()["deleted"] == {"id": 5, "status": 200}

@patch("app.routers.netskopeGammaRouter.delete_url_list_by_id")
@patch("app.routers.netskopeGammaRouter.deploy_url_lists")
def test_delete_url_list_by_id(mock_deploy, mock_delete):
    mock_delete.return_value = {"id": 10, "status": 200}
    mock_deploy.return_value = {"status": "ok"}

    r = client.delete("/Gamma/url-lists/10")
    assert r.status_code == 200
    assert r.json()["deleted"] == {"id": 10, "status": 200}

@patch("app.routers.netskopeGammaRouter.deploy_url_lists")
def test_deploy_url_lists(mock_deploy):
    mock_deploy.return_value = {"status": "ok"}
    r = client.post("/Gamma/url-lists/deploy")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

