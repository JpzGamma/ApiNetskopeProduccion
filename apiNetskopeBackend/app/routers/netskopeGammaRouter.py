from typing import Literal, Optional, List, Dict, Any
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field

from app.services.netskopeGammaService import (
    list_url_lists,
    count_url_lists,
    find_url_list_by_name,
    patch_url_list,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma"])


# ---------- HOME ----------
@router.get("/home", summary="Pantalla inicial de Gamma (sin auth)")
def gamma_home():
    return {
        "tenant": "Gamma",
        "modules": [
            {"key": "url-list", "name": "URL Lists", "path": "/Gamma/url-lists"},
        ],
        "notes": "Desde aquí el front pinta tarjetas para cada módulo.",
    }


# ---------- MODELOS EXISTENTES ----------
class UrlListDataIn(BaseModel):
    type: Literal["exact", "regex", "wildcard"] = Field(default="exact")
    urls: list[str] = Field(default_factory=list)

class UrlListPatchIn(BaseModel):
    data: UrlListDataIn
    name: Optional[str] = Field(default=None, description="Nombre a mantener/actualizar (opcional)")


# ---------- LISTAR / CONTAR ----------
@router.get("/url-lists", summary="Lista de URL Lists (opcional: filtrar por nombre)")
def gamma_list_url_lists(name: Optional[str] = Query(default=None, description="Nombre exacto, p.ej. [Semillero] AllowList")):
    try:
        if name:
            item = find_url_list_by_name(name)
            if not item:
                raise HTTPException(status_code=404, detail=f"No se encontró la URL List '{name}'")
            return item
        return list_url_lists()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/url-lists/count", summary="Cantidad total de URL Lists")
def gamma_count_url_lists():
    try:
        return {"count": count_url_lists()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== PATCH MASIVO (DECLARADO ANTES DEL POR ID) ==========
def _to_host(u: str) -> Optional[str]:
    if not isinstance(u, str):
        return None
    s = u.strip()
    if not s:
        return None
    parsed = urlparse(s if "://" in s else f"http://{s}")
    host = parsed.hostname or s
    return host.lower().strip() if host else None

@router.patch(
    "/url-lists/_batch/{action}",
    summary="PATCH masivo a URL Lists por IDs y/o Nombres (body = lista de URLs, sin JSON anidado)"
)
def gamma_patch_url_lists_batch(
    action: Literal["append", "replace"],
    ids: Optional[str] = Query(None, description="IDs separados por coma. Ej: 77,79"),
    names: Optional[str] = Query(None, description="Nombres separados por coma. Ej: [Semillero] AllowList,Lista Demo"),
    urls: List[str] = Body(..., example=[
        "www.google.com",
        "youtube.com",
        "netskope.com"
    ]),
):
    if not ids and not names:
        raise HTTPException(status_code=400, detail="Debes enviar al menos 'ids' o 'names'")

    # Normalizar URLs a hosts únicos
    hosts: list[str] = []
    seen = set()
    for u in urls or []:
        h = _to_host(u)
        if h and h not in seen:
            seen.add(h)
            hosts.append(h)
    if not hosts:
        raise HTTPException(status_code=422, detail="No hay URLs válidas para enviar")

    # Resolver IDs
    target_ids: set[int] = set()

    if ids:
        try:
            for part in ids.split(","):
                part = part.strip()
                if part:
                    target_ids.add(int(part))
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de 'ids' inválido. Usa enteros separados por coma.")

    not_found_names: list[str] = []
    if names:
        for raw_name in names.split(","):
            name = raw_name.strip()
            if not name:
                continue
            item = find_url_list_by_name(name)
            if item and "id" in item:
                target_ids.add(int(item["id"]))
            else:
                not_found_names.append(name)

    if not target_ids:
        raise HTTPException(status_code=404, detail="No se resolvió ningún ID a partir de 'ids' y/o 'names'")

    payload = {"data": {"type": "exact", "urls": hosts}}

    results: list[Dict[str, Any]] = []
    for lid in sorted(target_ids):
        try:
            res = patch_url_list(list_id=lid, payload=payload, action=action)
            results.append({"id": lid, "status": "ok", "sent": len(hosts), "result": res})
        except Exception as e:
            results.append({"id": lid, "status": "error", "error": str(e)})

    return {
        "action": action,
        "targets": sorted(target_ids),
        "not_found_names": not_found_names,
        "sent_urls": hosts,
        "results": results,
    }


# ---------- PATCH POR ID (DEJAR DESPUÉS PARA NO COLISIONAR) ----------
@router.patch(
    "/url-lists/{list_id}/{action}",
    summary="PATCH a una URL List por ID (append o replace)"
)
def gamma_patch_url_list_by_id(
    list_id: int,
    action: Literal["append", "replace"],
    payload: UrlListPatchIn = Body(..., example={
        "data": {
            "type": "exact",
            "urls": [
                "www.google.com",
                "youtube.com",
                "netskope.com"
            ]
        }
    }),
):
    try:
        return patch_url_list(list_id, payload.model_dump(), action)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))