import requests
from typing import Dict, Any, Optional
from app.config import settings


def _base_headers() -> dict:
    """
    Summary:
        Construye headers estándar para la API de Netskope (Bearer + JSON).

    Params:
        None

    Return:
        dict: Encabezados con Authorization y tipos JSON.

    Raises:
        RuntimeError: Si faltan NETSKOPE_TENANT_GAMMA o NETSKOPE_TOKEN_GAMMA.
    """
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
    """
    Summary:
        Retorna la URL base del tenant sin barra final.

    Params:
        None

    Return:
        str: URL base normalizada.
    """
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/")


def build_policy_payload(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summary:
        Construye un payload completo para crear/editar una policy a partir de
        parámetros simples. Útil si no envías el body ya armado.

    Params:
        params (Dict[str, Any]): Diccionario con claves como description, enabled,
            group_id, group_name, rule_name, rule_order_*, y rule_data (parcial).

    Return:
        Dict[str, Any]: JSON listo para enviar al endpoint de creación/edición.

    Notes:
        - Mezcla 'rule_data' del usuario sobre un 'rule_data_default' de ejemplo.
        - Si ya cuentas con el JSON final, no es necesario usar este helper.
    """
    description = params.get("description", "any")
    enabled = params.get("enabled", "1")
    group_id = params.get("group_id", "1")
    group_name = params.get("group_name", "My policy group")
    rule_name = params.get("rule_name", "default-rule")

    rule_order = {
        "order": params.get("rule_order_order", "top"),
        "position": params.get("rule_order_position", 1),
        "rule_id": params.get("rule_order_rule_id", 1),
        "rule_name": params.get("rule_order_rule_name", "api-policy-managed"),
    }

    rule_data_default = {
        "access_method": ["Client"],
        "b_negateNetLocation": True,
        "b_negateSrcCountries": True,
        "classification": "string",
        "periodic_reauth": {"reauth_interval": "60", "reauth_interval_unit": "hours"},
        "dlp_actions": [{"actions": ["allow"], "dlp_profile": "Payment Card"}],
        "tss_actions": [
            {
                "tss_profile": "string",
                "actions": [
                    {
                        "action_name": "block",
                        "remediation_profile": "string",
                        "severity": "low",
                        "template": "string",
                    }
                ],
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
                "activities": [{"activity": "any", "list_of_constraints": []}],
                "appName": "[172.31.12.135]",
            }
        ],
        "show_dlp_profile_action_table": True,
        "srcCountries": ["US", "AF", "CN"],
        "userGroups": ["usergroup/group1"],
        "userType": "user",
        "users": ["vphan@netskope.com"],
        "version": 1,
    }

    user_rule_data = params.get("rule_data")
    merged_rule_data = (
        {**rule_data_default, **user_rule_data} if isinstance(user_rule_data, dict) else rule_data_default
    )

    return {
        "description": description,
        "enabled": enabled,
        "group_id": group_id,
        "group_name": group_name,
        "rule_name": rule_name,
        "rule_order": rule_order,
        "rule_data": merged_rule_data,
    }


def list_policies() -> Dict[str, Any]:
    """
    Summary:
        Lista las reglas de Policies (NPA).

    Params:
        None

    Return:
        Dict[str, Any]: Respuesta JSON de listado.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al listar policies: {resp.text}")
    return resp.json()


def get_policy(policy_id: str) -> Dict[str, Any]:
    """
    Summary:
        Obtiene el detalle de una Policy por ID.

    Params:
        policy_id (str): Identificador de la policy.

    Return:
        Dict[str, Any]: JSON de la policy.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener policy {policy_id}: {resp.text}")
    return resp.json()


def create_policy(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summary:
        Crea una nueva Policy Rule.

    Params:
        payload (Dict[str, Any]): Cuerpo de creación.

    Return:
        Dict[str, Any]: JSON de la creación o {} si no hay cuerpo.

    Raises:
        Exception: Si la API no responde 200/201/202.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules"
    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=60)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al crear policy: {resp.text}")
    return resp.json() if resp.text else {}


def update_policy(policy_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summary:
        Actualiza parcialmente (PATCH) una Policy Rule.

    Params:
        policy_id (str): Identificador de la policy.
        payload (Dict[str, Any]): Cambios a aplicar.

    Return:
        Dict[str, Any]: JSON de actualización o {} si no hay cuerpo.

    Raises:
        Exception: Si la API no responde 200/202.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.patch(url, headers=_base_headers(), json=payload, timeout=60)
    if resp.status_code not in (200, 202):
        raise Exception(f"Error {resp.status_code} al actualizar policy {policy_id}: {resp.text}")
    return resp.json() if resp.text else {}


def delete_policy(policy_id: str) -> Dict[str, Any]:
    """
    Summary:
        Elimina una Policy Rule por ID.

    Params:
        policy_id (str): Identificador de la policy.

    Return:
        Dict[str, Any]: JSON devuelto o {'status', 'id'} si no hay cuerpo.

    Raises:
        Exception: Si la API no responde 200/202/204.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/rules/{policy_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar policy {policy_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": policy_id}


def list_policy_groups(
    fields: Optional[str] = None,
    filter: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    sortby: Optional[str] = None,
    sortorder: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Summary:
        Lista grupos de políticas NPA con filtros y orden opcional.

    Params:
        fields (Optional[str]): Campos a devolver.
        filter (Optional[str]): Filtro de búsqueda.
        limit (Optional[int]): Límite.
        offset (Optional[int]): Desplazamiento.
        sortby (Optional[str]): Campo de ordenación.
        sortorder (Optional[str]): Orden ('asc'|'desc').

    Return:
        Dict[str, Any]: Respuesta JSON de la API.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/policygroups"
    params: Dict[str, Any] = {}
    if fields: params["fields"] = fields
    if filter: params["filter"] = filter
    if limit: params["limit"] = limit
    if offset: params["offset"] = offset
    if sortby: params["sortby"] = sortby
    if sortorder: params["sortorder"] = sortorder
    resp = requests.get(url, headers=_base_headers(), params=params, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al listar grupos: {resp.text}")
    return resp.json()


def get_policy_group(group_id: int) -> Dict[str, Any]:
    """
    Summary:
        Obtiene un grupo de políticas por ID.

    Params:
        group_id (int): Identificador del grupo.

    Return:
        Dict[str, Any]: JSON del grupo de políticas.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/npa/policygroups/{group_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener grupo {group_id}: {resp.text}")
    return resp.json()