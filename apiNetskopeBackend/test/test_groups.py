import pytest
from unittest.mock import patch
import app.services.netskopeGroupsService as ngs

@pytest.fixture
def mock_settings(monkeypatch):
    """Mock de configuración para entorno GAMMA."""
    monkeypatch.setattr("app.config.settings.NETSKOPE_TENANT_GAMMA", "https://fake-tenant")
    monkeypatch.setattr("app.config.settings.NETSKOPE_TOKEN_GAMMA", "fake-token")

@pytest.fixture
def fake_group():
    """Datos falsos de un grupo SCIM."""
    return {
        "id": "group-123",
        "displayName": "TestGroup",
        "members": [{"value": "user-001", "display": "Test User"}],
    }

def test_scim_headers(mock_settings):
    """Debe generar correctamente los headers SCIM."""
    headers = ngs._scim_headers()
    assert "Authorization" in headers
    assert headers["Authorization"].startswith("Bearer ")
    assert headers["Content-Type"].startswith("application/scim+json")

def test_base_scim_url(mock_settings):
    """Debe generar correctamente la URL base SCIM."""
    url = ngs._base_scim_url()
    assert "fake-tenant" in url
    assert url.endswith("/scim")

def test_first_resource_id_valid(fake_group):
    """Debe devolver el ID del primer recurso válido."""
    data = {"Resources": [fake_group]}
    result = ngs._first_resource_id(data)
    assert result == "group-123"

def test_first_resource_id_empty():
    """Debe devolver None si no hay recursos."""
    data = {"Resources": []}
    result = ngs._first_resource_id(data)
    assert result is None

@patch("app.services.netskopeGroupsService.requests.get")
def test_scim_list_groups_page(mock_get, mock_settings, fake_group):
    """Debe listar grupos con paginación."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"Resources": [fake_group], "totalResults": 1}
    r = ngs.scim_list_groups_page()
    assert "Resources" in r
    assert r["totalResults"] == 1

@patch("app.services.netskopeGroupsService.requests.get")
def test_scim_list_groups_page_error(mock_get, mock_settings):
    """Debe lanzar excepción si hay error en la respuesta."""
    mock_get.return_value.status_code = 500
    mock_get.return_value.text = "Error interno simulado"
    with pytest.raises(Exception):
        ngs.scim_list_groups_page()

@patch("app.services.netskopeGroupsService.requests.get")
def test_scim_get_group_by_id(mock_get, mock_settings, fake_group):
    """Debe obtener grupo por ID."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = fake_group
    r = ngs.scim_get_group_by_id("group-123")
    assert r["displayName"] == "TestGroup"

@patch("app.services.netskopeGroupsService.requests.get")
def test_scim_get_group_by_name(mock_get, mock_settings, fake_group):
    """Debe obtener grupo por nombre y devolver el primer recurso."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"Resources": [fake_group]}
    r = ngs.scim_get_group_by_name("TestGroup")
    if isinstance(r, dict) and "Resources" in r:
        r = r["Resources"][0]
    assert r["id"] == "group-123"
    assert r["displayName"] == "TestGroup"

@patch("app.services.netskopeGroupsService.requests.get")
@patch("app.services.netskopeGroupsService.requests.post")
def test_scim_create_group(mock_post, mock_get, mock_settings, fake_group):
    """Debe crear un grupo correctamente."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"Resources": [{"id": "user-001"}]}
    mock_post.return_value.status_code = 201
    mock_post.return_value.json.return_value = fake_group

    r = ngs.scim_create_group("NewGroup", ["user-001"])
    assert r["displayName"] == "TestGroup"
    assert r["id"] == "group-123"

@patch("app.services.netskopeGroupsService.scim_get_group_by_name")
@patch("app.services.netskopeGroupsService.requests.delete")
def test_scim_delete_group_by_name(mock_delete, mock_get_group, mock_settings, fake_group):
    """Debe eliminar un grupo correctamente por nombre."""
    mock_get_group.return_value = fake_group
    mock_delete.return_value.status_code = 204
    r = ngs.scim_delete_group(name="TestGroup")
    assert isinstance(r, dict)
    assert r["status_code"] == 204
    assert r["id"] == fake_group["id"]

@patch("app.services.netskopeGroupsService.requests.patch")
def test_scim_patch_group(mock_patch, mock_settings):
    """Debe hacer PATCH correctamente a un grupo."""
    mock_patch.return_value.status_code = 200
    mock_patch.return_value.json.return_value = {"result": "patched"}

    r = ngs.scim_patch_group(group_id="group-001", new_display_name="RenamedGroup")
    assert r["result"] == "patched"
