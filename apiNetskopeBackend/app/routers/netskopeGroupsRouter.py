from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.netskopeGroupsService import (
    scim_list_groups,
    scim_get_group_by_name,               # sin miembros
    scim_get_group_by_name_with_members,  # con members (flag requerido)
    scim_create_group_with_members,       # crear por nombre + miembros (username/correo/id)
    scim_delete_group,
    scim_patch_group,
    scim_remove_user_from_group,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma - Groups"])


# ------------------------------------------------------------------
# GET /Gamma/groups
# - Si envías 'name': devuelve ese grupo (opcional include_members=true)
# - Si NO envías 'name': lista todos los grupos (paginado)
# ------------------------------------------------------------------
@router.get("/groups", summary="Lista grupos o devuelve uno por displayName")
def get_groups(
    name: Optional[str] = Query(
        default=None,
        description='displayName exacto. Si no se envía, se listan todos los grupos.'
    ),
    include_members: bool = Query(
        default=False,
        description="Si name está presente y true, usa attributes=members (requiere flag SCIM activado)."
    ),
    start_index: int = Query(1, ge=1, description="Paginación cuando no se envía 'name'"),
    count: int = Query(100, ge=1, le=1000, description="Paginación cuando no se envía 'name'"),
):
    try:
        if name:
            g = scim_get_group_by_name_with_members(name) if include_members else scim_get_group_by_name(name)
            if not g:
                raise HTTPException(status_code=404, detail=f"No se encontró el grupo '{name}'")
            return g
        # Sin 'name' -> listar
        return scim_list_groups(start_index=start_index, count=count)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# POST /Gamma/groups
# Crea grupo por nombre; 'members' (opcional) acepta usernames/correos/ids
# ------------------------------------------------------------------
@router.post("/groups", summary="Crea un grupo por nombre y miembros (username/correo/id)")
def create_group(
    group_name: str = Query(..., description="displayName del grupo a crear"),
    members: Optional[List[str]] = Query(
        default=None,
        description="Miembros por username o correo (también acepta IDs). Repite el parámetro para varios.",
    ),
):
    try:
        return scim_create_group_with_members(group_name=group_name, members=members or [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# DELETE /Gamma/groups
# Elimina por id o por nombre
# ------------------------------------------------------------------
@router.delete("/groups", summary="Elimina un grupo por id o por nombre")
def delete_group(
    group_id: Optional[str] = Query(default=None, description="ID SCIM del grupo"),
    name: Optional[str] = Query(default=None, description="displayName del grupo"),
):
    try:
        return scim_delete_group(group_id=group_id, name=name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# PATCH /Gamma/groups/patch
# Agrega/Remueve miembros por username/correo/id y/o renombra el grupo
# ------------------------------------------------------------------
@router.patch(
    "/groups/patch",
    summary="PATCH de grupo: agregar/quitar miembros (username/correo/id) y/o renombrar"
)
def patch_group(
    group_id: Optional[str] = Query(default=None, description="ID SCIM del grupo"),
    name:     Optional[str] = Query(default=None, description="displayName del grupo"),
    add_members:    Optional[List[str]] = Query(default=None, description="Usernames/correos/IDs a agregar"),
    remove_members: Optional[List[str]] = Query(default=None, description="Usernames/correos/IDs a quitar"),
    # Compatibilidad: si realmente quieres pasar IDs directos
    add_member_ids:    Optional[List[str]] = Query(default=None, description="IDs a agregar (opcional)"),
    remove_member_ids: Optional[List[str]] = Query(default=None, description="IDs a quitar (opcional)"),
    new_display_name:  Optional[str]       = Query(default=None, description="Nuevo displayName"),
):
    try:
        return scim_patch_group(
            group_id=group_id,
            name=name,
            add_members=add_members or None,
            remove_members=remove_members or None,
            add_member_ids=add_member_ids or None,
            remove_member_ids=remove_member_ids or None,
            new_display_name=new_display_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# DELETE /Gamma/groups/memberDelete
# Elimina un miembro por username/correo/id de un grupo (id o nombre)
# ------------------------------------------------------------------
@router.delete(
    "/groups/memberDelete",
    summary="Elimina un usuario del grupo por username/correo/id (id o nombre de grupo)"
)
def remove_member_from_group(
    member: str = Query(..., description="Username, correo o ID del usuario a eliminar del grupo"),
    group_id: Optional[str] = Query(default=None, description="ID SCIM del grupo"),
    name:     Optional[str] = Query(default=None, description="displayName del grupo"),
):
    try:
        return scim_remove_user_from_group(member=member, group_id=group_id, name=name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))