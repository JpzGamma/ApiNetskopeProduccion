from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.netskopeCCIService import (
    enrich_app_names,
    enrich_excel_file,
    BATCH_SIZE_DEFAULT,
    PAUSE_DEFAULT,
    TIMEOUT_DEFAULT,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma - CCI"])


# --------- Modelos ---------
class CciNamesIn(BaseModel):
    names: List[str] = Field(..., description="Lista de nombres de aplicaciones")


class CciNamesOut(BaseModel):
    count: int
    categories: dict


# --------- Endpoints ---------
@router.post(
    "/cci/enrich/names",
    response_model=CciNamesOut,
    summary="Enriquecer nombres de apps con su categoría CCI (JSON)"
)
def cci_enrich_names(
    payload: CciNamesIn,
    batch_size: int = Query(BATCH_SIZE_DEFAULT, ge=1, le=500, description="Tamaño del lote"),
    pause: float = Query(PAUSE_DEFAULT, ge=0.0, description="Pausa entre lotes (seg)"),
    timeout: int = Query(TIMEOUT_DEFAULT, ge=5, le=300, description="Timeout por request (seg)"),
):
    try:
        categories = enrich_app_names(
            payload.names,
            batch_size=batch_size,
            pause=pause,
            timeout=timeout,
        )
        return CciNamesOut(count=len(categories), categories=categories)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/cci/enrich/excel",
    summary="Enriquecer Excel (.xlsx) agregando columna 'category'",
    responses={
        200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}},
        400: {"description": "Solicitud inválida"},
        500: {"description": "Error procesando el archivo"}
    },
)
async def cci_enrich_excel(
    file: UploadFile = File(..., description="Archivo .xlsx con columna current_name/application_name/app_name"),
    batch_size: int = Query(BATCH_SIZE_DEFAULT, ge=1, le=500),
    pause: float = Query(PAUSE_DEFAULT, ge=0.0),
    timeout: int = Query(TIMEOUT_DEFAULT, ge=5, le=300),
):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Debe subir un archivo .xlsx")

    try:
        content = await file.read()
        result_bytes = enrich_excel_file(
            content,
            batch_size=batch_size,
            pause=pause,
            timeout=timeout,
        )
        # Nombre de salida
        out_name = "aplicaciones_con_categorias.xlsx"
        return StreamingResponse(
            iter([result_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))