import io
import csv
import requests
from typing import Optional, Literal, Dict, Any, List, Tuple
from app.config import settings


def _base_headers() -> dict:
    """
    Summary:
        Construye encabezados estándar para la API de Netskope (Bearer + JSON).

    Params:
        None

    Return:
        dict: Headers con Authorization y tipos JSON.

    Raises:
        RuntimeError: Si faltan NETSKOPE_TENANT_GAMMA o NETSKOPE_TOKEN_GAMMA.
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
        str: URL base normalizada.
    """
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/")


def _normalize_protocols(payload: Dict[str, Any]) -> None:
    """
    Summary:
        Normaliza el campo 'protocols' del payload a minúsculas para 'type'.

    Params:
        payload (Dict[str, Any]): Cuerpo de la Private App a enviar.

    Return:
        None
    """
    protos = payload.get("protocols", [])
    if isinstance(protos, list):
        for p in protos:
            if isinstance(p, dict) and isinstance(p.get("type"), str):
                p["type"] = p["type"].lower()


def _inject_labels_from_tags(payload: Dict[str, Any], tags: Optional[List[str]]) -> None:
    """
    Summary:
        Inyecta 'labels' a partir de una lista de 'tags' simples.

    Params:
        payload (Dict[str, Any]): Cuerpo de la Private App a enviar.
        tags (Optional[List[str]]): Lista de etiquetas como texto plano.

    Return:
        None
    """
    if not tags:
        return
    labels = [{"name": t.strip()} for t in tags if isinstance(t, str) and t.strip()]
    if labels:
        payload["labels"] = labels


