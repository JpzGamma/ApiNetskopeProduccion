# app/services/netskopeGroupsService.py
from __future__ import annotations

from typing import List, Optional, Dict, Any
import concurrent.futures as futures
import requests

from app.config import settings


# ==================== Config / Helpers HTTP ====================

def _scim_headers() -> Dict[str, str]:
    tenant = settings.NETSKOPE_TENANT_GAMMA
    token  = settings.NETSKOPE_TOKEN_GAMMA
    if not tenant:
        raise RuntimeError("NETSKOPE_TENANT_GAMMA no definido en .env")
    if not token:
        raise RuntimeError("NETSKOPE_TOKEN_GAMMA no definido en .env")

    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/scim+json;charset=utf-8",
        "Content-Type": "application/scim+json;charset=utf-8",
    }


def _base_scim_url() -> str:
    return settings.NETSKOPE_TENANT_GAMMA.rstrip("/") + "/api/v2/scim"


def _first_resource_id(payload: Any) -> Optional[str]:
    if isinstance(payload, dict):
        resources = payload.get("Resources", []) or payload.get("resources", [])
        if isinstance(resources, list) and resources:
            return resources[0].get("id")
    return None


# ==================== Resolución de usuarios (username/email/id) ====================

def _find_user_id(identifier: str, *, timeout: int = 25) -> Optional[str]:
    ident = (identifier or "").strip()
    if not ident:
        return None

    # parece UUID
    if len(ident) >= 32 and ident.count("-") >= 4:
        return ident

    base = _base_scim_url()
    headers = _scim_headers()
    if "@" in ident:
        filters = [
            f'emails.value eq "{ident}"',
            f'userName eq "{ident}"',
            f'externalId eq "{ident}"',
        ]
    else:
        filters = [
            f'userName eq "{ident}"',
            f'externalId eq "{ident}"',
        ]

    for fexpr in filters:
        r = requests.get(
            f"{base}/Users",
            headers=headers,
            params={"filter": fexpr, "startIndex": 1, "count": 1},
            timeout=timeout,
        )
        if r.status_code == 200:
            uid = _first_resource_id(r.json())
            if uid:
                return uid
    return None


def _resolve_user_ids(identifiers: Optional[List[str]], *, timeout: int = 25) -> List[str]:
    if not identifiers:
        return []
    seen: set[str] = set()
    out: List[str] = []
    for it in identifiers:
        uid = _find_user_id(it or "", timeout=timeout)
        if uid and uid not in seen:
            seen.add(uid)
            out.append(uid)
    return out


# ==================== Lectura: básico ====================

