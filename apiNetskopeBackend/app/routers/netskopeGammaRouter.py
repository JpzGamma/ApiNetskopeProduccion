from typing import Literal, Optional
from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from app.services.netskopeGammaService import (
    list_url_lists,
    find_url_list_by_name,
    patch_url_list,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma"])


# ---------- HOME (página inicial del módulo Gamma) ----------
@router.get("/home", summary="Pantalla inicial de Gamma (sin auth)")
def gamma_home():
    return {
        "tenant": "Gamma",
        "modules": [
            {"key": "url-list", "name": "URL Lists", "path": "/Gamma/url-lists"},
        ],
        "notes": "Desde aquí el front pinta tarjetas para cada módulo.",
    }


# ---------- MODELOS ----------
class UrlListDataIn(BaseModel):
    type: Literal["exact", "regex", "wildcard"] = Field(default="exact")
    urls: list[str] = Field(default_factory=list)

class UrlListPatchIn(BaseModel):
    data: UrlListDataIn
    name: Optional[str] = Field(default=None, description="Nombre a mantener/actualizar (opcional)")


# ---------- ENDPOINTS URL LISTS ----------
@router.get("/url-lists", summary="Lista de URL Lists (opcional: filtrar por nombre)")
def gamma_list_url_lists(name: Optional[str] = Query(default=None, description="Nombre exacto, p.ej. [Semillero] AllowList")):
    """
    GET /Gamma/url-lists?name=[nombre]
    - Si pasas 'name', devuelve SOLO esa lista (match exacto case-insensitive).
    - Si no pasas 'name', devuelve el JSON completo de Netskope.
    """
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
            "www.gammaingenieros.com",
            "www.youtube.com",
            "www.facebook.com",
            "www.netskope.com",
            "www.Amazon.com",
            "www.instagram.com",
            "www.outlook.com",
            "www.gmail.com",
            "www.aws.com",
            "www.mercadolibre.com",
            "www.fortinet.com",
            ]
        }
    }),
):
    """
    PATCH /Gamma/url-lists/{id}/{action}
    Body = JSON con 'data.type', 'data.urls' y opcionalmente 'name'.
    """
    try:
        return patch_url_list(list_id, payload.model_dump(), action)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))