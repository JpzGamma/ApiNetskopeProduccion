from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.netskopeScoreService import (
    get_user_uci,
    get_active_users_uci,
    reset_user_uci,
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