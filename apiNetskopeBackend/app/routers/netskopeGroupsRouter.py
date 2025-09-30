from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.netskopeGroupsService import (
    scim_list_groups_page_with_members,
    scim_list_all_groups_with_members,
    scim_get_group_by_name,
    scim_create_group,
    scim_delete_group,
    scim_patch_group,
    scim_remove_user_from_group,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma - Groups"])


@router.get("/groups", summary="Lista grupos (paginado) con members o devuelve uno por displayName")
def get_groups(
    name: Optional[str] = Query(
        default=None,
        description="displayName exacto. Si se envía, devuelve ese grupo con sus miembros."
    ),
    start_index: int = Query(1, ge=1, description="SCIM startIndex (por defecto 1)"),
    count: int = Query(100, ge=1, le=1000, description="Tamaño de página (por defecto 100)"),
    all: bool = Query(False, description="Si true, recorre todas las páginas (puede tardar)"),
    max_workers: int = Query(8, ge=1, le=32, description="Hilos para expandir 'members'"),
):
    """
    Summary:
        Devuelve un grupo por nombre (con miembros) o lista paginada con 'members' expandidos.

    Params:
        name (Optional[str]): displayName a buscar.
        start_index (int): Índice inicial para listado paginado.
        count (int): Tamaño de página.
        all (bool): Si True, trae todas las páginas.
        max_workers (int): Hilos para expansión concurrente de miembros.

    Return:
        dict: Grupo único o payload SCIM de lista con 'Resources'.
    """
    try:
        if name:
            g = scim_get_group_by_name(name, with_members=True)
            if not g:
                raise HTTPException(status_code=404, detail=f"No se encontró el grupo '{name}'")
            g.setdefault("members", [])
            return g
        if all:
            data = scim_list_all_groups_with_members(page_size=count, max_workers=max_workers)
        else:
            data = scim_list_groups_page_with_members(
                start_index=start_index, count=count, max_workers=max_workers
            )
        for r in data.get("Resources", []) or []:
            r.setdefault("members", [])
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/groups", summary="Crea un grupo por nombre y miembros (username/correo/id)")
def create_group(
    group_name: str = Query(..., description="displayName del grupo a crear"),
    members: Optional[List[str]] = Query(default=None, description="Miembros por username/correo/ID (repetir parámetro)"),
):
    """
    Summary:
        Crea un grupo con displayName y miembros opcionales.

    Params:
        group_name (str): Nombre del grupo.
        members (Optional[List[str]]): Miembros por username/correo/id.

    Return:
        dict: JSON del grupo creado.
    """
    try:
        return scim_create_group(group_name=group_name, member_ids=members or [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/groups", summary="Elimina un grupo por id o por nombre")
def delete_group(
    group_id: Optional[str] = Query(default=None, description="ID SCIM del grupo"),
    name: Optional[str] = Query(default=None, description="displayName del grupo"),
):
    """
    Summary:
        Elimina un grupo por id o resolviéndolo por displayName.

    Params:
        group_id (Optional[str]): Id del grupo.
        name (Optional[str]): Nombre del grupo.

    Return:
        dict: {'status_code': <int>, 'id': <str>} con el id eliminado.
    """
    try:
        return scim_delete_group(group_id=group_id, name=name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/groups/patch", summary="PATCH de grupo: agregar/quitar miembros y/o renombrar")
def patch_group(
    group_id: Optional[str] = Query(default=None),
    name: Optional[str] = Query(default=None),
    add_members: Optional[List[str]] = Query(default=None),
    remove_members: Optional[List[str]] = Query(default=None),
    add_member_ids: Optional[List[str]] = Query(default=None),
    remove_member_ids: Optional[List[str]] = Query(default=None),
    new_display_name: Optional[str] = Query(default=None),
):
    """
    Summary:
        Aplica PatchOp a un grupo para añadir/remover miembros y/o renombrar.

    Params:
        group_id (Optional[str]): Id del grupo (opcional si se envía 'name').
        name (Optional[str]): displayName para resolver id.
        add_members (Optional[List[str]]): Miembros (username/correo/id) a agregar.
        remove_members (Optional[List[str]]): Miembros (username/correo/id) a remover.
        add_member_ids (Optional[List[str]]): Ids a agregar.
        remove_member_ids (Optional[List[str]]): Ids a remover.
        new_display_name (Optional[str]): Nuevo nombre del grupo.

    Return:
        dict: Respuesta del patch.
    """
    try:
        return scim_patch_group(
            group_id=group_id, name=name,
            add_members=add_members or None, remove_members=remove_members or None,
            add_member_ids=add_member_ids or None, remove_member_ids=remove_member_ids or None,
            new_display_name=new_display_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/groups/memberDelete",
    summary="Elimina un usuario del grupo por username/correo/id (id o nombre de grupo)"
)
def remove_member_from_group(
    member: str = Query(..., description="Username, correo o ID del usuario a eliminar"),
    group_id: Optional[str] = Query(default=None, description="ID SCIM del grupo"),
    name: Optional[str] = Query(default=None, description="displayName del grupo"),
):
    """
    Summary:
        Quita un usuario de un grupo resolviendo primero su id SCIM.

    Params:
        member (str): Username/correo/id del usuario.
        group_id (Optional[str]): Id del grupo.
        name (Optional[str]): Nombre del grupo si no hay id.
        
    Return:
        dict: Respuesta del patch que elimina al miembro.
    """
    try:
        return scim_remove_user_from_group(member=member, group_id=group_id, name=name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))