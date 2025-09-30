from __future__ import annotations

from typing import Dict, Any, List, Optional
import requests

from app.config import settings


def _headers_scim() -> Dict[str, str]:
    """
    Summary:
        Construye los headers para consumir el endpoint SCIM de Netskope.
    Params:
        None
    Return:
        Dict[str, str]: Encabezados con Authorization Bearer y media-type SCIM.
    Raises:
        RuntimeError: Si faltan NETSKOPE_TENANT_GAMMA o NETSKOPE_TOKEN_GAMMA.
    """
    if not settings.NETSKOPE_TENANT_GAMMA:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    if not settings.NETSKOPE_TOKEN_GAMMA:
        raise RuntimeError("NETSKOPE_TOKEN_GAMMA no definido en .env")

    return {
        "Authorization": f"Bearer {settings.NETSKOPE_TOKEN_GAMMA}",
        "Accept": "application/scim+json;charset=utf-8",
        "Content-Type": "application/scim+json;charset=utf-8",
    }


def _scim_base() -> str:
    """
    Summary:
        Devuelve la URL base del API SCIM para el tenant actual.
    Params:
        None
    Return:
        str: URL base de SCIM sin barra final, con sufijo '/api/v2/scim'.
    """
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/") + "/api/v2/scim"


def _do_search(filter_expr: str, start_index: int, count: int, *, timeout: int = 25) -> Dict[str, Any]:
    """
    Summary:
        Ejecuta una búsqueda SCIM con filtro y paginación simple.
    Params:
        filter_expr (str): Expresión SCIM de filtro (por ejemplo 'userName eq "alice"').
        start_index (int): Índice inicial (1-based) para paginado.
        count (int): Tamaño de página.
        timeout (int): Timeout en segundos.
    Return:
        Dict[str, Any]: {'status': <int>, 'data': <json dict>}.
    Raises:
        Exception: Para códigos HTTP distintos de 200 o 400.
    """
    url = f"{_scim_base()}/Users"
    params = {
        "filter": filter_expr,
        "startIndex": start_index,
        "count": count,
    }
    resp = requests.get(url, headers=_headers_scim(), params=params, timeout=timeout)
    if resp.status_code not in (200, 400):
        raise Exception(f"Error {resp.status_code} consultando Users: {resp.text}")
    return {"status": resp.status_code, "data": resp.json() if resp.text else {}}


