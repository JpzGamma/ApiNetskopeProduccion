import re
import requests
from typing import Literal, Optional, List, Dict, Any, Tuple
from urllib.parse import urlparse
from app.config import settings


def _base_headers() -> dict:
    """
    Summary:
        Construye los headers estándar para llamar a la API de Netskope (tenant Gamma).
    Params:
        None
    Return:
        dict: Encabezados HTTP con Authorization Bearer y JSON.
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
        str: URL del tenant normalizada sin trailing slash.
    """
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/")


_ipv4_re = re.compile(r"^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$")


def _split_netloc_and_path(s: str) -> Tuple[str, str]:
    """
    Summary:
        Separa netloc (host[:port]) y path desde una cadena que puede o no traer scheme.
    Params:
        s (str): Cadena que representa una URL o host con/sin path.
    Return:
        Tuple[str, str]: (netloc, path) en minúsculas. Path vacío si es "/".
    """
    p = urlparse(s if "://" in s else f"http://{s}")
    host = (p.hostname or "").lower()
    netloc = host
    if p.port:
        netloc = f"{host}:{p.port}"
    path = p.path or ""
    if path == "/":
        path = ""
    return netloc, path


def _is_valid_host_or_ip(netloc: str) -> bool:
    """
    Summary:
        Valida que el netloc sea un dominio válido o una IPv4 válida. Rechaza localhost.

    Params:
        netloc (str): Host o host:puerto.

    Return:
        bool: True si es dominio o IPv4 válido (no localhost); False en caso contrario.
    """
    if not netloc:
        return False
    host_only = netloc.split(":")[0]
    if host_only == "localhost":
        return False
    if _ipv4_re.match(host_only):
        return True
    return "." in host_only


def _is_valid_wildcard(entry: str) -> bool:
    """
    Summary:
        Valida comodines permitidos para URL Lists.
        Reglas:
          - Sólo se permite formato '*.example.com'
          - Sin puerto
          - Sin comodín en el path
          - No se permite wildcard sobre IP

    Params:
        entry (str): Entrada a validar (posible wildcard).

    Return:
        bool: True si cumple las reglas; False en caso contrario.
    """
    e = entry.lower().strip()
    if not e:
        return False
    if "/" in e:
        netloc, path = e.split("/", 1)
        path = "/" + path if path and not path.startswith("/") else path
    else:
        netloc, path = e, ""
    if "*" in (path or ""):
        return False
    if ":" in netloc:
        return False
    if not netloc.startswith("*."):
        return False
    base = netloc[2:]
    if not _is_valid_host_or_ip(base):
        return False
    if _ipv4_re.match(base):
        return False
    return True


def _normalize_exact(s: str) -> Optional[str]:
    """
    Summary:
        Normaliza entradas exactas (sin '*') a 'host[:port][/path]'. Rechaza entradas inválidas.

    Params:
        s (str): Entrada a normalizar.

    Return:
        Optional[str]: Cadena normalizada en minúsculas o None si no es válida.
    """
    if "*" in s:
        return None
    netloc, path = _split_netloc_and_path(s)
    if not _is_valid_host_or_ip(netloc):
        return None
    return f"{netloc}{path}".lower()


def bucketize_urls(urls: List[str], *, allow_regex: bool = False) -> Dict[str, List[str]]:
    """
    Summary:
        Clasifica entradas en buckets: 'exact', 'wildcard', 'regex' y 'rejected'.
        - exact: host[:port][/path] sin comodines
        - wildcard: sólo '*.example.com' (sin path/puerto)
        - regex: si allow_regex=True y la cadena contiene metacaracteres evidentes
        - rejected: resto

    Params:
        urls (List[str]): Lista de entradas recibidas.
        allow_regex (bool): Si True, detecta y separa expresiones regulares.

    Return:
        Dict[str, List[str]]: Diccionario con listas por bucket, deduplicadas.
    """
    out: Dict[str, List[str]] = {"exact": [], "wildcard": [], "regex": [], "rejected": []}
    seen_exact, seen_wild, seen_regex = set(), set(), set()

    for raw in urls or []:
        if not isinstance(raw, string_types := str):
            out["rejected"].append(str(raw))
            continue
        s = raw.strip()
        if not s:
            out["rejected"].append(raw)
            continue

        is_regex_candidate = allow_regex and any(ch in s for ch in r".*+?[](){}|^$\\")
        if is_regex_candidate:
            if s not in seen_regex:
                seen_regex.add(s)
                out["regex"].append(s)
            continue

        if "*" in s:
            cand = s.lower()
            if _is_valid_wildcard(cand):
                if cand not in seen_wild:
                    seen_wild.add(cand)
                    out["wildcard"].append(cand)
            else:
                out["rejected"].append(raw)
        else:
            norm = _normalize_exact(s)
            if norm:
                if norm not in seen_exact:
                    seen_exact.add(norm)
                    out["exact"].append(norm)
            else:
                out["rejected"].append(raw)
    return out