def scim_list_groups_page(*, start_index: int = 1, count: int = 100, timeout: int = 25) -> Dict[str, Any]:
    url = f"{_base_scim_url()}/Groups"
    params = {"startIndex": start_index, "count": count}
    r = requests.get(url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al listar grupos: {r.text}")
    return r.json()


def scim_get_group_by_id(
    group_id: str,
    *,
    attributes: Optional[str] = None,
    excluded_attributes: Optional[str] = None,
    timeout: int = 25,
) -> Dict[str, Any]:
    url = f"{_base_scim_url()}/Groups/{group_id}"
    params: Dict[str, str] = {}
    if attributes:
        params["attributes"] = attributes
    if excluded_attributes:
        params["excludedAttributes"] = excluded_attributes

    r = requests.get(url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al leer grupo {group_id}: {r.text}")
    return r.json()


def scim_get_group_by_name(name: str, *, with_members: bool = False, timeout: int = 25) -> Optional[Dict[str, Any]]:
    list_url = f"{_base_scim_url()}/Groups"
    params = {"filter": f'displayName eq "{name}"', "startIndex": 1, "count": 1}
    r = requests.get(list_url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al filtrar grupos: {r.text}")

    payload = r.json()
    gid = _first_resource_id(payload)
    if not gid:
        resources = payload.get("Resources", []) if isinstance(payload, dict) else []
        if not resources:
            return None
        g = dict(resources[0])
        if with_members and "members" not in g:
            g["members"] = []
        return g

    if with_members:
        try:
            g = scim_get_group_by_id(gid, attributes="members", timeout=timeout)
        except Exception:
            g = scim_get_group_by_id(gid, timeout=timeout)
            g.setdefault("members", [])
        return g
    else:
        return scim_get_group_by_id(gid, timeout=timeout)


# ==================== Lectura con members ====================

def _expand_group_members(group: Dict[str, Any], timeout: int) -> Dict[str, Any]:
    """
    Dado un recurso de grupo (con id), devuelve el grupo con 'members' garantizado,
    SIN perder campos como displayName. Se mergea sobre el objeto base.
    """
    base = dict(group) if isinstance(group, dict) else {}
    gid = (base.get("id") or "").strip()
    if not gid:
        base.setdefault("members", [])
        return base

    try:
        # Pedimos solo members para ser más livianos…
        only = scim_get_group_by_id(gid, attributes="members", timeout=timeout)
        members = only.get("members", [])
        base["members"] = members if isinstance(members, list) else []
        # Asegurar displayName si por algún motivo vino vacío
        if not base.get("displayName"):
            # Como fallback, intentar traer el objeto completo
            try:
                full = scim_get_group_by_id(gid, timeout=timeout)
                if full.get("displayName"):
                    base["displayName"] = full["displayName"]
            except Exception:
                pass
        return base
    except Exception:
        # Fallback: leer completo y asegurar members
        full = scim_get_group_by_id(gid, timeout=timeout)
        if "members" not in full:
            full["members"] = []
        return full


def scim_list_groups_page_with_members(
    *,
    start_index: int = 1,
    count: int = 100,
    max_workers: int = 8,
    timeout: int = 25,
) -> Dict[str, Any]:
    """
    Devuelve **una página** de /Groups con `members` expandidos para cada grupo.
    Mucho más rápido/estable que traer los 10k+ de una sola.
    """
    base = scim_list_groups_page(start_index=start_index, count=count, timeout=timeout)
    resources = list(base.get("Resources", []) or [])
    if not resources:
        return {
            "Resources": [],
            "totalResults": int(base.get("totalResults") or 0),
            "itemsPerPage": int(base.get("itemsPerPage") or 0),
            "startIndex": int(base.get("startIndex") or start_index),
        }

    out: List[Dict[str, Any]] = []
    workers = max(1, min(max_workers, len(resources)))
    with futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(_expand_group_members, g, timeout) for g in resources]
        for f in futures.as_completed(futs):
            try:
                out.append(f.result())
            except Exception:
                out.append({"members": []})

    return {
        "Resources": out,
        "totalResults": int(base.get("totalResults") or len(out)),
        "itemsPerPage": int(base.get("itemsPerPage") or len(out)),
        "startIndex": int(base.get("startIndex") or start_index),
    }


def scim_list_all_groups_with_members(
    *,
    page_size: int = 200,
    max_workers: int = 16,
    timeout: int = 25
) -> Dict[str, Any]:
    """
    Recorre **todas** las páginas y expande `members`. Úsalo solo cuando realmente sea necesario.
    """
    if page_size < 1 or page_size > 1000:
        page_size = 200
    if max_workers < 1:
        max_workers = 1
    if max_workers > 32:
        max_workers = 32

    first = scim_list_groups_page(start_index=1, count=page_size, timeout=timeout)
    total = int(first.get("totalResults", 0)) if isinstance(first, dict) else 0
    resources = list(first.get("Resources", []) or [])

    next_index = 1 + page_size
    while next_index <= total:
        pg = scim_list_groups_page(start_index=next_index, count=page_size, timeout=timeout)
        resources.extend(pg.get("Resources", []) or [])
        next_index += page_size

    out_resources: List[Dict[str, Any]] = []
    if not resources:
        return {"Resources": [], "totalResults": 0, "itemsPerPage": page_size, "startIndex": 1}

    with futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = [pool.submit(_expand_group_members, g, timeout) for g in resources]
        for f in futures.as_completed(futs):
            try:
                out_resources.append(f.result())
            except Exception:
                out_resources.append({"members": []})

    return {
        "Resources": out_resources,
        "totalResults": len(out_resources),
        "itemsPerPage": page_size,
        "startIndex": 1,
    }


# ==================== Crear / Borrar ====================

def scim_create_group(
    group_name: str,
    member_ids: Optional[List[str]] = None,
    *,
    timeout: int = 30,
) -> Dict[str, Any]:
    url = f"{_base_scim_url()}/Groups"

    ids = _resolve_user_ids(member_ids, timeout=timeout)

    norm_ids: List[str] = []
    if ids:
        seen = set()
        for m in ids:
            v = (m or "").strip()
            if v and v not in seen:
                seen.add(v)
                norm_ids.append(v)

    payload: Dict[str, Any] = {
        "displayName": group_name,
        "meta": {"resourceType": "Group"},
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    }
    if norm_ids:
        payload["members"] = [{"value": mid} for mid in norm_ids]

    resp = requests.post(url, headers=_scim_headers(), json=payload, timeout=timeout)
    if resp.status_code not in (200, 201):
        raise Exception(f"Error {resp.status_code} al crear grupo: {resp.text}")
    return resp.json()


def scim_delete_group(group_id: Optional[str] = None, name: Optional[str] = None, *, timeout: int = 25) -> Dict[str, Any]:
    _id = (group_id or "").strip()
    if not _id:
        if not name:
            raise ValueError("Debes proporcionar 'group_id' o 'name'")
        found = scim_get_group_by_name(name, with_members=False, timeout=timeout)
        if not found:
            raise LookupError(f"No se encontró grupo con displayName '{name}'")
        _id = found.get("id")
        if not _id:
            raise Exception("La respuesta del grupo no contiene 'id'")

    url = f"{_base_scim_url()}/Groups/{_id}"
    resp = requests.delete(url, headers=_scim_headers(), timeout=timeout)
    if resp.status_code not in (200, 204):
        raise Exception(f"Error {resp.status_code} al eliminar grupo {_id}: {resp.text}")
    return {"status_code": resp.status_code, "id": _id}


# ==================== Patch (editar) ====================

def _resolve_group_id(group_id: Optional[str], name: Optional[str], *, timeout: int) -> str:
    gid = (group_id or "").strip()
    if gid:
        return gid
    if not name:
        raise ValueError("Debes enviar 'group_id' o 'name' (displayName)")
    found = scim_get_group_by_name(name, with_members=False, timeout=timeout)
    if not found:
        raise LookupError(f"No se encontró grupo con displayName '{name}'")
    gid = (found.get("id") or "").strip()
    if not gid:
        raise Exception("La respuesta del grupo no contiene 'id'")
    return gid


def scim_patch_group(
    *,
    group_id: Optional[str] = None,
    name: Optional[str] = None,
    add_member_ids: Optional[List[str]] = None,
    remove_member_ids: Optional[List[str]] = None,
    add_members: Optional[List[str]] = None,
    remove_members: Optional[List[str]] = None,
    new_display_name: Optional[str] = None,
    timeout: int = 30,
) -> Dict[str, Any]:
    gid = _resolve_group_id(group_id, name, timeout=timeout)

    add_ids_resolved    = set(_resolve_user_ids(add_members,    timeout=timeout))
    remove_ids_resolved = set(_resolve_user_ids(remove_members, timeout=timeout))

    if add_member_ids:
        add_ids_resolved.update([v.strip() for v in add_member_ids if (v or "").strip()])
    if remove_member_ids:
        remove_ids_resolved.update([v.strip() for v in remove_member_ids if (v or "").strip()])

    ops: List[Dict[str, Any]] = []

    if new_display_name and new_display_name.strip():
        ops.append({"op": "replace", "path": "displayName", "value": new_display_name.strip()})

    if add_ids_resolved:
        ops.append({"op": "add", "path": "members", "value": [{"value": x} for x in sorted(add_ids_resolved)]})

    if remove_ids_resolved:
        for mid in sorted(remove_ids_resolved):
            ops.append({"op": "remove", "path": f'members[value eq "{mid}"]'})

    if not ops:
        raise ValueError("No hay cambios para aplicar (add/remove/new_display_name)")

    payload = {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        "Operations": ops,
    }

    url = f"{_base_scim_url()}/Groups/{gid}"
    r = requests.patch(url, headers=_scim_headers(), json=payload, timeout=timeout)
    if r.status_code not in (200, 204):
        raise Exception(f"Error {r.status_code} al hacer PATCH del grupo {gid}: {r.text}")
    try:
        return r.json()
    except Exception:
        return {"status_code": r.status_code, "id": gid}


def scim_remove_user_from_group(
    *,
    member: str,
    group_id: Optional[str] = None,
    name: Optional[str] = None,
    timeout: int = 25,
) -> Dict[str, Any]:
    uid = _find_user_id(member, timeout=timeout)
    if not uid:
        raise LookupError(f"No se pudo resolver el usuario '{member}' a un ID SCIM")
    return scim_patch_group(
        group_id=group_id,
        name=name,
        remove_member_ids=[uid],
        timeout=timeout,
    )