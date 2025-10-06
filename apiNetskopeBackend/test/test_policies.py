import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.routers import netskopePoliciesRouter
from app.services import netskopePoliciesService as svc

client = TestClient(netskopePoliciesRouter.router)

@patch("app.routers.netskopePoliciesRouter.svc.list_policies")
def test_list_policies(mock_list):
    mock_list.return_value = {"data": [{"id": "123", "rule_name": "Allow VPN"}]}
    resp = client.get("/Gamma/policies/rules")
    assert resp.status_code == 200
    assert "data" in resp.json()
    mock_list.assert_called_once()

@patch("app.routers.netskopePoliciesRouter.svc.get_policy")
def test_get_policy(mock_get):
    mock_get.return_value = {"id": "123", "rule_name": "Allow VPN"}
    resp = client.get("/Gamma/policies/rules/123")
    assert resp.status_code == 200
    assert resp.json()["rule_name"] == "Allow VPN"
    mock_get.assert_called_once_with("123")

@patch("app.routers.netskopePoliciesRouter.svc.create_policy")
def test_create_policy(mock_create):
    mock_create.return_value = {"status": "success", "id": "456"}

    params = {
        "rule_name": "Block SSH",
        "group_name": "DevOps",
        "users": ["user1@domain.com"],
        "access_method": "Client",
        "action_name": "block",
        "enabled": "1",
        "private_apps": ["app1"],
        "private_app_tags": ["tag1"],
    }

    resp = client.post("/Gamma/policies/rules", params=params)
    assert resp.status_code == 200
    result = resp.json()
    assert result["status"] == "success"
    mock_create.assert_called_once()
    called_payload = mock_create.call_args[0][0]
    assert called_payload["rule_name"] == "Block SSH"
    assert "rule_data" in called_payload

@patch("app.routers.netskopePoliciesRouter.svc.update_policy")
def test_update_policy(mock_update):
    mock_update.return_value = {"status": "updated", "id": "789"}

    params = {"rule_name": "Allow HTTP", "enabled": "1"}
    resp = client.patch("/Gamma/policies/rules/789", params=params)

    assert resp.status_code == 200
    result = resp.json()
    assert result["status"] == "updated"
    mock_update.assert_called_once_with("789", {"rule_name": "Allow HTTP", "enabled": "1"})

@patch("app.routers.netskopePoliciesRouter.svc.delete_policy")
def test_delete_policy(mock_delete):
    mock_delete.return_value = {"status": 204, "id": "321"}
    resp = client.delete("/Gamma/policies/rules/321")
    assert resp.status_code == 200
    result = resp.json()
    assert result["id"] == "321"
    mock_delete.assert_called_once_with("321")

@patch("app.routers.netskopePoliciesRouter.svc.list_policy_groups")
def test_list_policy_groups(mock_list):
    mock_list.return_value = {"groups": [{"id": 1, "name": "Group A"}]}
    resp = client.get("/Policies/groups/?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "groups" in data
    mock_list.assert_called_once_with(None, None, 5, None, None, None)

@patch("app.routers.netskopePoliciesRouter.svc.get_policy_group")
def test_get_policy_group(mock_get):
    mock_get.return_value = {"id": 2, "name": "Engineering"}
    resp = client.get("/Policies/groups/2")
    assert resp.status_code == 200
    result = resp.json()
    assert result["name"] == "Engineering"
    mock_get.assert_called_once_with(2)
