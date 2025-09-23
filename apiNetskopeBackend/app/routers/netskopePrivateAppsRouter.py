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

# -------------------- Helpers --------------------

def _split_list(s: Optional[str]) -> List[str]:
    if not s:
        return []
    return [x.strip() for x in re.split(r"[;,]", s) if x.strip()]

def _parse_protocols_csv(protocols_csv: Optional[str]) -> List[Dict[str, str]]:
    """
    Formato: "tcp:22,udp:5000, tcp:443"
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


# -------------------- Publishers --------------------

@router.get(
    "/publishers",
    summary="Lista publishers NPA",
    description="Devuelve la lista de publishers. Usa 'fields' para limitar (ej: publisher_id,publisher_name)."
)
def gamma_list_publishers(
    fields: Optional[str] = Query("publisher_id,publisher_name")
):
    try:
        return list_publishers(fields=fields)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Private Apps: list / count / get --------------------

@router.get("/private-apps", summary="Lista Private Apps")
def gamma_list_private_apps(
    fields: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    offset: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=1000),
):
    try:
        return list_private_apps(fields=fields, query=query, offset=offset, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/private-apps/count", summary="Cantidad total de Private Apps")
def gamma_count_private_apps():
    try:
        return {"count": count_private_apps()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/private-apps/{private_app_id}", summary="Obtiene Private App por ID")
def gamma_get_private_app(private_app_id: int):
    try:
        return get_private_app(private_app_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Private Apps: create (por parámetros) --------------------

@router.post(
    "/private-apps",
    summary="Crea Private App (por parámetros)",
    description=(
        "Crea una Private App con `app_name`, `host`, `protocol` (tcp|udp), `port` (1-65535). "
        "Puedes enviar `publisher_ids` (coma/; separados), `publisher_names`, o ambos. "
        "Si envías solo nombres, se resuelven a IDs automáticamente. "
        "`app_tag` es opcional."
    ),
)
def gamma_create_private_app_params(
    app_name: str = Query(..., description="Nombre de la Private App"),
    host: str = Query(..., description="Host/FQDN o IP"),
    protocol: Literal["tcp", "udp", "TCP", "UDP"] = Query(...),
    port: int = Query(..., ge=1, le=65535, description="Puerto único (1-65535)"),
    publisher_ids: Optional[str] = Query(None, description="IDs de publishers separados por coma o ;"),
    publisher_names: Optional[str] = Query(None, description="Nombres de publishers separados por coma o ;"),
    app_tag: Optional[str] = Query(None, description="Tag opcional para la app"),
):
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


# -------------------- Private Apps:delete (por ID) --------------------

@router.delete("/private-apps/{private_app_id}", summary="Elimina Private App por ID")
def gamma_delete_private_app(private_app_id: int):
    try:
        return delete_private_app(private_app_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Bulk (CSV/XLSX) --------------------

@router.post(
    "/private-apps/_bulk",
    summary="Carga masiva de Private Apps (CSV/XLSX)",
    description=(
        "Columnas requeridas: app_name, host, protocol(TCP/UDP), port, publisher_id. "
        "Opcionales: publisher_name, tags. Se agrupan filas por app_name."
    ),
)
async def gamma_bulk_create_private_apps(file: UploadFile = File(...)):
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