def _merge_scim_list_payload(resources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summary:
        Ensambla un payload SCIM tipo ListResponse a partir de recursos sueltos.
    Params:
        resources (List[Dict[str, Any]]): Lista de objetos de usuario SCIM.
    Return:
        Dict[str, Any]: Estructura SCIM con schemas, Resources y metadatos de paginado.
    """
    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "Resources": resources,
        "totalResults": len(resources),
        "itemsPerPage": len(resources),
        "startIndex": 1,
    }


def scim_list_users(
    query: Optional[str] = None,
    *,
    start_index: int = 1,
    count: int = 100,
    fetch_all: bool = False,
    timeout: int = 25,
) -> Dict[str, Any]:
    """
    Summary:
        Lista/filtra usuarios SCIM. Intenta búsquedas específicas y hace fallback a paginación completa si se solicita.
    Params:
        query (Optional[str]): userName o correo. Si contiene '@' se prioriza búsqueda por email; si no, por userName/externalId.
        start_index (int): Índice inicial de paginado para llamada directa sin filtro.
        count (int): Tamaño de página.
        fetch_all (bool): Si True y no hubo match por filtro, pagina todo y filtra localmente.
        timeout (int): Timeout por request.
    Return:
        Dict[str, Any]: Payload SCIM (ListResponse) con 'Resources'.
    Raises:
        Exception: Si la API devuelve códigos inesperados durante la paginación.
    """
    def _extract_resources(payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, dict):
            return payload.get("Resources", []) or payload.get("resources", []) or []
        return []

    if not query:
        url = f"{_scim_base()}/Users"
        params = {"startIndex": start_index, "count": count}
        resp = requests.get(url, headers=_headers_scim(), params=params, timeout=timeout)
        if resp.status_code != 200:
            raise Exception(f"Error {resp.status_code} listando Users: {resp.text}")
        return resp.json()

    filters: List[str] = []
    if "@" in query:
        filters = [
            f'emails.value eq "{query}"',
            f'userName eq "{query}"',
            f'externalId eq "{query}"',
        ]
    else:
        filters = [
            f'userName eq "{query}"',
            f'externalId eq "{query}"',
        ]

    for fexpr in filters:
        r = _do_search(fexpr, start_index, count, timeout=timeout)
        if r["status"] == 200:
            resources = _extract_resources(r["data"])
            if resources:
                return r["data"]

    if fetch_all:
        all_resources: List[Dict[str, Any]] = []
        idx = 1
        while True:
            url = f"{_scim_base()}/Users"
            params = {"startIndex": idx, "count": count}
            resp = requests.get(url, headers=_headers_scim(), params=params, timeout=timeout)
            if resp.status_code != 200:
                raise Exception(f"Error {resp.status_code} paginando Users: {resp.text}")
            payload = resp.json()
            batch = _extract_resources(payload)
            if not batch:
                break
            all_resources.extend(batch)
            items = payload.get("itemsPerPage") or len(batch)
            total = payload.get("totalResults") or 0
            idx += items
            if total and idx > total:
                break

        q_low = query.strip().lower()

        def _match(u: Dict[str, Any]) -> bool:
            uname = str(u.get("userName", "")).lower()
            if "@" in query:
                emails = u.get("emails") or []
                for e in emails:
                    if isinstance(e, dict) and str(e.get("value", "")).lower() == q_low:
                        return True
                return uname == q_low
            else:
                return uname == q_low or str(u.get("externalId", "")).lower() == q_low

        filtered = [u for u in all_resources if _match(u)]
        return _merge_scim_list_payload(filtered)

    return _merge_scim_list_payload([])


def scim_create_user(
    email: str,
    user_name: str,
    *,
    given_name: Optional[str] = None,
    family_name: Optional[str] = None,
    external_id: Optional[str] = None,
    active: bool = True,
    timeout: int = 30,
) -> Dict[str, Any]:
    """
    Summary:
        Crea un usuario SCIM con los campos mínimos y opcionales estándar.
    Params:
        email (str): Correo del usuario (emails[0].value, primary=True).
        user_name (str): userName (UPN o correo).
        given_name (Optional[str]): Nombre.
        family_name (Optional[str]): Apellido.
        external_id (Optional[str]): externalId del usuario.
        active (bool): Estado activo/inactivo inicial.
        timeout (int): Timeout por request.
    Return:
        Dict[str, Any]: JSON del usuario creado devuelto por SCIM.
    Raises:
        Exception: Para códigos HTTP distintos de 200 o 201.
    """
    url = f"{_scim_base()}/Users"
    payload: Dict[str, Any] = {
        "active": active,
        "emails": [{"value": email, "primary": True, "type": "work"}],
        "name": {"givenName": given_name, "familyName": family_name},
        "meta": {"resourceType": "User"},
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    }
    if user_name:
        payload["userName"] = user_name
    if external_id:
        payload["externalId"] = external_id

    resp = requests.post(url, headers=_headers_scim(), json=payload, timeout=timeout)
    if resp.status_code not in (200, 201):
        raise Exception(f"Error {resp.status_code} creando User: {resp.text}")
    return resp.json()


def scim_delete_user(user_id: Optional[str] = None, user_name: Optional[str] = None, *, timeout: int = 25) -> Dict[str, Any]:
    """
    Summary:
        Elimina un usuario por 'id'. Si no se provee, intenta resolver el 'id' buscando por 'userName'.
    Params:
        user_id (Optional[str]): Identificador SCIM del usuario.
        user_name (Optional[str]): userName para resolver el id si no se envía 'user_id'.
        timeout (int): Timeout por request.
    Return:
        Dict[str, Any]: {'status_code': <int>, 'id': <str>} con el id eliminado.
    Raises:
        ValueError: Si no se envía 'user_id' ni 'user_name'.
        LookupError: Si no se encuentra el usuario por 'userName'.
        Exception: Si la API devuelve códigos inesperados al borrar.
    """
    _id = (user_id or "").strip()
    if not _id:
        if not user_name:
            raise ValueError("Debes enviar user_id o user_name")
        found = scim_list_users(user_name)
        res = (found.get("Resources") or [])
        if not res:
            raise LookupError(f"No se encontró userName '{user_name}'")
        _id = res[0].get("id")
        if not _id:
            raise Exception("El usuario no tiene 'id' en la respuesta")

    url = f"{_scim_base()}/Users/{_id}"
    resp = requests.delete(url, headers=_headers_scim(), timeout=timeout)
    if resp.status_code not in (200, 204):
        raise Exception(f"Error {resp.status_code} eliminando User {_id}: {resp.text}")
    return {"status_code": resp.status_code, "id": _id}


def scim_update_user_put(
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    *,
    email: Optional[str] = None,
    given_name: Optional[str] = None,
    family_name: Optional[str] = None,
    active: Optional[bool] = None,
    timeout: int = 30,
) -> Dict[str, Any]:
    """
    Summary:
        Actualiza un usuario mediante PUT (reemplazo controlado). Si no se pasa 'user_id', resuelve usando 'user_name'.
        Intenta preservar valores existentes leyendo el usuario actual antes de construir el payload.
    Params:
        user_id (Optional[str]): Identificador SCIM del usuario.
        user_name (Optional[str]): userName para resolver el id si no se envía 'user_id'.
        email (Optional[str]): Nuevo correo principal.
        given_name (Optional[str]): Nuevo nombre.
        family_name (Optional[str]): Nuevo apellido.
        active (Optional[bool]): Estado activo/inactivo.
        timeout (int): Timeout por request.
    Return:
        Dict[str, Any]: JSON del usuario actualizado.

    Raises:
        ValueError: Si no se envía 'user_id' ni 'user_name'.
        LookupError: Si no se encuentra el usuario por 'userName'.
        Exception: Si la API devuelve códigos inesperados al leer/actualizar.
    """
    _id = (user_id or "").strip()
    if not _id:
        if not user_name:
            raise ValueError("Debes enviar user_id o user_name")
        found = scim_list_users(user_name)
        res = (found.get("Resources") or [])
        if not res:
            raise LookupError(f"No se encontró userName '{user_name}'")
        _id = res[0].get("id")
        if not _id:
            raise Exception("El usuario no tiene 'id' en la respuesta")

    current = {}
    try:
        url_get = f"{_scim_base()}/Users/{_id}"
        r = requests.get(url_get, headers=_headers_scim(), timeout=timeout)
        if r.status_code == 200:
            current = r.json()
    except Exception:
        current = {}

    payload: Dict[str, Any] = {
        "active": active if active is not None else current.get("active", True),
        "emails": current.get("emails", []),
        "name": current.get("name", {"givenName": "", "familyName": ""}),
        "meta": {"resourceType": "User"},
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "userName": current.get("userName", user_name or ""),
        "externalId": current.get("externalId", ""),
    }

    if email:
        payload["emails"] = [{"value": email, "primary": True, "type": "work"}]
    if given_name:
        payload["name"]["givenName"] = given_name
    if family_name:
        payload["name"]["familyName"] = family_name

    url = f"{_scim_base()}/Users/{_id}"
    resp = requests.put(url, headers=_headers_scim(), json=payload, timeout=timeout)
    if resp.status_code not in (200, 201):
        raise Exception(f"Error {resp.status_code} actualizando User {_id}: {resp.text}")
    return resp.json()