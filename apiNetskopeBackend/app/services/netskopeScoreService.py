import requests
from typing import Dict, Any, Optional, List
from app.config import settings


def _base_headers() -> dict:
    """
    Construye encabezados estándar para la API de Netskope (Bearer + JSON).
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


def _scim_headers() -> dict:
    """
    Encabezados para SCIM.
    Nota: El mismo Bearer puede funcionar si tu token tiene permisos SCIM.
    """
    if not settings.NETSKOPE_TENANT_GAMMA:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    if not settings.NETSKOPE_TOKEN_GAMMA:
        raise RuntimeError("NETSKOPE_TOKEN_GAMMA no definido en .env")

    return {
        "Authorization": f"Bearer {settings.NETSKOPE_TOKEN_GAMMA}",
        # SCIM suele usar application/scim+json
        "Accept": "application/scim+json;charset=utf-8",
        "Content-Type": "application/scim+json;charset=utf-8",
    }


def _tenant_base() -> str:
    """Retorna la URL base del tenant sin barra final."""
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/")


def get_user_uci(user_email: str) -> Dict[str, Any]:
    """
    Obtiene el UCI (User Confidence Index) de un usuario específico.
    """
    url = f"{_tenant_base()}/api/v2/ubadatasvc/user/uci"
    payload = {"fromTime": 0, "user": user_email}

    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener UCI: {resp.text}")
    return resp.json()


def get_active_users_uci(
    ratingRank: Optional[str] = "all",
    watchlist: Optional[str] = "",
    offset: int = 0,
    limit: int = 1000,
    sortby: str = "confidenceScore",
    sortorder: str = "asc",
) -> Dict[str, Any]:
    """
    Lista los usuarios activos recientes con su UCI.
    """
    url = f"{_tenant_base()}/api/v2/incidents/users/getactiveuci"
    params = {
        "offset": offset,
        "limit": limit,
        "sortby": sortby,
        "sortorder": sortorder,
    }
    payload = {
        "ratingRank": ratingRank,
        "watchlist": watchlist,
    }

    resp = requests.post(url, headers=_base_headers(), params=params, json=payload, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al obtener usuarios activos: {resp.text}")
    return resp.json()


def reset_user_uci(user_email: str) -> Dict[str, Any]:
    """
    Reinicia el UCI (User Confidence Index) de un usuario.
    """
    url = f"{_tenant_base()}/api/v2/incidents/users/uci/reset"
    payload = {"users": [user_email]}

    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 202):
        raise Exception(f"Error {resp.status_code} al reiniciar UCI: {resp.text}")
    return resp.json() if resp.text else {"status": "reset ok", "user": user_email}


def _scim_get_users_page(
    startIndex: int = 1,
    count: int = 1000,
    filter_expr: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Obtiene una página de usuarios por SCIM.
    Endpoint: GET /api/v2/scim/Users?filter=...&startIndex=...&count=...
    """
    url = f"{_tenant_base()}/api/v2/scim/Users"
    params: Dict[str, Any] = {
        "startIndex": startIndex,
        "count": count,
    }
    if filter_expr:
        params["filter"] = filter_expr

    resp = requests.get(url, headers=_scim_headers(), params=params, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al consultar SCIM Users: {resp.text}")
    return resp.json()


def search_users_scim(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Búsqueda de usuarios por SCIM.
    - query con '@' => intenta búsqueda exacta por filter: userName eq "..."
    - query parcial => pagina SCIM y filtra por 'contains' en Python

    Devuelve lista de objetos: { "userName": "...", "id": "...", "displayName": "..." }
    (displayName puede no venir, depende del tenant)
    """
    q = (query or "").strip()
    if not q:
        return []

    # límites de seguridad
    if limit < 1:
        limit = 1
    if limit > 50:
        limit = 50

    # evita enumeración masiva
    if len(q) < 3 and "@" not in q:
        return []

    results: List[Dict[str, Any]] = []

    # Caso "casi exacto"
    if "@" in q:
        # SCIM filter típicamente soporta eq para userName. :contentReference[oaicite:2]{index=2}
        filter_expr = f'userName eq "{q}"'
        data = _scim_get_users_page(startIndex=1, count=50, filter_expr=filter_expr)
        resources = data.get("Resources") or []
        for r in resources:
            results.append({
                "id": r.get("id"),
                "userName": r.get("userName"),
                "displayName": r.get("displayName"),
                "active": r.get("active"),
            })
        return results[:limit]

    # Caso parcial: pagina y filtra localmente
    # OJO: Esto depende de cuántos usuarios tengas. Por eso limitamos max_pages.
    start_index = 1
    page_size = 1000
    max_pages = 5  # tope para no hacer llamadas infinitas

    q_lower = q.lower()

    for _ in range(max_pages):
        data = _scim_get_users_page(startIndex=start_index, count=page_size, filter_expr=None)
        resources = data.get("Resources") or []

        if not resources:
            break

        for r in resources:
            user_name = (r.get("userName") or "")
            if q_lower in user_name.lower():
                results.append({
                    "id": r.get("id"),
                    "userName": user_name,
                    "displayName": r.get("displayName"),
                    "active": r.get("active"),
                })
                if len(results) >= limit:
                    return results[:limit]

        # SCIM es 1-based; avanzamos por tamaño de página
        start_index += page_size

        # Si el totalResults existe, podemos cortar antes
        total = data.get("totalResults")
        if isinstance(total, int) and start_index > total:
            break

    return results[:limit]
