import requests
from typing import Literal, Optional
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


def list_url_lists(pending: Optional[int] = None, fields: Optional[str] = None) -> dict | list:
    """
    GET /api/v2/policy/urllist
    pending: 0 applied / 1 pending / None => todos
    fields: 'id,name,data,modify_type,modify_time,modify_by,pending'
    Puede devolver:
      - dict con clave 'data' -> lista de objetos
      - lista plana de objetos
    """
    base = settings.NETSKOPE_TENANT_GAMMA.rstrip("/")
    url = f"{base}/api/v2/policy/urllist"
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
    """Devuelve el número total de URL Lists."""
    payload = list_url_lists()
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            return len(data)
        return 0
    if isinstance(payload, list):
        return len(payload)
    return 0


def find_url_list_by_name(name: str) -> dict | None:
    """
    Devuelve el objeto de lista cuyo 'name' coincida exactamente (case-insensitive).
    Soporta tanto respuesta dict {'data': [...]} como lista plana.
    """
    payload = list_url_lists()

    # Normaliza a una lista de ítems
    if isinstance(payload, dict):
        items = payload.get("data", [])
        if not isinstance(items, list):
            items = []  # seguridad ante formatos raros
    elif isinstance(payload, list):
        items = payload
    else:
        items = []

    target = name.strip().lower()
    for item in items:
        if isinstance(item, dict):
            if str(item.get("name", "")).strip().lower() == target:
                return item
    return None


def patch_url_list(
    list_id: int,
    payload: dict,
    action: Literal["append", "replace"] = "append",
) -> dict:
    """
    PATCH /api/v2/policy/urllist/{id}/{action}
    payload:
    {
      "data": { "type": "exact" | "regex" | "wildcard", "urls": [ "host..." ] },
      "name": "string" (opcional)
    }
    """
    base = settings.NETSKOPE_TENANT_GAMMA.rstrip("/")
    url = f"{base}/api/v2/policy/urllist/{list_id}/{action}"

    # Normaliza: quitar duplicados/minusculizar hosts si llega 'data.urls'
    if "data" in payload and isinstance(payload["data"], dict):
        urls = payload["data"].get("urls", [])
        if isinstance(urls, list):
            norm = []
            seen = set()
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