def list_publishers(fields: Optional[str] = None) -> Dict[str, Any]:
    """
    Summary:
        Lista publishers de NPA.

    Params:
        fields (Optional[str]): Campos a retornar (ej. 'publisher_id,publisher_name').

    Return:
        Dict[str, Any]: Respuesta JSON de la API.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/infrastructure/publishers"
    params: Dict[str, Any] = {}
    if fields:
        params["fields"] = fields
    resp = requests.get(url, headers=_base_headers(), params=params, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al listar publishers: {resp.text}")
    return resp.json()


def list_private_apps(
    fields: Optional[str] = None,
    query: Optional[str] = None,
    offset: Optional[int] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any] | list:
    """
    Summary:
        Lista Private Apps con filtros opcionales.

    Params:
        fields (Optional[str]): Campos a devolver.
        query (Optional[str]): Búsqueda libre según soporte de API.
        offset (Optional[int]): Desplazamiento.
        limit (Optional[int]): Límite de resultados.

    Return:
        Dict[str, Any] | list: Respuesta JSON (forma depende del tenant/API).

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/steering/apps/private"
    params: Dict[str, Any] = {}
    if fields:
        params["fields"] = fields
    if query:
        params["query"] = query
    if isinstance(offset, int):
        params["offset"] = offset
    if isinstance(limit, int):
        params["limit"] = limit
    resp = requests.get(url, headers=_base_headers(), params=params, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al listar private apps: {resp.text}")
    return resp.json()


def count_private_apps() -> int:
    """
    Summary:
        Cuenta el número de Private Apps, adaptándose a posibles formatos de respuesta.

    Params:
        None

    Return:
        int: Conteo de Private Apps.
    """
    payload = list_private_apps()
    if isinstance(payload, dict):
        if isinstance(payload.get("total"), int):
            return payload["total"]
        for key in ("data", "items", "Resources"):
            if isinstance(payload.get(key), list):
                return len(payload[key])
        return 0
    if isinstance(payload, list):
        return len(payload)
    return 0


def get_private_app(private_app_id: int) -> Dict[str, Any]:
    """
    Summary:
        Obtiene una Private App por ID.

    Params:
        private_app_id (int): Identificador de la app privada.

    Return:
        Dict[str, Any]: Detalle de la app.

    Raises:
        Exception: Si el código HTTP no es 200.
    """
    url = f"{_tenant_base()}/api/v2/steering/apps/private/{private_app_id}"
    resp = requests.get(url, headers=_base_headers(), timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} al leer private app {private_app_id}: {resp.text}")
    return resp.json()


def create_private_app(payload: Dict[str, Any], tags: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Summary:
        Crea una Private App, normalizando protocolos y aplicando labels desde 'tags'.

    Params:
        payload (Dict[str, Any]): Cuerpo de creación (app_name, host, protocols, publishers, ...).
        tags (Optional[List[str]]): Lista de tags a convertir en labels.

    Return:
        Dict[str, Any]: Respuesta JSON de la creación (si hay cuerpo).

    Raises:
        Exception: Si la API no responde 200/201/202.
    """
    _normalize_protocols(payload)
    _inject_labels_from_tags(payload, tags)
    url = f"{_tenant_base()}/api/v2/steering/apps/private"
    resp = requests.post(url, headers=_base_headers(), json=payload, timeout=60)
    if resp.status_code not in (200, 201, 202):
        raise Exception(f"Error {resp.status_code} al crear private app: {resp.text}")
    return resp.json() if resp.text else {}


def delete_private_app(private_app_id: int) -> Dict[str, Any] | None:
    """
    Summary:
        Elimina una Private App por ID.

    Params:
        private_app_id (int): Identificador de la app privada.

    Return:
        Dict[str, Any] | None: JSON devuelto o {'status', 'id'} si no hay cuerpo.

    Raises:
        Exception: Si la API no responde 200/202/204.
    """
    url = f"{_tenant_base()}/api/v2/steering/apps/private/{private_app_id}"
    resp = requests.delete(url, headers=_base_headers(), timeout=30)
    if resp.status_code not in (200, 202, 204):
        raise Exception(f"Error {resp.status_code} al eliminar private app {private_app_id}: {resp.text}")
    return resp.json() if resp.text else {"status": resp.status_code, "id": private_app_id}


_REQUIRED_COLS = {"app_name", "host", "protocol", "port"}
_OPTIONAL_COLS = {"publisher_id", "publisher_name", "tags"}


def _read_csv_bytes(file_bytes: bytes) -> List[Dict[str, str]]:
    """
    Summary:
        Lee bytes CSV a una lista de dicts normalizados a minúsculas.

    Params:
        file_bytes (bytes): Contenido del archivo CSV (UTF-8/UTF-8-SIG).

    Return:
        List[Dict[str, str]]: Filas con claves en minúsculas y valores strip().
    """
    text = file_bytes.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    rows: List[Dict[str, str]] = []
    for r in reader:
        rows.append({(k or "").strip().lower(): (v or "").strip() for k, v in r.items()})
    return rows


def _read_xlsx_bytes(file_bytes: bytes) -> List[Dict[str, str]]:
    """
    Summary:
        Lee bytes .xlsx a una lista de dicts, tomando la hoja activa.

    Params:
        file_bytes (bytes): Contenido del archivo Excel.

    Return:
        List[Dict[str, str]]: Filas con claves en minúsculas y valores como strings.

    Raises:
        RuntimeError: Si falta el paquete 'openpyxl'.
    """
    try:
        import openpyxl  # type: ignore
    except Exception:
        raise RuntimeError("Para leer .xlsx se requiere el paquete 'openpyxl' instalado en el backend.")
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    headers: List[str] = []
    rows: List[Dict[str, str]] = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = [str(h).strip().lower() for h in row]
            continue
        values = [(str(v).strip() if v is not None else "") for v in row]
        rows.append({headers[j]: values[j] if j < len(values) else "" for j in range(len(headers))})
    return rows


def _aggregate_rows_to_payloads(rows: List[Dict[str, str]]) -> Tuple[List[Tuple[Dict[str, Any], List[str]]], List[Dict[str, Any]]]:
    """
    Summary:
        Agrega filas por 'app_name' construyendo payloads de creación y acumulando errores.

    Params:
        rows (List[Dict[str, str]]): Filas normalizadas desde CSV/XLSX.

    Return:
        Tuple[List[Tuple[Dict[str, Any], List[str]]], List[Dict[str, Any]]]:
            - Lista de tuplas (payload, tags) por app única.
            - Lista de errores por fila con índice (base 2: incluye header).
    """
    errors: List[Dict[str, Any]] = []
    by_app: Dict[str, Dict[str, Any]] = {}
    by_app_tags: Dict[str, set] = {}

    for idx, r in enumerate(rows, start=2):
        if not _REQUIRED_COLS.issubset(set(r.keys())):
            errors.append({"row": idx, "error": f"Faltan columnas requeridas: {_REQUIRED_COLS}"})
            continue

        app_name = r.get("app_name", "").strip()
        host = r.get("host", "").strip()
        protocol = r.get("protocol", "").strip().lower()
        port_raw = r.get("port", "").strip()
        pub_id_raw = r.get("publisher_id", "").strip()
        pub_name = r.get("publisher_name", "").strip()
        tags_raw = r.get("tags", "").strip()

        if not app_name or not host or not protocol or not port_raw:
            errors.append({"row": idx, "error": "app_name, host, protocol y port son obligatorios"})
            continue

        if protocol not in ("tcp", "udp"):
            errors.append({"row": idx, "error": f"protocol inválido: {protocol}. Use TCP/UDP"})
            continue

        try:
            port_s = str(int(float(port_raw)))
            if not (1 <= int(port_s) <= 65535):
                raise ValueError()
        except Exception:
            errors.append({"row": idx, "error": f"port inválido: {port_raw}"})
            continue

        if not pub_id_raw:
            errors.append({"row": idx, "error": "publisher_id es requerido en CSV/XLSX"})
            continue

        publisher_entry: Dict[str, Any] = {"publisher_id": int(float(pub_id_raw))}
        if pub_name:
            publisher_entry["publisher_name"] = pub_name

        key = app_name.lower()
        if key not in by_app:
            by_app[key] = {"app_name": app_name, "host": host, "protocols": [], "publishers": []}
            by_app_tags[key] = set()

        if by_app[key]["host"] != host:
            errors.append({"row": idx, "error": f"host '{host}' difiere del ya definido '{by_app[key]['host']}' para app '{app_name}', se ignora."})

        if {"port": port_s, "type": protocol} not in by_app[key]["protocols"]:
            by_app[key]["protocols"].append({"port": port_s, "type": protocol})

        if publisher_entry and publisher_entry not in by_app[key]["publishers"]:
            by_app[key]["publishers"].append(publisher_entry)

        if tags_raw:
            for t in [x.strip() for x in tags_raw.replace(";", ",").split(",") if x.strip()]:
                by_app_tags[key].add(t)

    payloads: List[Tuple[Dict[str, Any], List[str]]] = []
    for key, payload in by_app.items():
        tags_list = list(by_app_tags.get(key, set()))
        payloads.append((payload, tags_list))

    return payloads, errors


def bulk_create_private_apps(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Summary:
        Carga masiva de Private Apps desde CSV/XLSX. Agrega filas por 'app_name' y crea cada app.

    Params:
        file_bytes (bytes): Contenido del archivo.
        filename (str): Nombre del archivo (para inferir formato).

    Return:
        Dict[str, Any]: Resumen con 'summary', 'row_errors' y 'results'.

    Raises:
        ValueError: Si la extensión no es .csv o .xlsx.
        RuntimeError: Si falta 'openpyxl' para .xlsx.
    """
    name = (filename or "").lower()
    if name.endswith(".csv"):
        rows = _read_csv_bytes(file_bytes)
    elif name.endswith(".xlsx"):
        rows = _read_xlsx_bytes(file_bytes)
    else:
        raise ValueError("Formato no soportado. Usa .csv o .xlsx")

    payloads, row_errors = _aggregate_rows_to_payloads(rows)
    results: List[Dict[str, Any]] = []
    created = 0
    for payload, tags in payloads:
        if not payload["protocols"]:
            results.append({"app_name": payload.get("app_name"), "status": "error", "error": "La app no tiene protocolos válidos"})
            continue
        if not payload["publishers"]:
            results.append({"app_name": payload.get("app_name"), "status": "error", "error": "La app no tiene publishers válidos"})
            continue
        try:
            resp = create_private_app(payload, tags=tags)
            results.append({"app_name": payload.get("app_name"), "status": "ok", "result": resp})
            created += 1
        except Exception as e:
            results.append({"app_name": payload.get("app_name"), "status": "error", "error": str(e)})

    return {
        "summary": {
            "total_rows": len(rows),
            "unique_apps": len(payloads),
            "created": created,
            "failed": len([r for r in results if r.get("status") == "error"]),
        },
        "row_errors": row_errors,
        "results": results,
    }