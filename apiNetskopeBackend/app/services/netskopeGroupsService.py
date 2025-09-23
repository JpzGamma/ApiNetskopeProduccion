from __future__ import annotations

from typing import List, Optional, Dict, Any, Tuple
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import settings


# ==================== Helpers ====================

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


# ---------- Resolver de usuarios (username/email/id) -> ID ----------

def _find_user_id(identifier: str, *, timeout: int = 25) -> Optional[str]:
    ident = (identifier or "").strip()
    if not ident:
        return None

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


# ==================== Lectura base ====================

def scim_list_groups(*, start_index: int = 1, count: int = 100, timeout: int = 25) -> Dict[str, Any]:
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
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    url = f"{_base_scim_url()}/Groups/{group_id}"
    params: Dict[str, str] = {}
    if attributes:
        params["attributes"] = attributes
    if excluded_attributes:
        params["excludedAttributes"] = excluded_attributes

    sess = session or requests
    r = sess.get(url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al leer grupo {group_id}: {r.text}")
    return r.json()


def scim_get_group_by_name(name: str, *, timeout: int = 25) -> Optional[Dict[str, Any]]:
    list_url = f"{_base_scim_url()}/Groups"
    params = {"filter": f'displayName eq "{name}"', "startIndex": 1, "count": 1}
    r = requests.get(list_url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al filtrar grupos: {r.text}")

    payload = r.json()
    gid = _first_resource_id(payload)
    if not gid:
        resources = payload.get("Resources", []) if isinstance(payload, dict) else []
        return resources[0] if resources else None
    return scim_get_group_by_id(gid, timeout=timeout)


def scim_get_group_by_name_with_members(name: str, *, timeout: int = 25) -> Optional[Dict[str, Any]]:
    list_url = f"{_base_scim_url()}/Groups"
    params = {"filter": f'displayName eq "{name}"', "startIndex": 1, "count": 1}
    r = requests.get(list_url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        raise Exception(f"Error {r.status_code} al filtrar grupos: {r.text}")

    payload = r.json()
    gid = _first_resource_id(payload)
    if not gid:
        resources = payload.get("Resources", []) if isinstance(payload, dict) else []
        if resources:
            g = dict(resources[0])
            g.setdefault("members", [])
            return g
        return None
    try:
        return scim_get_group_by_id(gid, attributes="members", timeout=timeout)
    except Exception:
        g = scim_get_group_by_id(gid, timeout=timeout)
        g.setdefault("members", [])
        return g


# ==================== Listado con MEMBERS optimizado ====================

def _list_groups_try_expand_members_fast(
    *,
    start_index: int,
    count: int,
    timeout: int
) -> Tuple[bool, Dict[str, Any]]:
    """
    Primer intento: pedir /Groups con attributes=id,displayName,members
    Si ya viene 'members' en los Resources -> éxito (True, payload).
    Si no (o el tenant no soporta attributes) -> False, payload_base.
    """
    url = f"{_base_scim_url()}/Groups"
    params = {
        "startIndex": start_index,
        "count": count,
        # pedir solo lo que necesitamos para bajar payload
        "attributes": "id,displayName,members",
    }
    r = requests.get(url, headers=_scim_headers(), params=params, timeout=timeout)
    if r.status_code != 200:
        # volvemos al listado normal
        return False, scim_list_groups(start_index=start_index, count=count, timeout=timeout)

    payload = r.json()
    resources = payload.get("Resources", []) if isinstance(payload, dict) else []
    if not resources:
        return True, payload  # vacío pero válido

    # Si al menos un recurso trae el atributo members, asumimos que el tenant lo soporta
    has_members = any(isinstance(rc, dict) and "members" in rc for rc in resources)
    if has_members:
        # Aseguramos que todos tengan el atributo (aunque sea vacío)
        for rc in resources:
            if isinstance(rc, dict) and "members" not in rc:
                rc["members"] = []
        return True, payload

    # No trajo members -> no soporta attributes=members
    base = scim_list_groups(start_index=start_index, count=count, timeout=timeout)
    return False, base


def scim_list_groups_with_members(
    *,
    start_index: int = 1,
    count: int = 100,
    timeout: int = 25,
    max_workers: int = 8,
) -> Dict[str, Any]:
    """
    Devuelve /Groups con 'members' en cada Resource, optimizado:
      1) intenta /Groups?attributes=id,displayName,members
      2) si no trae members, hace GET /Groups/{id}?attributes=members en paralelo (hilo)
    """
    # Primer intento: traer todo con attributes
    ok, payload = _list_groups_try_expand_members_fast(
        start_index=start_index, count=count, timeout=timeout
    )
    if ok:
        return payload

    # Plan B: paralelizar por id
    resources = payload.get("Resources", []) if isinstance(payload, dict) else []
    out_resources: List[Dict[str, Any]] = []
    if not resources:
        payload["Resources"] = out_resources
        return payload

    # bounding de workers
    workers = max(1, min(int(max_workers), 32, len(resources)))

    headers = _scim_headers()
    with requests.Session() as session:
        session.headers.update(headers)
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {}
            for g in resources:
                gid = (g.get("id") or "").strip() if isinstance(g, dict) else ""
                if not gid:
                    gg = dict(g)
                    gg.setdefault("members", [])
                    out_resources.append(gg)
                    continue
                fut = pool.submit(
                    scim_get_group_by_id,
                    gid,
                    attributes="members",
                    timeout=timeout,
                    session=session,
                )
                futures[fut] = g

            for fut in as_completed(futures):
                base_group = futures[fut]
                try:
                    full = fut.result()
                    # nos quedamos con el objeto "full"
                    # (trae id/displayName + members)
                    full.setdefault("members", [])
                    out_resources.append(full)
                except Exception:
                    # si falla, devolvemos el base con members:[]
                    gg = dict(base_group)
                    gg.setdefault("members", [])
                    out_resources.append(gg)

    payload["Resources"] = out_resources
    return payload


# ==================== Crear / Borrar / Patch (sin cambios) ====================

def scim_create_group(group_name: str, member_ids: Optional[List[str]] = None, *, timeout: int = 30) -> Dict[str, Any]:
    url = f"{_base_scim_url()}/Groups"

    norm_ids: List[str] = []
    if member_ids:
        seen = set()
        for m in member_ids:
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


def scim_create_group_with_members(
    group_name: str,
    members: Optional[List[str]] = None,
    *,
    timeout: int = 30,
) -> Dict[str, Any]:
    ids = _resolve_user_ids(members, timeout=timeout)
    return scim_create_group(group_name, member_ids=ids, timeout=timeout)


def scim_delete_group(group_id: Optional[str] = None, name: Optional[str] = None, *, timeout: int = 25) -> Dict[str, Any]:
    _id = (group_id or "").strip()
    if not _id:
        if not name:
            raise ValueError("Debes proporcionar 'group_id' o 'name'")
        found = scim_get_group_by_name(name, timeout=timeout)
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


def _resolve_group_id(group_id: Optional[str], name: Optional[str], *, timeout: int) -> str:
    gid = (group_id or "").strip()
    if gid:
        return gid
    if not name:
        raise ValueError("Debes enviar 'group_id' o 'name' (displayName)")
    found = scim_get_group_by_name(name, timeout=timeout)
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