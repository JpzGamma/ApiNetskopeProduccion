import re
import json
from typing import Optional, List, Literal, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File

from app.services.netskopePrivateAppsService import (
    list_publishers,
    list_private_apps,
    count_private_apps,
    get_private_app,
    create_private_app,
    delete_private_app,
    bulk_create_private_apps,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma-PrivateApps"])


def _split_list(s: Optional[str]) -> List[str]:
    """
    Summary:
        Divide una cadena por ',' o ';' y aplica strip a cada elemento.

    Params:
        s (Optional[str]): Cadena con separadores.

    Return:
        List[str]: Lista de tokens limpios (sin vacíos).
    """
    if not s:
        return []
    return [x.strip() for x in re.split(r"[;,]", s) if x.strip()]


def _parse_protocols_csv(protocols_csv: Optional[str]) -> List[Dict[str, str]]:
    """
    Summary:
        Parsea 'tcp:22,udp:5000' a [{'type':'tcp','port':'22'}, ...].

    Params:
        protocols_csv (Optional[str]): Lista CSV con 'proto:puerto'.

    Return:
        List[Dict[str, str]]: Estructuras normalizadas para 'protocols'.

    Raises:
        HTTPException: Si el formato no es válido o el puerto está fuera de rango.
    """
    if not protocols_csv:
        return []
    out: List[Dict[str, str]] = []
    for token in _split_list(protocols_csv):
        if ":" not in token:
            raise HTTPException(status_code=400, detail=f"Formato de 'protocols_csv' inválido: {token}")
        raw_type, raw_port = token.split(":", 1)
        ptype = raw_type.strip().lower()
        if ptype not in ("tcp", "udp"):
            raise HTTPException(status_code=400, detail=f"Protocolo inválido en 'protocols_csv': {ptype}")
        try:
            port_s = str(int(raw_port.strip()))
            if not (1 <= int(port_s) <= 65535):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail=f"Puerto inválido en 'protocols_csv': {raw_port}")
        out.append({"type": ptype, "port": port_s})
    return out


@router.get("/publishers",summary="Lista publishers NPA")
def gamma_list_publishers(fields: Optional[str] = Query("publisher_id,publisher_name")):
    """
    Summary:
        Lista los publishers disponibles de Netskope Private Access.

    Params:
        fields (Optional[str]): Campos a devolver (ej: publisher_id,publisher_name).

    Return:
        dict: Respuesta JSON de la API de publishers.
    """
    try:
        return list_publishers(fields=fields)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/private-apps", summary="Lista Private Apps")
