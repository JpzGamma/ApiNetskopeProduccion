from typing import List, Optional
from enum import Enum
from fastapi import APIRouter, HTTPException, Query, Path
from app.services import netskopePoliciesService as svc

router = APIRouter()


class AccessMethodEnum(str, Enum):
    """
    Summary:
        Métodos de acceso permitidos por la policy.
    """
    client = "Client"
    browser = "Browser"


class ActionEnum(str, Enum):
    """
    Summary:
        Acciones posibles dentro de la policy.
    """
    allow = "allow"
    block = "block"


class EnabledEnum(str, Enum):
    """
    Summary:
        Estado de activación de la policy.
    """
    active = "1"
    inactive = "0"


@router.get(
    "/Gamma/policies/rules",
    tags=["Gamma-Policies"],
    summary="Lista Policies Rules",
    operation_id="gamma_list_policies",
)
def gamma_list_policies():
    """
    Summary:
        Lista las reglas de Policies (NPA).

    Params:
        None

    Return:
        dict: Respuesta JSON de listado.
    """
    try:
        return svc.list_policies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/Gamma/policies/rules/{policy_id}",
    tags=["Gamma-Policies"],
    summary="Obtiene Policy Rule por ID",
    operation_id="gamma_get_policy",
)
def gamma_get_policy(policy_id: str = Path(..., description="ID de la policy")):
    """
    Summary:
        Obtiene una Policy Rule por su ID.

    Params:
        policy_id (str): Identificador de la policy.

    Return:
        dict: JSON de la policy.
    """
    try:
        return svc.get_policy(policy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/Gamma/policies/rules",
    tags=["Gamma-Policies"],
    summary="Crea una nueva Policy Rule",
    operation_id="gamma_create_policy",
)
def gamma_create_policy(
    rule_name: Optional[str] = Query(None, description="Nombre de la política"),
    group_name: Optional[str] = Query(None, description="Nombre del grupo"),
    users: Optional[List[str]] = Query(None, description="Usuarios (uno o varios)"),
    access_method: Optional[AccessMethodEnum] = Query(None, description="Método de acceso"),
    action_name: Optional[ActionEnum] = Query(None, description="Acción de la política"),
    enabled: Optional[EnabledEnum] = Query(None, description="Estado de la política"),
    private_apps: Optional[List[str]] = Query(None, description="Private Apps"),
    private_app_tags: Optional[List[str]] = Query(None, description="Private App Tags"),
    clear_private_apps: Optional[bool] = Query(False, description="Vaciar privateApps"),
    clear_private_app_tags: Optional[bool] = Query(False, description="Vaciar privateAppTags"),
    clear_users: Optional[bool] = Query(False, description="Vaciar users"),
):
    """
    Summary:
        Crea una Policy Rule a partir de parámetros simples. Solo se envían al backend
        los campos presentes o marcados para vaciar.

    Params:
        rule_name (Optional[str]): Nombre de la policy.
        group_name (Optional[str]): Nombre del grupo.
        users (Optional[List[str]]): Lista de usuarios.
        access_method (Optional[AccessMethodEnum]): Client o Browser.
        action_name (Optional[ActionEnum]): allow o block.
        enabled (Optional[EnabledEnum]): "1" o "0".
        private_apps (Optional[List[str]]): Lista de apps.
        private_app_tags (Optional[List[str]]): Lista de tags.
        clear_private_apps (Optional[bool]): Forzar privateApps=[].
        clear_private_app_tags (Optional[bool]): Forzar privateAppTags=[].
        clear_users (Optional[bool]): Forzar users=[].

    Return:
        dict: Respuesta de creación.
    """
    try:
        payload: dict = {}
        if rule_name:
            payload["rule_name"] = rule_name
        if group_name:
            payload["group_name"] = group_name
        if enabled:
            payload["enabled"] = enabled.value

        rule_data: dict = {}
        if users is not None and len(users) > 0:
            rule_data["users"] = users
        elif clear_users:
            rule_data["users"] = []

        if access_method:
            rule_data["access_method"] = [access_method.value]

        if private_apps is not None and len(private_apps) > 0:
            rule_data["privateApps"] = private_apps
        elif clear_private_apps:
            rule_data["privateApps"] = []

        if private_app_tags is not None and len(private_app_tags) > 0:
            rule_data["privateAppTags"] = private_app_tags
        elif clear_private_app_tags:
            rule_data["privateAppTags"] = []

        if action_name:
            rule_data["match_criteria_action"] = {"action_name": action_name.value}

        if rule_data:
            payload["rule_data"] = rule_data

        return svc.create_policy(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/Gamma/policies/rules/{policy_id}",
    tags=["Gamma-Policies"],
    summary="Actualiza Policy Rule por ID",
    operation_id="gamma_update_policy",
)
def gamma_update_policy(
    policy_id: str,
    rule_name: Optional[str] = Query(None, description="Nombre de la política"),
    group_name: Optional[str] = Query(None, description="Nombre del grupo"),
    users: Optional[List[str]] = Query(None, description="Usuarios (uno o varios)"),
    access_method: Optional[AccessMethodEnum] = Query(None, description="Método de acceso"),
    action_name: Optional[ActionEnum] = Query(None, description="Acción de la política"),
    enabled: Optional[EnabledEnum] = Query(None, description="Estado de la política"),
    private_apps: Optional[List[str]] = Query(None, description="Private Apps"),
    private_app_tags: Optional[List[str]] = Query(None, description="Private App Tags"),
    clear_private_apps: Optional[bool] = Query(False, description="Vaciar privateApps"),
    clear_private_app_tags: Optional[bool] = Query(False, description="Vaciar privateAppTags"),
    clear_users: Optional[bool] = Query(False, description="Vaciar users"),
):
    """
    Summary:
        Actualiza parcialmente una Policy Rule. Solo envía los cambios presentes
        o los campos marcados para vaciar.

    Params:
        policy_id (str): ID de la policy.
        rule_name, group_name, users, access_method, action_name, enabled, private_apps,
        private_app_tags, clear_*: Ver creación.

    Return:
        dict: Respuesta de actualización (PATCH).
    """
    try:
        payload: dict = {}
        if rule_name:
            payload["rule_name"] = rule_name
        if group_name:
            payload["group_name"] = group_name
        if enabled:
            payload["enabled"] = enabled.value

        rule_data: dict = {}
        if users is not None and len(users) > 0:
            rule_data["users"] = users
        elif clear_users:
            rule_data["users"] = []

        if access_method:
            rule_data["access_method"] = [access_method.value]

        if private_apps is not None and len(private_apps) > 0:
            rule_data["privateApps"] = private_apps
        elif clear_private_apps:
            rule_data["privateApps"] = []

        if private_app_tags is not None and len(private_app_tags) > 0:
            rule_data["privateAppTags"] = private_app_tags
        elif clear_private_app_tags:
            rule_data["privateAppTags"] = []

        if action_name:
            rule_data["match_criteria_action"] = {"action_name": action_name.value}

        if rule_data:
            payload["rule_data"] = rule_data

        return svc.update_policy(policy_id, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/Gamma/policies/rules/{policy_id}",
    tags=["Gamma-Policies"],
    summary="Elimina Policy Rule por ID",
    operation_id="gamma_delete_policy",
)
def gamma_delete_policy(policy_id: str):
    """
    Summary:
        Elimina una Policy Rule por su ID.

    Params:
        policy_id (str): Identificador.

    Return:
        dict: JSON devuelto o {'status','id'} si no hay cuerpo.
    """
    try:
        return svc.delete_policy(policy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/Policies/groups/",
    tags=["Gamma - Policy Groups"],
    summary="Listar grupos de políticas NPA",
)
def list_policy_groups(
    fields: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(None),
    sortby: Optional[str] = Query(None),
    sortorder: Optional[str] = Query(None),
):
    """
    Summary:
        Lista grupos de políticas con filtros/orden opcional.

    Params:
        fields, filter, limit, offset, sortby, sortorder: Parámetros de consulta.

    Return:
        dict: Respuesta JSON del backend.
    """
    try:
        return svc.list_policy_groups(fields, filter, limit, offset, sortby, sortorder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/Policies/groups/{group_id}",
    tags=["Gamma - Policy Groups"],
    summary="Obtener grupo de políticas por ID",
)
def get_policy_group(group_id: int = Path(..., description="ID del grupo")):
    """
    Summary:
        Obtiene un grupo de políticas por su ID.

    Params:
        group_id (int): Identificador.

    Return:
        dict: Detalle del grupo.
    """
    try:
        return svc.get_policy_group(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))