from __future__ import annotations
import io
import time
from typing import Dict, List, Optional, Iterable
import pandas as pd
import requests
from app.config import settings

# =========================
# Parámetros por defecto
# =========================
BATCH_SIZE_DEFAULT = 100
PAUSE_DEFAULT = 0.2          # segundos entre lotes para no saturar el endpoint
TIMEOUT_DEFAULT = 60         # timeout por request
NO_CATEGORY = "Sin categoría"


# =========================
# Helpers de configuración
# =========================
def _cci_base_url() -> str:
    """
    Endpoint CCI: /api/v2/services/cci/app
    """
    base = settings.NETSKOPE_TENANT_GAMMA
    if not base:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    return f"{base.rstrip('/')}/api/v2/services/cci/app"


def _cci_session() -> requests.Session:
    """
    Crea una sesión requests con headers esperados por CCI.
    (CCI usa 'Netskope-Api-Token')
    """
    token = settings.NETSKOPE_TOKEN_GAMMA
    if not token:
        raise RuntimeError("NETSKOPE_TOKEN_GAMMA no definido en .env")

    s = requests.Session()
    s.headers.update({
        "Netskope-Api-Token": token,
        "Accept": "application/json;charset=utf-8",
        "Content-Type": "application/json;charset=utf-8",
    })
    # s.verify = True  # deja la verificación SSL activa (recomendado)
    return s


# =========================
# Utilidades
# =========================
def _chunked(seq: Iterable[str], size: int) -> Iterable[List[str]]:
    buf: List[str] = []
    for x in seq:
        buf.append(x)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def _apps_list_from_response(payload: dict):
    for key in ("apps", "data", "applications"):
        v = payload.get(key)
        if isinstance(v, list):
            return v
    return []


def _extract_name(obj: dict) -> Optional[str]:
    for k in ("current_name", "app_name", "application_name"):
        v = obj.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def _extract_category(obj: dict) -> Optional[str]:
    v = obj.get("category")
    if isinstance(v, str) and v.strip():
        return v.strip()

    # Intentos comunes anidados
    for path in (("cci", "category"), ("app", "category"), ("details", "category")):
        cur = obj
        ok = True
        for k in path:
            if isinstance(cur, dict):
                cur = cur.get(k)
            else:
                ok = False
                break
        if ok and isinstance(cur, str) and cur.strip():
            return cur.strip()

    # Cualquier clave que contenga 'category'
    for k, val in obj.items():
        if isinstance(val, str) and "category" in str(k).lower() and val.strip():
            return val.strip()

    return None


def _detect_name_column(df: pd.DataFrame) -> str:
    lower = {c.lower(): c for c in df.columns}
    for cand in ("current_name", "application_name", "app_name"):
        if cand in lower:
            return lower[cand]
    raise ValueError(
        "El Excel debe tener la columna 'current_name', 'application_name' o 'app_name'"
    )


# =========================
# Llamadas CCI
# =========================
def _fetch_details_by_names(
    names_batch: List[str],
    *,
    timeout: int,
    session: requests.Session,
) -> List[dict]:
    url = _cci_base_url()
    params = {"apps": ";".join([n for n in names_batch if n]), "limit": str(len(names_batch))}
    r = session.get(url, params=params, timeout=timeout)
    if r.status_code != 200:
        # No lanzamos excepción para permitir recuperación por lotes
        return []
    try:
        payload = r.json()
    except Exception:
        return []
    return _apps_list_from_response(payload)


def _normalize_items(items: List[dict]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for it in items or []:
        name = _extract_name(it)
        cat = _extract_category(it) or NO_CATEGORY
        if name:
            out[name.strip().lower()] = cat
    return out


# =========================
# Funciones públicas (Service)
# =========================
def enrich_app_names(
    names: List[str],
    *,
    batch_size: int = BATCH_SIZE_DEFAULT,
    pause: float = PAUSE_DEFAULT,
    timeout: int = TIMEOUT_DEFAULT,
) -> Dict[str, str]:
    """
    Enriquecer una lista de nombres de aplicaciones con su categoría CCI.
    Retorna un dict { nombre_original_lower: categoria }.
    """
    if not names:
        return {}

    session = _cci_session()
    uniques = sorted({str(n).strip() for n in names if str(n).strip()}, key=str.lower)

    categories: Dict[str, str] = {}
    for batch in _chunked(uniques, batch_size):
        items = _fetch_details_by_names(batch, timeout=timeout, session=session)
        categories.update(_normalize_items(items))
        if pause > 0:
            time.sleep(pause)
    return categories


def enrich_excel_file(
    file_bytes: bytes,
    *,
    batch_size: int = BATCH_SIZE_DEFAULT,
    pause: float = PAUSE_DEFAULT,
    timeout: int = TIMEOUT_DEFAULT,
) -> bytes:
    """
    Recibe bytes de un .xlsx, detecta columna de nombre, agrega 'category' y
    devuelve los bytes del Excel resultante.
    """
    df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
    name_col = _detect_name_column(df)

    # Colecta y normaliza
    names_all = [str(x).strip() for x in df[name_col].tolist() if str(x).strip()]
    categories = enrich_app_names(names_all, batch_size=batch_size, pause=pause, timeout=timeout)

    # Map case-insensitive
    df["category"] = [categories.get(str(v).strip().lower(), NO_CATEGORY) for v in df[name_col].tolist()]

    out_buf = io.BytesIO()
    with pd.ExcelWriter(out_buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    out_buf.seek(0)
    return out_buf.read()