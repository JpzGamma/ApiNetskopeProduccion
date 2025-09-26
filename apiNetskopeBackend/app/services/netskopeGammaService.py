import re
import requests
from typing import Literal, Optional, List, Dict, Any, Tuple
from urllib.parse import urlparse
from app.config import settings

# -------------------- Auth / base --------------------
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

# -------------------- Normalización / validación --------------------
_ipv4_re = re.compile(r"^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$")

def _split_netloc_and_path(s: str) -> Tuple[str, str]:
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
    Reglas de wildcard permitidas:
      - ÚNICAMENTE '*.example.com'
      - Sin puerto
      - Sin path (cualquier '*' en el path => rechazado)
      - No se permite wildcard sobre IP
    """
    e = entry.lower().strip()
    if not e:
        return False

    # separar host/path (sin scheme)
    if "/" in e:
        netloc, path = e.split("/", 1)
        path = "/" + path if path and not path.startswith("/") else path
    else:
        netloc, path = e, ""

    # No permitimos wildcard en path bajo ningún caso
    if "*" in (path or ""):
        return False
    if ":" in netloc:  # puerto con wildcard no permitido
        return False

    if not netloc.startswith("*."):
        # cualquier otro uso de * en el host es inválido
        return False

    base = netloc[2:]  # después de "*."
    # base debe ser un host de dominio (no IP)
    if not _is_valid_host_or_ip(base):
        return False
    if _ipv4_re.match(base):
        return False

    return True

def _normalize_exact(s: str) -> Optional[str]:
    if "*" in s:
        return None
    netloc, path = _split_netloc_and_path(s)
    if not _is_valid_host_or_ip(netloc):
        return None
    return f"{netloc}{path}".lower()

def bucketize_urls(urls: List[str], *, allow_regex: bool = False) -> Dict[str, List[str]]:
    """
    Clasifica en:
      - exact          (host[/path] sin '*')
      - wildcard       (SOLO '*.example.com' sin path)
      - regex          (si allow_regex y contiene metacaracteres claros)
      - rejected       (resto)
    """
    out: Dict[str, List[str]] = {"exact": [], "wildcard": [], "regex": [], "rejected": []}
    seen_exact, seen_wild, seen_regex = set(), set(), set()

    for raw in urls or []:
        if not isinstance(raw, string_types := str):
            out["rejected"].append(str(raw)); continue
        s = raw.strip()
        if not s:
            out["rejected"].append(raw); continue

        is_regex_candidate = allow_regex and any(ch in s for ch in r".*+?[](){}|^$\\")
        if is_regex_candidate:
            if s not in seen_regex:
                seen_regex.add(s); out["regex"].append(s)
            continue

        if "*" in s:
            cand = s.lower()
            if _is_valid_wildcard(cand):
                if cand not in seen_wild:
                    seen_wild.add(cand); out["wildcard"].append(cand)
            else:
                out["rejected"].append(raw)
        else:
            norm = _normalize_exact(s)
            if norm:
                if norm not in seen_exact:
                    seen_exact.add(norm); out["exact"].append(norm)
            else:
                out["rejected"].append(raw)
    return out

# -------------------- Lecturas --------------------
def list_url_lists(pending: Optional[int] = None, fields: Optional[str] = None) -> dict | list:
    url = f"{_tenant_base()}/api/v2/policy/urllist"
    params = {}
    if pending in (0, 1): params["pending"] = pending
    if fields: params["field"] = fields
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
    payload = list_url_lists()
    items = payload.get("data", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
    target = name.strip().lower()
    for item in items:
        if isinstance(item, dict) and str(item.get("name", "")).strip().lower() == target:
            return item
    return None

def get_url_list(list_id: int) -> dict:
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=20)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} leyendo URL List {list_id}: {resp.text}")
    return resp.json()

def get_url_list_type(list_id: int) -> str:
    obj = get_url_list(list_id)
    return (obj.get("data") or {}).get("type", "exact")

# -------------------- Crear --------------------
def create_url_list(name: str, urls: List[str], *, allow_regex: bool = False) -> dict:
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

# -------------------- PUT (reemplazo total) --------------------
def put_url_list_by_id(
    list_id: int,
    *,
    name: Optional[str] = None,
    urls: Optional[List[str]] = None,
    allow_regex: bool = False,
) -> dict:
    """
    PUT /api/v2/policy/urllist/{id}
    Reemplaza completamente: nombre (si viene) y URLs (validadas).
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
    # quitar name None para no renombrar si no se envía
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

# -------------------- PATCH --------------------
def patch_url_list(list_id: int, payload: dict, action: Literal["append", "replace"] = "append") -> dict:
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}/{action}"
    resp = requests.patch(url, headers=_base_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al hacer PATCH de URL List: {resp.text}")
    return resp.json()

# -------------------- Deploy (siempre) --------------------
def deploy_url_lists() -> dict | list:
    url = f"{_tenant_base()}/api/v2/policy/urllist/deploy"
    resp = requests.post(url, headers=_base_headers(), timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al hacer deploy de URL Lists: {resp.text}")
    return resp.json() if resp.text else {}

# -------------------- Delete --------------------
def delete_url_list_by_id(list_id: int) -> dict | None:
    url = f"{_tenant_base()}/api/v2/policy/urllist/{list_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar URL List {list_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": list_id}

def delete_url_list_by_name(name: str) -> dict | None:
    item = find_url_list_by_name(name)
    if not item or "id" not in item:
        raise LookupError(f"No se encontró la URL List con nombre '{name}'")
    return delete_url_list_by_id(int(item["id"]))