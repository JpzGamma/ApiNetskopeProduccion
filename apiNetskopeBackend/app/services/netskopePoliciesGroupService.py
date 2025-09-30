# services/netskopePoliciesGroupService.py

import requests
from typing import Optional, Dict, Any
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


# -------------------- Listar grupos --------------------

def list_policy_groups(
    fields: Optional[str] = None,
    filter: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    sortby: Optional[str] = None,
    sortorder: Optional[str] = None
) -> Dict[str, Any]:
    url = f"{_tenant_base()}/api/v2/policy/npa/policygroups"
    params = {}

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


# -------------------- Obtener grupo por ID --------------------

def get_policy_group(group_id: int) -> Dict[str, Any]:
    url = f"{_tenant_base()}/api/v2/policy/npa/policygroups/{group_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener grupo {group_id}: {resp.text}")
    return resp.json()
