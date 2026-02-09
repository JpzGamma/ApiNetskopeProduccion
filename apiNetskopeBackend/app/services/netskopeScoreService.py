import requests
from typing import Dict, Any, Optional
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