from __future__ import annotations
import io
import time
from typing import Dict, List, Optional, Iterable
import pandas as pd
import requests
from app.config import settings

BATCH_SIZE_DEFAULT = 100
PAUSE_DEFAULT = 0.2
TIMEOUT_DEFAULT = 60
NO_CATEGORY = "Sin categoría"


def _cci_base_url() -> str:
    """
    Summary:
        Construye el endpoint base del servicio CCI: '/api/v2/services/cci/app'.
    Params:
        None
    Return:
        str: URL absoluta del endpoint CCI para el tenant configurado.
    """
    base = settings.NETSKOPE_TENANT_GAMMA
    if not base:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    return f"{base.rstrip('/')}/api/v2/services/cci/app"


def _cci_session() -> requests.Session:
    """
    Summary:
        Crea una sesión HTTP con los headers esperados por CCI (Netskope-Api-Token).
    Params:
        None
    Return:
        requests.Session: Sesión con cabeceras JSON y token de Netskope configurado.
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
    return s


def _chunked(seq: Iterable[str], size: int) -> Iterable[List[str]]:
    """
    Summary:
        Divide una secuencia en listas de tamaño 'size'.
    Params:
        seq (Iterable[str]): Secuencia de cadenas.
        size (int): Tamaño máximo del lote.
    Return:
        Iterable[List[str]]: Generador de lotes consecutivos.
    """
    buf: List[str] = []
    for x in seq:
        buf.append(x)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def _apps_list_from_response(payload: dict):
    """
    Summary:
        Extrae la lista de aplicaciones desde respuestas con claves variables.
    Params:
        payload (dict): Respuesta JSON del endpoint CCI.
    Return:
        list: Lista de aplicaciones si existe; lista vacía en caso contrario.
    """
    for key in ("apps", "data", "applications"):
        v = payload.get(key)
        if isinstance(v, list):
            return v
    return []


def _extract_name(obj: dict) -> Optional[str]:
    """
    Summary:
        Obtiene el nombre de la app desde posibles claves comunes.
    Params:
        obj (dict): Objeto de aplicación retornado por CCI.
    Return:
        Optional[str]: Nombre de la app normalizado o None si no se encuentra.
    """
    for k in ("current_name", "app_name", "application_name"):
        v = obj.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def _extract_category(obj: dict) -> Optional[str]:
    """
    Summary:
        Obtiene la categoría de la app buscando en claves directas y rutas anidadas comunes.
    Params:
        obj (dict): Objeto de aplicación retornado por CCI.
    Return:
        Optional[str]: Categoría encontrada o None si no existe.
    """
    v = obj.get("category")
    if isinstance(v, str) and v.strip():
        return v.strip()
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
    for k, val in obj.items():
        if isinstance(val, str) and "category" in str(k).lower() and val.strip():
            return val.strip()
    return None


def _detect_name_column(df: pd.DataFrame) -> str:
    """
    Summary:
        Detecta la columna de nombre de aplicación en un DataFrame de Excel.
    Params:
        df (pd.DataFrame): DataFrame cargado desde el archivo .xlsx.
    Return:
        str: Nombre real de la columna detectada.
    Raises:
        ValueError: Si no existe 'current_name', 'application_name' o 'app_name'.
    """
    lower = {c.lower(): c for c in df.columns}
    for cand in ("current_name", "application_name", "app_name"):
        if cand in lower:
            return lower[cand]
    raise ValueError(
        "El Excel debe tener la columna 'current_name', 'application_name' o 'app_name'"
    )


def _fetch_details_by_names(
    names_batch: List[str],
    *,
    timeout: int,
    session: requests.Session,
) -> List[dict]:
    """
    Summary:
        Consulta detalles CCI para un lote de nombres de aplicaciones.
    Params:
        names_batch (List[str]): Lote de nombres a consultar.
        timeout (int): Timeout en segundos por request.
        session (requests.Session): Sesión HTTP con headers de CCI.
    Return:
        List[dict]: Lista de objetos de aplicaciones devueltos por CCI.
                    Retorna lista vacía ante status != 200 o JSON inválido.
    """
    url = _cci_base_url()
    params = {"apps": ";".join([n for n in names_batch if n]), "limit": str(len(names_batch))}
    r = session.get(url, params=params, timeout=timeout)
    if r.status_code != 200:
        return []
    try:
        payload = r.json()
    except Exception:
        return []
    return _apps_list_from_response(payload)


def _normalize_items(items: List[dict]) -> Dict[str, str]:
    """
    Summary:
        Convierte una lista de objetos de apps en un mapa nombre→categoría.
    Params:
        items (List[dict]): Objetos devueltos por CCI.
    Return:
        Dict[str, str]: Mapa {nombre_lower: categoría}, usando 'Sin categoría' si falta.
    """
    out: Dict[str, str] = {}
    for it in items or []:
        name = _extract_name(it)
        cat = _extract_category(it) or NO_CATEGORY
        if name:
            out[name.strip().lower()] = cat
    return out


def enrich_app_names(
    names: List[str],
    *,
    batch_size: int = BATCH_SIZE_DEFAULT,
    pause: float = PAUSE_DEFAULT,
    timeout: int = TIMEOUT_DEFAULT,
) -> Dict[str, str]:
    """
    Summary:
        Enriquecimiento de una lista de nombres con su categoría CCI.
    Params:
        names (List[str]): Lista de nombres de aplicación.
        batch_size (int): Tamaño del lote por request.
        pause (float): Pausa en segundos entre lotes.
        timeout (int): Timeout por request.
    Return:
        Dict[str, str]: Mapa {nombre_original_lower: categoría}. Deduplicado case-insensitive.
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
    Summary:
        Enriquecimiento de un archivo Excel agregando columna 'category'.
    Params:
        file_bytes (bytes): Contenido del .xlsx de entrada.
        batch_size (int): Tamaño del lote por request.
        pause (float): Pausa en segundos entre lotes.
        timeout (int): Timeout por request.
    Return:
        bytes: Bytes del .xlsx resultante con la columna 'category' añadida.
    """
    df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
    name_col = _detect_name_column(df)
    names_all = [str(x).strip() for x in df[name_col].tolist() if str(x).strip()]
    categories = enrich_app_names(names_all, batch_size=batch_size, pause=pause, timeout=timeout)
    df["category"] = [categories.get(str(v).strip().lower(), NO_CATEGORY) for v in df[name_col].tolist()]
    out_buf = io.BytesIO()
    with pd.ExcelWriter(out_buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    out_buf.seek(0)
    return out_buf.read()