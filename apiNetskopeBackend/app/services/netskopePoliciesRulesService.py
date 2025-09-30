import requests
from typing import Dict, Any, Optional
from app.config import settings

# -------------------- Base / Auth --------------------

def _base_headers() -> dict:
    if not settings.NETSKOPE_TENANT_GAMMA:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    if not settings.NETSKOPE_TOKEN_GAMMA:
        raise RuntimeError("NETSKOPE_TOKEN_GAMMA no definido en .env")
    return {
        "Authorization": f"Bearer {settings.NETSKOPE_TOKEN_GAMMA}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

def _tenant_base() -> str:
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/")


# -------------------- Payload builder --------------------

def build_policy_payload(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Construye el JSON completo para crear/editar una policy a partir de
    los parámetros simples recibidos desde el router. `params` puede
    contener solo los campos que el usuario pasó; los restantes se llenan
    con valores por defecto/controlados por backend.
    """
    # Valores simples (se usan los pasados o defaults)
    description = params.get("description", "any")
    enabled = params.get("enabled", "1")
    group_id = params.get("group_id", "1")
    group_name = params.get("group_name", "My policy group")
    rule_name = params.get("rule_name", "default-rule")

    # Rule order (puede venir parcialmente)
    rule_order = {
        "order": params.get("rule_order_order", "top"),
        "position": params.get("rule_order_position", 1),
        "rule_id": params.get("rule_order_rule_id", 1),
        "rule_name": params.get("rule_order_rule_name", "api-policy-managed"),
    }

    # Rule data por defecto (lo que dijiste que quede inmerso en backend)
    rule_data_default = {
        "access_method": ["Client"],
        "b_negateNetLocation": True,
        "b_negateSrcCountries": True,
        "classification": "string",
        "periodic_reauth": {
            "reauth_interval": "60",
            "reauth_interval_unit": "hours"
        },
        "dlp_actions": [
            {
                "actions": ["allow"],
                "dlp_profile": "Payment Card"
            }
        ],
        "tss_actions": [
            {
                "tss_profile": "string",
                "actions": [
                    {
                        "action_name": "block",
                        "remediation_profile": "string",
                        "severity": "low",
                        "template": "string"
                    }
                ]
            }
        ],
        "tss_profile": ["string"],
        "external_dlp": True,
        "json_version": 3,
        "device_classification_id": [0],
        "match_criteria_action": {"action_name": "allow"},
        "net_location_obj": ["190.123.150.10", "190.218.0.0/16"],
        "organization_units": ["engineering/qa"],
        "policy_type": "private-app",
        "privateAppTagIds": ["1", "2"],
        "privateAppTags": ["tag1", "tag2"],
        "privateApps": ["app1", "app2"],
        "privateAppsWithActivities": [
            {
                "activities": [
                    {"activity": "any", "list_of_constraints": []}
                ],
                "appName": "[172.31.12.135]"
            }
        ],
        "show_dlp_profile_action_table": True,
        "srcCountries": ["US", "AF", "CN"],
        "userGroups": ["usergroup/group1"],
        "userType": "user",
        "users": ["vphan@netskope.com"],
        "version": 1
    }

    # Si el usuario envía rule_data parcial (como dict), lo fusionamos superficialmente
    user_rule_data = params.get("rule_data")
    if isinstance(user_rule_data, dict):
        # merge: user keys override defaults (shallow merge suficiente para la mayoría de usos)
        merged_rule_data = {**rule_data_default, **user_rule_data}
    else:
        merged_rule_data = rule_data_default

    payload: Dict[str, Any] = {
        "description": description,
        "enabled": enabled,
        "group_id": group_id,
        "group_name": group_name,
        "rule_name": rule_name,
        "rule_order": rule_order,
        "rule_data": merged_rule_data,
    }

    return payload


# -------------------- Policies Rules --------------------

def list_policies() -> Dict[str, Any]:
    """
    GET /api/v2/policy/npa/rules
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al listar policies: {resp.text}")
    return resp.json()

def get_policy(policy_id: str) -> Dict[str, Any]:
    """
    GET /api/v2/policy/npa/rules/{id}
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener policy {policy_id}: {resp.text}")
    return resp.json()

def create_policy(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /api/v2/policy/npa/rules
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules"
    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=60)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al crear policy: {resp.text}")
    return resp.json() if resp.text else {}

def update_policy(policy_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    PATCH /api/v2/policy/npa/rules/{id}
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.patch(url, headers=_base_headers(), json=payload, timeout=60)
    if resp.status_code not in (200, 202):
        raise Exception(f"Error {resp.status_code} al actualizar policy {policy_id}: {resp.text}")
    return resp.json() if resp.text else {}

def delete_policy(policy_id: str) -> Dict[str, Any]:
    """
    DELETE /api/v2/policy/npa/rules/{id}
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar policy {policy_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": policy_id}
