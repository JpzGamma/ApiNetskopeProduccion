from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.netskopeUsersService import (
    scim_list_users,
    scim_create_user,
    scim_delete_user,
    scim_update_user_put,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma - Users"])

# ----------------------------------------------
# GET /Gamma/users  (busca por UPN o por correo)
# ----------------------------------------------
@router.get("/users", summary="Lista/filtra usuarios SCIM (UPN o correo)")
def list_users(
    user_name: Optional[str] = Query(
        default=None,
        description='UPN (userName) o correo electrónico. Ej: "upn1" o "alguien@dominio.com"',
    ),
    start_index: int = Query(1, ge=1),
    count: int = Query(100, ge=1, le=1000),
    fetch_all: bool = Query(False, description="Si no encuentra por filtro, pagina todo y filtra localmente"),
):
    try:
        return scim_list_users(
            query=user_name,
            start_index=start_index,
            count=count,
            fetch_all=fetch_all,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------
# POST /Gamma/users  (crear)
# ----------------------------------------------
@router.post("/users", summary="Crea un usuario SCIM (correo, username)")
def create_user(
    email: str = Query(..., description="Correo del usuario"),
    user_name: str = Query(..., description="Username (UPN o Correo)"),
    given_name: Optional[str] = Query(None, description="Nombre (Opcional)"),
    family_name: Optional[str] = Query(None, description="Apellido (opcional)"),
    external_id: Optional[str] = Query(None, description="externalId (opcional)"),
):
    try:
        return scim_create_user(
            email=email,
            given_name=given_name,
            family_name=family_name,
            user_name=user_name,
            external_id=external_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------
# PUT /Gamma/users  (actualizar por id o userName)
# ----------------------------------------------
@router.put("/users", summary="Actualiza (PUT) un usuario por id o userName")
def update_user(
    user_id: Optional[str] = Query(None, description="ID SCIM del usuario"),
    user_name: Optional[str] = Query(None, description="UPN si no envías id"),
    email: Optional[str] = Query(None, description="Nuevo correo (opcional)"),
    given_name: Optional[str] = Query(None, description="Nuevo nombre (opcional)"),
    family_name: Optional[str] = Query(None, description="Nuevo apellido (opcional)"),
    active: Optional[bool] = Query(None, description="Marcar activo/inactivo"),
):
    try:
        return scim_update_user_put(
            user_id=user_id,
            user_name=user_name,
            email=email,
            given_name=given_name,
            family_name=family_name,
            active=active,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------
# DELETE /Gamma/users  (eliminar por id o userName)
# ----------------------------------------------
@router.delete("/users", summary="Elimina un usuario por id o userName")
def delete_user(
    user_id: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
):
    try:
        return scim_delete_user(user_id=user_id, user_name=user_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))