def gamma_list_private_apps(
    fields: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    offset: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=1000),
):
    """
    Summary:
        Lista Private Apps con filtros opcionales.

    Params:
        fields (Optional[str]): Campos a devolver.
        query (Optional[str]): Término de búsqueda.
        offset (Optional[int]): Desplazamiento.
        limit (Optional[int]): Límite.

    Return:
        dict | list: Respuesta del backend de Netskope.
    """
    try:
        return list_private_apps(fields=fields, query=query, offset=offset, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/private-apps/count", summary="Cantidad total de Private Apps")
def gamma_count_private_apps():
    """
    Summary:
        Devuelve el conteo total de Private Apps.

    Params:
        None

    Return:
        dict: {'count': <int>}
    """
    try:
        return {"count": count_private_apps()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/private-apps/{private_app_id}", summary="Obtiene Private App por ID")
def gamma_get_private_app(private_app_id: int):
    """
    Summary:
        Retorna el detalle de una Private App por su ID.

    Params:
        private_app_id (int): Identificador de la app privada.

    Return:
        dict: Detalle de la app.
    """
    try:
        return get_private_app(private_app_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/private-apps",summary="Crea Private App (por parámetros)")
def gamma_create_private_app_params(
    app_name: str = Query(..., description="Nombre de la Private App"),
    host: str = Query(..., description="Host/FQDN o IP"),
    protocol: Literal["tcp", "udp", "TCP", "UDP"] = Query(...),
    port: int = Query(..., ge=1, le=65535, description="Puerto único (1-65535)"),
    publisher_ids: Optional[str] = Query(None, description="IDs de publishers separados por coma o ;"),
    publisher_names: Optional[str] = Query(None, description="Nombres de publishers separados por coma o ;"),
    app_tag: Optional[str] = Query(None, description="Tag opcional para la app"),
):
    """
    Summary:
        Crea una Private App a partir de parámetros simples. Si no hay IDs, resuelve IDs por nombres.

    Params:
        app_name (str): Nombre de la app.
        host (str): FQDN/IP.
        protocol (Literal["tcp","udp","TCP","UDP"]): Protocolo.
        port (int): Puerto.
        publisher_ids (Optional[str]): IDs CSV/semicolon.
        publisher_names (Optional[str]): Nombres CSV/semicolon.
        app_tag (Optional[str]): Tag para convertir a label.

    Return:
        dict: Respuesta de creación de la Private App.

    Raises:
        HTTPException: Para validaciones de entrada y resolución de publishers.
    """
    try:
        proto = protocol.lower()
        ids = _split_list(publisher_ids)
        names = _split_list(publisher_names)

        if not ids and not names:
            raise HTTPException(status_code=400, detail="Envía al menos publisher_ids o publisher_names")

        resolved_ids: List[int] = []
        if ids:
            for raw in ids:
                try:
                    resolved_ids.append(int(raw))
                except Exception:
                    raise HTTPException(status_code=400, detail=f"publisher_id inválido: {raw}")
        else:
            pub_resp = list_publishers(fields="publisher_id,publisher_name")
            pool = pub_resp.get("data", {}).get("publishers", []) if isinstance(pub_resp, dict) else []
            name2id = {str(p.get("publisher_name", "")).strip().lower(): int(p["publisher_id"])
                       for p in pool if "publisher_id" in p}
            for nm in names:
                key = nm.strip().lower()
                if key not in name2id:
                    raise HTTPException(status_code=404, detail=f"Publisher '{nm}' no encontrado")
                resolved_ids.append(name2id[key])

        publishers: List[Dict[str, Any]] = []
        for i, pid in enumerate(resolved_ids):
            entry: Dict[str, Any] = {"publisher_id": pid}
            if i < len(names) and names[i]:
                entry["publisher_name"] = names[i]
            publishers.append(entry)

        port_s = str(int(port))
        payload: Dict[str, Any] = {
            "app_name": app_name,
            "host": host,
            "protocols": [{"port": port_s, "type": proto}],
            "publishers": publishers,
        }
        tags = [app_tag.strip()] if app_tag and app_tag.strip() else None
        return create_private_app(payload, tags=tags)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/private-apps/{private_app_id}", summary="Elimina Private App por ID")
def gamma_delete_private_app(private_app_id: int):
    """
    Summary:
        Elimina una Private App por ID.

    Params:
        private_app_id (int): Identificador.

    Return:
        dict: Respuesta de eliminación {'status', 'id'} o JSON del backend.
    """
    try:
        return delete_private_app(private_app_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/private-apps/_bulk",summary="Carga masiva de Private Apps (CSV/XLSX)"
)
async def gamma_bulk_create_private_apps(file: UploadFile = File(...)):
    """
    Summary:
        Carga masiva desde CSV/XLSX, consolidando por app_name y creando cada app.

        "Columnas requeridas: app_name, host, protocol(TCP/UDP), port, publisher_id. "

        "Opcionales: publisher_name, tags. Se agrupan filas por app_name."

    Params:
        file (UploadFile): Archivo .csv o .xlsx.

    Return:
        dict: {'summary', 'row_errors', 'results'} con métricas y resultados por app.
    """
    try:
        content = await file.read()
        result = bulk_create_private_apps(content, file.filename or "")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))