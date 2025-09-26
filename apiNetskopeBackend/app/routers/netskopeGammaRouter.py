from typing import Literal, Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field

from app.services.netskopeGammaService import (
    list_url_lists, count_url_lists, find_url_list_by_name,
    patch_url_list, deploy_url_lists, delete_url_list_by_id,
    delete_url_list_by_name, bucketize_urls, get_url_list_type,
    create_url_list, put_url_list_by_id,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma-URL_List"])

# ---------- HOME ----------
@router.get("/home", summary="Pantalla inicial de Gamma (sin auth)")
def gamma_home():
    return {
        "tenant": "Gamma",
        "modules": [{"key": "url-list", "name": "URL Lists", "path": "/Gamma/url-lists"}],
        "notes": "Desde aquí el front pinta tarjetas para cada módulo.",
    }

# ---------- MODELOS ----------
class UrlListDataIn(BaseModel):
    type: Literal["exact", "regex"] = Field(default="exact")
    urls: list[str] = Field(default_factory=list)

class UrlListPatchIn(BaseModel):
    data: UrlListDataIn
    name: Optional[str] = Field(default=None, description="Nombre a mantener/actualizar (opcional)")

class UrlListCreateIn(BaseModel):
    name: str = Field(..., min_length=1)
    urls: List[str] = Field(..., description="Listado (no puede ser vacío luego de validar)")
    allow_regex: bool = Field(False, description="Si hay regex, se creará la lista como 'regex'")

class UrlListPutIn(BaseModel):
    name: Optional[str] = Field(default=None, description="Nuevo nombre (opcional)")
    urls: List[str] = Field(..., description="URLs para reemplazo total")
    allow_regex: bool = Field(False, description="Tratar entradas regex si aparecen")

# ---------- LISTAR / CONTAR ----------
@router.get("/url-lists", summary="Lista de URL Lists (opcional: filtrar por nombre)")
def gamma_list_url_lists(name: Optional[str] = Query(default=None, description="Nombre exacto")):
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

# ---------- CREAR (deploy siempre) ----------
@router.post("/url-lists", summary="Crea una URL List (no vacía). Detecta tipo (regex/exact) y hace deploy.")
def gamma_create_url_list(payload: UrlListCreateIn):
    try:
        created_info = create_url_list(payload.name, payload.urls, allow_regex=payload.allow_regex)
        out: Dict[str, Any] = {"create": created_info}
        try:
            out["deploy"] = deploy_url_lists()
        except Exception as e:
            out["deploy_error"] = str(e)
        return out
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- PUT (reemplazo; deploy siempre) ----------
@router.put("/url-lists/{list_id}", summary="Reemplaza completamente una URL List (nombre y URLs).")
def gamma_put_url_list(
    list_id: int,
    payload: UrlListPutIn,
):
    try:
        result = put_url_list_by_id(
            list_id,
            name=payload.name,
            urls=payload.urls,
            allow_regex=payload.allow_regex,
        )
        out: Dict[str, Any] = {"put": result}
        try:
            out["deploy"] = deploy_url_lists()
        except Exception as e:
            out["deploy_error"] = str(e)
        return out
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- PATCH MASIVO (deploy siempre) ----------
@router.patch(
    "/url-lists/_batch/{action}",
    summary="Carga masiva autodetectando exact (incluye wildcard) y regex (opcional). Deploy automático."
)
def gamma_patch_url_lists_batch(
    action: Literal["append", "replace"],
    ids: Optional[str] = Query(None, description="IDs separados por coma"),
    names: Optional[str] = Query(None, description="Nombres separados por coma"),
    allow_regex: bool = Query(False, description="Tratar entradas regex"),
    urls: List[str] = Body(...),
):
    if not ids and not names:
        raise HTTPException(status_code=400, detail="Debes enviar al menos 'ids' o 'names'")

    buckets = bucketize_urls(urls, allow_regex=allow_regex)
    if not buckets["exact"] and not buckets["wildcard"] and not buckets["regex"]:
        raise HTTPException(status_code=422, detail="No hay URLs válidas para enviar (todas rechazadas).")

    target_ids: set[int] = set()
    if ids:
        try:
            for part in ids.split(","):
                part = part.strip()
                if part:
                    target_ids.add(int(part))
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de 'ids' inválido.")
    not_found_names: list[str] = []
    if names:
        for raw_name in names.split(","):
            nm = raw_name.strip()
            if not nm:
                continue
            item = find_url_list_by_name(nm)
            if item and "id" in item:
                target_ids.add(int(item["id"]))
            else:
                not_found_names.append(nm)
    if not target_ids:
        raise HTTPException(status_code=404, detail="No se resolvió ningún ID.")

    exact_like = (buckets["exact"] or []) + (buckets["wildcard"] or [])
    results: list[Dict[str, Any]] = []
    for lid in sorted(target_ids):
        try:
            list_type = get_url_list_type(lid)
        except Exception:
            list_type = "exact"

        if list_type == "regex":
            if allow_regex and buckets["regex"]:
                try:
                    res = patch_url_list(lid, {"data": {"type": "regex", "urls": buckets["regex"]}}, action)
                    results.append({"id": lid, "type": "regex", "status": "ok", "sent": len(buckets["regex"]), "result": res})
                except Exception as e:
                    results.append({"id": lid, "type": "regex", "status": "error", "error": str(e)})
            else:
                results.append({"id": lid, "type": "regex", "status": "skipped", "reason": "no regex entries"})
        else:
            if exact_like:
                try:
                    res = patch_url_list(lid, {"data": {"type": "exact", "urls": exact_like}}, action)
                    results.append({"id": lid, "type": "exact", "status": "ok", "sent": len(exact_like), "result": res})
                except Exception as e:
                    results.append({"id": lid, "type": "exact", "status": "error", "error": str(e)})
            else:
                results.append({"id": lid, "type": "exact", "status": "skipped", "reason": "no exact/wildcard entries"})

    out: Dict[str, Any] = {
        "action": action,
        "targets": sorted(target_ids),
        "not_found_names": not_found_names,
        "accepted": {
            "exact": buckets["exact"],
            "wildcard_as_exact": buckets["wildcard"],
            "regex": buckets["regex"] if allow_regex else [],
        },
        "rejected": buckets["rejected"],
        "results": results,
    }
    try:
        out["deploy"] = deploy_url_lists()
    except Exception as e:
        out["deploy_error"] = str(e)
    return out

# ---------- DEPLOY explícito ----------
@router.post("/url-lists/deploy", summary="Aplica todos los cambios pendientes")
def gamma_deploy_url_lists():
    try:
        return deploy_url_lists()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- DELETE (deploy siempre) ----------
@router.delete("/url-lists/by-name", summary="Elimina una URL List por nombre exacto. Deploy automático.")
def gamma_delete_url_list_by_name_endpoint(name: str = Query(..., description="Nombre exacto")):
    try:
        result = delete_url_list_by_name(name)
        out: Dict[str, Any] = {"deleted": result}
        try:
            out["deploy"] = deploy_url_lists()
        except Exception as e:
            out["deploy_error"] = str(e)
        return out
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/url-lists/{list_id}", summary="Elimina una URL List por ID. Deploy automático.")
def gamma_delete_url_list_by_id_endpoint(list_id: int):
    try:
        result = delete_url_list_by_id(list_id)
        out: Dict[str, Any] = {"deleted": result}
        try:
            out["deploy"] = deploy_url_lists()
        except Exception as e:
            out["deploy_error"] = str(e)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))