def list_url_lists(pending: Optional[int] = None, fields: Optional[str] = None) -> dict | list:
    """
    Summary:
        Lista las URL Lists del tenant.

    Params:
        pending (Optional[int]): 0/1 para filtrar por cambios pendientes.
        fields (Optional[str]): Campos a retornar (según soporte de API Netskope).

    Return:
        dict | list: Respuesta JSON de Netskope. Lanza excepción si status != 200.
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
    """
    Summary:
        Cuenta el número total de URL Lists.

    Params:
        None

    Return:
        int: Cantidad de listas, interpretando respuesta dict/list.
    """
    payload = list_url_lists()
    if isinstance(payload, dict):
        data = payload.get("data")
        return len(data) if isinstance(data, list) else 0
    if isinstance(payload, list):
        return len(payload)
    return 0


def find_url_list_by_name(name: str) -> dict | None:
    """
    Summary:
        Busca una URL List por nombre exacto.

    Params:
        name (str): Nombre a buscar (case-insensitive).

    Return:
        dict | None: Item encontrado o None.
    """
    payload = list_url_lists()
    items = payload.get("data", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
    target = name.strip().lower()
    for item in items:
        if isinstance(item, dict) and str(item.get("name", "")).strip().lower() == target:
            return item
    return None


def get_url_list(list_id: int) -> dict:
    """
    Summary:
        Obtiene el detalle de una URL List por ID.

    Params:
        list_id (int): Identificador de la lista.

    Return:
        dict: JSON de Netskope. Lanza excepción si status != 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=20)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} leyendo URL List {list_id}: {resp.text}")
    return resp.json()


def get_url_list_type(list_id: int) -> str:
    """
    Summary:
        Retorna el tipo de una lista ('exact' o 'regex').

    Params:
        list_id (int): Identificador de la lista.

    Return:
        str: Tipo de la lista. 'exact' si no puede determinarse.
    """
    obj = get_url_list(list_id)
    return (obj.get("data") or {}).get("type", "exact")


def create_url_list(name: str, urls: List[str], *, allow_regex: bool = False) -> dict:
    """
    Summary:
        Crea una nueva URL List. Deduce el tipo según las entradas y reglas de validación.

    Params:
        name (str): Nombre de la lista.
        urls (List[str]): Entradas a validar y enviar.
        allow_regex (bool): Si True y hay regex válidas, crea como 'regex'; de lo contrario usa 'exact'.

    Return:
        dict: Resumen con respuesta de creación, aceptadas, rechazadas, tipo usado y cantidad enviada.
    """
    if not isinstance(name, str) or not name.strip():
        raise ValueError("El nombre es requerido.")

    buckets = bucketize_urls(urls, allow_regex=allow_regex)
    exact_like = (buckets["exact"] or []) + (buckets["wildcard"] or [])
    use_regex = allow_regex and len(buckets["regex"]) > 0

    if use_regex:
        chosen_type, chosen_urls = "regex", buckets["regex"]
    else:
        chosen_type, chosen_urls = "exact", exact_like

    if not chosen_urls:
        raise ValueError("Debes enviar al menos una URL válida para crear la lista.")

    url = f"{_tenant_base()}/api/v2/policy/urllist"
    payload = {"name": name.strip(), "data": {"type": chosen_type, "urls": chosen_urls}}
    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise Exception(f"Error {resp.status_code} al crear URL List: {resp.text}")
    return {
        "created": resp.json(),
        "accepted": {"exact": buckets["exact"], "wildcard_as_exact": buckets["wildcard"], "regex": buckets["regex"] if allow_regex else []},
        "rejected": buckets["rejected"],
        "type_used": chosen_type,
        "sent": len(chosen_urls),
    }


