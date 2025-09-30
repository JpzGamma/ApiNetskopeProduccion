from fastapi import APIRouter, HTTPException, Query, Path
from app.services import netskopePoliciesGroupService as service

router = APIRouter(
    prefix="/Policies/groups",
    tags=["Gamma - Policy Groups"]
)

# -------- GET LIST --------
@router.get("/", summary="Listar grupos de políticas NPA")
def list_policy_groups(
    fields: str = Query(None),
    filter: str = Query(None),
    limit: int = Query(None),
    offset: int = Query(None),
    sortby: str = Query(None),
    sortorder: str = Query(None)
):
    try:
        return service.list_policy_groups(fields, filter, limit, offset, sortby, sortorder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------- GET BY ID --------
@router.get("/{group_id}", summary="Obtener grupo de políticas por ID")
def get_policy_group(group_id: int = Path(..., description="ID del grupo")):
    try:
        return service.get_policy_group(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
