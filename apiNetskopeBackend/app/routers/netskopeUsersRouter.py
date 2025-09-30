from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.netskopeUsersService import (
    scim_list_users,
    scim_create_user,
    scim_delete_user,
    scim_update_user_put,
)

router = APIRouter(prefix="/Gamma", tags=["Gamma - Users"])


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
    """
    Summary:
        Lista usuarios SCIM. Si se envía 'user_name', intenta filtrar por userName/email/externalId;
        opcionalmente pagina todo y filtra localmente si 'fetch_all' es True.

    Params:
        user_name (Optional[str]): userName o correo a buscar.
        start_index (int): Índice inicial para consulta directa.
        count (int): Tamaño de página.
        fetch_all (bool): Activa el fallback de paginar todo y filtrar localmente.

    Return:
        dict: Payload SCIM (ListResponse) con resultados o vacío.
    """
    try:
        return scim_list_users(
            query=user_name,
            start_index=start_index,
            count=count,
            fetch_all=fetch_all,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users", summary="Crea un usuario SCIM (correo, username)")
def create_user(
    email: str = Query(..., description="Correo del usuario"),
    user_name: str = Query(..., description="Username (UPN o Correo)"),
    given_name: Optional[str] = Query(None, description="Nombre (Opcional)"),
    family_name: Optional[str] = Query(None, description="Apellido (opcional)"),
    external_id: Optional[str] = Query(None, description="externalId (opcional)"),
):
    """
    Summary:
        Crea un usuario SCIM con correo y userName, más campos opcionales.

    Params:
        email (str): Correo del usuario.
        user_name (str): userName (UPN o correo).
        given_name (Optional[str]): Nombre.
        family_name (Optional[str]): Apellido.
        external_id (Optional[str]): externalId.

    Return:
        dict: Usuario creado devuelto por el API SCIM.
    """
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


@router.put("/users", summary="Actualiza (PUT) un usuario por id o userName")
def update_user(
    user_id: Optional[str] = Query(None, description="ID SCIM del usuario"),
    user_name: Optional[str] = Query(None, description="UPN si no envías id"),
    email: Optional[str] = Query(None, description="Nuevo correo (opcional)"),
    given_name: Optional[str] = Query(None, description="Nuevo nombre (opcional)"),
    family_name: Optional[str] = Query(None, description="Nuevo apellido (opcional)"),
    active: Optional[bool] = Query(None, description="Marcar activo/inactivo"),
):
    """
    Summary:
        Reemplaza un usuario vía PUT. Si no se pasa 'user_id', resuelve por 'user_name'.
        Intenta preservar campos actuales leyendo el recurso antes de actualizar.

    Params:
        user_id (Optional[str]): Id SCIM.
        user_name (Optional[str]): userName si no se provee id.
        email (Optional[str]): Nuevo correo.
        given_name (Optional[str]): Nuevo nombre.
        family_name (Optional[str]): Nuevo apellido.
        active (Optional[bool]): Estado activo

    Return:
        dict: Usuario actualizado según API SCIM.
    """
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


@router.delete("/users", summary="Elimina un usuario por id o userName")
def delete_user(
    user_id: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
):
    """
    Summary:
        Elimina un usuario por id. Si no se provee, lo resuelve usando 'userName'.

    Params:
        user_id (Optional[str]): Id SCIM del usuario.
        user_name (Optional[str]): userName si no se provee id.
        
    Return:
        dict: {'status_code': <int>, 'id': <str>} con el id borrado.
    """
    try:
        return scim_delete_user(user_id=user_id, user_name=user_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))