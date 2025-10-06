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
    app.dependency_overrides.pop(get_current_user, None)

client = TestClient(app)

@patch("app.routers.netskopeUsersRouter.scim_list_users")
def test_list_users_success(mock_list):
    mock_list.return_value = {
        "Resources": [{"id": "u123", "userName": "lucia"}],
        "totalResults": 1,
    }
    r = client.get("/Gamma/users?user_name=lucia")
    assert r.status_code == 200
    data = r.json()
    assert data["totalResults"] == 1
    assert data["Resources"][0]["userName"] == "lucia"

@patch("app.routers.netskopeUsersRouter.scim_list_users", side_effect=Exception("List error"))
def test_list_users_error(mock_list):
    r = client.get("/Gamma/users")
    assert r.status_code == 500

@patch("app.routers.netskopeUsersRouter.scim_create_user")
def test_create_user_success(mock_create):
    mock_create.return_value = {"id": "u999", "userName": "newuser"}
    r = client.post(
        "/Gamma/users",
        params={"email": "newuser@gamma.com", "user_name": "newuser"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["userName"] == "newuser"

@patch("app.routers.netskopeUsersRouter.scim_create_user", side_effect=Exception("Create failed"))
def test_create_user_error(mock_create):
    r = client.post(
        "/Gamma/users",
        params={"email": "bad@gamma.com", "user_name": "baduser"},
    )
    assert r.status_code == 500

@patch("app.routers.netskopeUsersRouter.scim_update_user_put")
def test_update_user_success(mock_update):
    mock_update.return_value = {"id": "u123", "active": True}
    r = client.put("/Gamma/users", params={"user_id": "u123"})
    assert r.status_code == 200
    data = r.json()
    assert data["active"] is True

@patch("app.routers.netskopeUsersRouter.scim_update_user_put", side_effect=Exception("Update failed"))
def test_update_user_error(mock_update):
    r = client.put("/Gamma/users", params={"user_id": "bad"})
    assert r.status_code == 500

@patch("app.routers.netskopeUsersRouter.scim_delete_user")
def test_delete_user_success(mock_delete):
    mock_delete.return_value = {"status_code": 204, "id": "u456"}
    r = client.delete("/Gamma/users", params={"user_id": "u456"})
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "u456"

@patch("app.routers.netskopeUsersRouter.scim_delete_user", side_effect=Exception("Delete failed"))
def test_delete_user_error(mock_delete):
    r = client.delete("/Gamma/users", params={"user_id": "bad"})
    assert r.status_code == 500
