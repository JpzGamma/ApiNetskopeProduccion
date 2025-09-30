from typing import List, Optional
from enum import Enum
from fastapi import APIRouter, HTTPException, Query
from app.services import netskopePoliciesRulesService as services

router = APIRouter(prefix="/Gamma/policies", tags=["Gamma-Policies"])

# -------------------- ENUMS --------------------

class AccessMethodEnum(str, Enum):
    client = "Client"
    browser = "Browser"

class ActionEnum(str, Enum):
    allow = "allow"
    block = "block"

class EnabledEnum(str, Enum):
    active = "1"
    inactive = "0"


# -------------------- LISTAR / OBTENER --------------------

@router.get(
    "/rules",
    summary="Lista Policies Rules",
    operation_id="gamma_list_policies"
)
def gamma_list_policies():
    try:
        return services.list_policies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/rules/{policy_id}",
    summary="Obtiene Policy Rule por ID",
    operation_id="gamma_get_policy"
)
def gamma_get_policy(policy_id: str):
    try:
        return services.get_policy(policy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- CREAR --------------------

@router.post(
    "/rules",
    summary="Crea una nueva Policy Rule",
    operation_id="gamma_create_policy"
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
):
    try:
        payload = {}

        if rule_name:
            payload["rule_name"] = rule_name
        if group_name:
            payload["group_name"] = group_name
        if enabled:
            payload["enabled"] = enabled.value

        rule_data = {}
        if users:
            rule_data["users"] = users
        if access_method:
            rule_data["access_method"] = [access_method.value]
        if private_apps:
            rule_data["privateApps"] = private_apps
        if private_app_tags:
            rule_data["privateAppTags"] = private_app_tags
        if action_name:
            rule_data["match_criteria_action"] = {"action_name": action_name.value}

        if rule_data:
            payload["rule_data"] = rule_data

        return services.create_policy(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- EDITAR --------------------

@router.patch(
    "/rules/{policy_id}",
    summary="Actualiza Policy Rule por ID",
    operation_id="gamma_update_policy"
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
):
    try:
        payload = {}

        if rule_name:
            payload["rule_name"] = rule_name
        if group_name:
            payload["group_name"] = group_name
        if enabled:
            payload["enabled"] = enabled.value

        rule_data = {}
        if users:
            rule_data["users"] = users
        if access_method:
            rule_data["access_method"] = [access_method.value]
        if private_apps:
            rule_data["privateApps"] = private_apps
        if private_app_tags:
            rule_data["privateAppTags"] = private_app_tags
        if action_name:
            rule_data["match_criteria_action"] = {"action_name": action_name.value}

        if rule_data:
            payload["rule_data"] = rule_data

        return services.update_policy(policy_id, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- ELIMINAR --------------------

@router.delete(
    "/rules/{policy_id}",
    summary="Elimina Policy Rule por ID",
    operation_id="gamma_delete_policy"
)
def gamma_delete_policy(policy_id: str):
    try:
        return services.delete_policy(policy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
