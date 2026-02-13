from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from app.services.netskopeScoreService import (
    get_user_uci,
    get_active_users_uci,
    reset_user_uci,
    search_users_scim,
)

router = APIRouter(prefix="/Gamma/score", tags=["Gamma-Score"])


@router.get("/uci", summary="Obtiene el UCI (score) de un usuario")
def gamma_get_user_uci(
    user_email: str = Query(..., description="Correo o identificador del usuario"),
):
    try:
        return get_user_uci(user_email=user_email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uci/active", summary="Lista usuarios activos recientes con su UCI")
def gamma_get_active_uci(
    ratingRank: Optional[str] = Query("all", description="Nivel de riesgo (por defecto 'all')"),
    watchlist: Optional[str] = Query("", description="Watchlist opcional"),
    offset: Optional[int] = Query(0, description="Inicio de paginación"),
    limit: Optional[int] = Query(1000, description="Cantidad máxima a listar (1-10000)"),
    sortby: Optional[str] = Query("confidenceScore", description="Campo de ordenamiento"),
    sortorder: Optional[str] = Query("asc", description="Ordenamiento asc/desc"),
):
    try:
        return get_active_users_uci(
            ratingRank=ratingRank,
            watchlist=watchlist,
            offset=offset,
            limit=limit,
            sortby=sortby,
            sortorder=sortorder,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/uci/reset", summary="Reinicia el score (UCI) de un usuario específico")
def gamma_reset_user_uci(
    user_email: str = Query(..., description="Correo o identificador del usuario"),
):
    try:
        return reset_user_uci(user_email=user_email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/search", summary="Busca usuarios (SCIM) por texto: soporta parcial y exacto")
def gamma_search_users(
    query: str = Query(..., description="Texto a buscar (ej: 'aro', 'gamma', 'usuario@dominio.com')"),
    limit: int = Query(20, description="Máximo de resultados a devolver (1-50)"),
):
    """
    - Si query contiene '@' se asume que es correo/UPN casi exacto => SCIM filter eq
    - Si es parcial => pagina SCIM y filtra contains en backend hasta completar limit
    """
    try:
        results = search_users_scim(query=query, limit=limit)
        return {"query": query, "count": len(results), "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