def put_url_list_by_id(
    list_id: int,
    *,
    name: Optional[str] = None,
    urls: Optional[List[str]] = None,
    allow_regex: bool = False,
) -> dict:
    """
    Summary:
        Reemplaza completamente una URL List (nombre y URLs) mediante PUT.

    Params:
        list_id (int): ID de la lista a reemplazar.
        name (Optional[str]): Nuevo nombre (opcional). Si None, no se cambia.
        urls (Optional[List[str]]): Entradas a validar y enviar (obligatorio, no vacío).
        allow_regex (bool): Si True, permite usar regex y cambia el tipo si corresponde.

    Return:
        dict: Resumen con respuesta PUT, aceptadas, rechazadas, tipo usado y cantidad enviada.
    """
    if urls is None or len(urls) == 0:
        raise ValueError("Debes enviar al menos una URL para actualizar la lista.")

    buckets = bucketize_urls(urls, allow_regex=allow_regex)
    exact_like = (buckets["exact"] or []) + (buckets["wildcard"] or [])
    use_regex = allow_regex and len(buckets["regex"]) > 0

    if use_regex:
        chosen_type, chosen_urls = "regex", buckets["regex"]
    else:
        chosen_type, chosen_urls = "exact", exact_like

    if not chosen_urls:
        raise ValueError("Ninguna URL válida tras la validación.")

    payload = {
        "name": name.strip() if isinstance(name, str) and name.strip() else None,
        "data": {"type": chosen_type, "urls": chosen_urls},
    }
    if payload["name"] is None:
        payload.pop("name", None)

    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.put(url, headers=_base_headers(), json=payload, timeout=40)
    if resp.status_code not in (200, 201):
        raise Exception(f"Error {resp.status_code} al hacer PUT de URL List {list_id}: {resp.text}")

    return {
        "put": resp.json(),
        "accepted": {"exact": buckets["exact"], "wildcard_as_exact": buckets["wildcard"], "regex": buckets["regex"] if allow_regex else []},
        "rejected": buckets["rejected"],
        "type_used": chosen_type,
        "sent": len(chosen_urls),
    }


def patch_url_list(list_id: int, payload: dict, action: Literal["append", "replace"] = "append") -> dict:
    """
    Summary:
        Realiza PATCH de una lista por ID para 'append' o 'replace' de URLs.

    Params:
        list_id (int): ID de la lista objetivo.
        payload (dict): Cuerpo con {"data": {"type": "exact|regex", "urls": [...]}}.
        action (Literal["append","replace"]): Acción a ejecutar.

    Return:
        dict: Respuesta JSON de Netskope. Lanza excepción si status no es 200/201/202.
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}/{action}"
    resp = requests.patch(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al hacer PATCH de URL List: {resp.text}")
    return resp.json()


def deploy_url_lists() -> dict | list:
    """
    Summary:
        Dispara el deploy de cambios pendientes de URL Lists.

    Params:
        None

    Return:
        dict | list: Respuesta JSON del deploy. Lanza excepción si status != 200.
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/deploy"
    resp = requests.post(url, headers=_base_headers(), timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al hacer deploy de URL Lists: {resp.text}")
    return resp.json() if resp.text else {}


def delete_url_list_by_id(list_id: int) -> dict | None:
    """
    Summary:
        Elimina una URL List por ID.

    Params:
        list_id (int): Identificador de la lista.

    Return:
        dict | None: JSON de Netskope si hay cuerpo, o un dict con status/id.
    """
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar URL List {list_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": list_id}


def delete_url_list_by_name(name: str) -> dict | None:
    """
    Summary:
        Elimina una URL List por nombre exacto.

    Params:
        name (str): Nombre exacto de la lista.

    Return:
        dict | None: Respuesta de 'delete_url_list_by_id'. Lanza LookupError si no existe.
    """
    item = find_url_list_by_name(name)
    if not item or "id" not in item:
        raise LookupError(f"No se encontró la URL List con nombre '{name}'")
    return delete_url_list_by_id(int(item["id"]))