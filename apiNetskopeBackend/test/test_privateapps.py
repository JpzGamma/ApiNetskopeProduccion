import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import get_current_user

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 1,
        "username": "testuser",
        "correo": "testuser@gammaingenieros.com",
        "is_verified": True,
        "roles": ["admin"],
    }
    yield
    if get_current_user in app.dependency_overrides:
        app.dependency_overrides.pop(get_current_user)

client = TestClient(app)

@patch("app.routers.netskopePrivateAppsRouter.list_publishers")
def test_list_publishers(mock_list):
    mock_list.return_value = [
        {"publisher_id": 1, "publisher_name": "PublisherA"},
        {"publisher_id": 2, "publisher_name": "PublisherB"}
    ]
    r = client.get("/Gamma/publishers")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["publisher_name"] == "PublisherA"

@patch("app.routers.netskopePrivateAppsRouter.list_private_apps")
def test_list_private_apps(mock_list):
    mock_list.return_value = [
        {"app_id": 1, "app_name": "App1"},
        {"app_id": 2, "app_name": "App2"}
    ]
    r = client.get("/Gamma/private-apps")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[1]["app_name"] == "App2"

@patch("app.routers.netskopePrivateAppsRouter.count_private_apps")
def test_count_private_apps(mock_count):
    mock_count.return_value = 2
    r = client.get("/Gamma/private-apps/count")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 2

@patch("app.routers.netskopePrivateAppsRouter.get_private_app")
def test_get_private_app(mock_get):
    mock_get.return_value = {"app_id": 10, "app_name": "App10", "host": "10.0.0.10"}
    r = client.get("/Gamma/private-apps/10")
    assert r.status_code == 200
    data = r.json()
    assert data["app_id"] == 10

@patch("app.routers.netskopePrivateAppsRouter.create_private_app")
def test_create_private_app_params(mock_create):
    mock_create.return_value = {"app_id": 123, "app_name": "TestApp", "host": "10.0.0.1"}
    r = client.post(
        "/Gamma/private-apps",
        params={
            "app_name": "TestApp",
            "host": "10.0.0.1",
            "protocol": "TCP",
            "port": 8080,
            "publisher_ids": "1",
            "publisher_names": "PublisherA",
            "app_tag": "tag1"
        }
    )
    assert r.status_code == 200
    data = r.json()
    assert data["app_name"] == "TestApp"

@patch("app.routers.netskopePrivateAppsRouter.delete_private_app")
def test_delete_private_app(mock_delete):
    mock_delete.return_value = {"id": 10, "status": 202}
    r = client.delete("/Gamma/private-apps/10")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == 10

@pytest.mark.asyncio
@patch("app.routers.netskopePrivateAppsRouter.bulk_create_private_apps")
async def test_bulk_create_private_apps_csv(mock_bulk):
    csv_content = b"app_name,host,protocol,port,publisher_id\nTestApp,10.0.0.1,TCP,8080,1"
    mock_bulk.return_value = {
        "summary": {"total_rows": 1, "unique_apps": 1, "created": 1, "failed": 0},
        "row_errors": [],
        "results": [{"app_name": "TestApp", "status": "ok", "result": {"app_id": 101, "app_name": "TestApp"}}]
    }
    r = client.post("/Gamma/private-apps/_bulk", files={"file": ("test.csv", csv_content)})
    assert r.status_code == 200
    data = r.json()
    assert data["summary"]["created"] == 1
