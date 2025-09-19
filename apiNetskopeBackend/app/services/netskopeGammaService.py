import requests
from typing import Literal, Optional, List, Dict, Any
from urllib.parse import urlparse
from app.config import settings


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


# -------------------- Listados --------------------

def list_url_lists(pending: Optional[int] = None, fields: Optional[str] = None) -> dict | list:
    """
    GET /api/v2/policy/urllist
    pending: 0 applied / 1 pending / None => todos
    fields: 'id,name,data,modify_type,modify_time,modify_by,pending'
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist"
    params = {}
    if pending in (0, 1):
        params["pending"] = pending
    if fields:
        params["field"] = fields
    resp = requests.get(url, headers=_base_headers(), params=params, timeout=20)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al consultar URL Lists: {resp.text}")
    return resp.json()

def count_url_lists() -> int:
    payload = list_url_lists()
    if isinstance(payload, dict):
        data = payload.get("data")
        return len(data) if isinstance(data, list) else 0
    if isinstance(payload, list):
        return len(payload)
    return 0

def find_url_list_by_name(name: str) -> dict | None:
    """
    Devuelve el objeto con 'name' exacto (case-insensitive).
    Soporta payload {'data': [...]} o lista plana.
    """
    payload = list_url_lists()
    if isinstance(payload, dict):
        items = payload.get("data", []) or []
    elif isinstance(payload, list):
        items = payload
    else:
        items = []
    target = name.strip().lower()
    for item in items:
        if isinstance(item, dict) and str(item.get("name", "")).strip().lower() == target:
            return item
    return None


# -------------------- PATCH (append/replace) --------------------

def patch_url_list(
    list_id: int,
    payload: dict,
    action: Literal["append", "replace"] = "append",
) -> dict:
    """
    PATCH /api/v2/policy/urllist/{id}/{action}
    payload:
      {"data": {"type": "exact|regex|wildcard", "urls": [...]}, "name": "string?"}
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}/{action}"
    if "data" in payload and isinstance(payload["data"], dict):
        urls = payload["data"].get("urls", [])
        if isinstance(urls, list):
            norm, seen = [], set()
            for u in urls:
                if not isinstance(u, str):
                    continue
                v = u.strip()
                if not v:
                    continue
                v2 = v.lower()
                if v2 not in seen:
                    seen.add(v2)
                    norm.append(v)
            payload["data"]["urls"] = norm
    resp = requests.patch(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al hacer PATCH de URL List: {resp.text}")
    return resp.json()


# -------------------- Deploy --------------------

def deploy_url_lists() -> dict | list:
    """
    POST /api/v2/policy/urllist/deploy  — aplica TODOS los cambios pendientes.
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/deploy"
    resp = requests.post(url, headers=_base_headers(), timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al hacer deploy de URL Lists: {resp.text}")
    return resp.json() if resp.text else {}


# -------------------- Delete (nuevo) --------------------

def delete_url_list_by_id(list_id: int) -> dict | None:
    """
    DELETE /api/v2/policy/urllist/{id}
    Marca la URL List para eliminación (queda 'pending' hasta deploy).
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    # API suele devolver 200 con el objeto o 202/204 según tenant
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar URL List {list_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": list_id}

def delete_url_list_by_name(name: str) -> dict | None:
    """
    Helper: resuelve ID por nombre y llama a delete_url_list_by_id.
    """
    item = find_url_list_by_name(name)
    if not item or "id" not in item:
        raise LookupError(f"No se encontró la URL List con nombre '{name}'")
    return delete_url_list_by_id(int(item["id"]))