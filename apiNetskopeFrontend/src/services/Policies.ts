// src/services/Policies.ts
import api from "./api";

/* ===================== Tipos normalizados ===================== */

export type PolicyAction = "allow" | "block";
export type AccessMethod = "Client" | "Browser";

export type PolicyRule = {
  id: string;
  rule_name: string;
  group_id?: string;
  group_name?: string;
  enabled?: "0" | "1";
  action_name?: PolicyAction;
  access_method?: AccessMethod[];
  users?: string[];
  privateApps?: string[];
  privateAppTags?: string[];
  raw?: any; // payload original por si se requiere
};

export type PolicyGroup = {
  id: string;
  name: string;
  description?: string;
  raw?: any;
};

function normalizePolicy(obj: any): PolicyRule {
  const rd = obj?.rule_data ?? obj?.data ?? {};
  const mca = rd?.match_criteria_action ?? {};
  const access = rd?.access_method;

  return {
    id: String(obj?.id ?? obj?.rule_id ?? obj?.uuid ?? ""),
    rule_name: String(obj?.rule_name ?? obj?.name ?? "(sin nombre)"),
    group_id: obj?.group_id ? String(obj.group_id) : undefined,
    group_name: obj?.group_name ?? undefined,
    enabled:
      typeof obj?.enabled === "string" || typeof obj?.enabled === "number"
        ? (String(obj.enabled) as "0" | "1")
        : undefined,
    action_name: mca?.action_name as PolicyAction | undefined,
    access_method: Array.isArray(access) ? (access as AccessMethod[]) : undefined,
    users: Array.isArray(rd?.users) ? rd.users : [],
    privateApps: Array.isArray(rd?.privateApps) ? rd.privateApps : [],
    privateAppTags: Array.isArray(rd?.privateAppTags) ? rd.privateAppTags : [],
    raw: obj,
  };
}

function normalizeGroup(obj: any): PolicyGroup {
  return {
    id: String(obj?.id ?? obj?.group_id ?? ""),
    name: String(obj?.name ?? obj?.group_name ?? "(sin nombre)"),
    description: obj?.description ?? undefined,
    raw: obj,
  };
}

/* ===================== Helpers ===================== */

// Serializa como claves repetidas (users=a&users=b). Además permite pasar flags de "clear".
function toSearchParams(obj: Record<string, any>): URLSearchParams {
  const sp = new URLSearchParams();

  const appendList = (key: string, val?: any[] | null) => {
    if (!Array.isArray(val)) return;
    if (val.length === 0) {
      // Enviar flag para que el backend vacíe explícitamente esa lista.
      if (key === "private_apps") sp.append("clear_private_apps", "1");
      if (key === "private_app_tags") sp.append("clear_private_app_tags", "1");
      if (key === "users") sp.append("clear_users", "1"); // por consistencia, por si algún día quieres vaciar usuarios
      return;
    }
    val.forEach((v) => {
      if (v !== undefined && v !== null && String(v).length) sp.append(key, String(v));
    });
  };

  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      appendList(k, v);
    } else {
      sp.append(k, String(v));
    }
  });

  return sp;
}

/* ===================== Policies: CRUD ===================== */

export async function fetchPolicies(): Promise<PolicyRule[]> {
  const { data } = await api.get<any>("/Gamma/policies/rules");
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr.map(normalizePolicy);
}

export async function getPolicyById(policyId: string): Promise<PolicyRule> {
  const { data } = await api.get<any>(`/Gamma/policies/rules/${policyId}`);
  return normalizePolicy(data?.data ?? data);
}

export async function createPolicy(params: {
  rule_name?: string;
  group_name?: string; // el backend espera group_name
  enabled?: "0" | "1";
  users?: string[];
  access_method?: AccessMethod; // valor único; el router lo mete en array
  action_name?: PolicyAction;
  privateApps?: string[];
  privateAppTags?: string[];
}): Promise<PolicyRule> {
  const qp = toSearchParams({
    rule_name: params.rule_name,
    group_name: params.group_name,
    enabled: params.enabled,
    users: params.users, // claves repetidas / clear_users si []
    access_method: params.access_method,
    action_name: params.action_name,
    private_apps: params.privateApps, // claves repetidas / clear_private_apps si []
    private_app_tags: params.privateAppTags, // claves repetidas / clear_private_app_tags si []
  });

  const { data } = await api.post<any>("/Gamma/policies/rules", null, {
    params: qp,
    paramsSerializer: (p) => (p instanceof URLSearchParams ? p.toString() : ""),
  });
  return normalizePolicy(data?.data ?? data);
}

export async function updatePolicy(
  policyId: string,
  params: {
    rule_name?: string;
    group_name?: string; // el backend espera group_name
    enabled?: "0" | "1";
    users?: string[];
    access_method?: AccessMethod;
    action_name?: PolicyAction;
    privateApps?: string[];
    privateAppTags?: string[];
  }
): Promise<PolicyRule> {
  const qp = toSearchParams({
    rule_name: params.rule_name,
    group_name: params.group_name,
    enabled: params.enabled,
    users: params.users,
    access_method: params.access_method,
    action_name: params.action_name,
    private_apps: params.privateApps,
    private_app_tags: params.privateAppTags,
  });

  const { data } = await api.patch<any>(`/Gamma/policies/rules/${policyId}`, null, {
    params: qp,
    paramsSerializer: (p) => (p instanceof URLSearchParams ? p.toString() : ""),
  });
  return normalizePolicy(data?.data ?? data);
}

export async function deletePolicy(policyId: string): Promise<void> {
  await api.delete(`/Gamma/policies/rules/${policyId}`);
}

/* ===================== Groups: list & get ===================== */

export async function fetchPolicyGroups(): Promise<PolicyGroup[]> {
  const { data } = await api.get<any>("/Policies/groups/");
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr.map(normalizeGroup);
}

export async function getPolicyGroupById(groupId: string | number): Promise<PolicyGroup> {
  const { data } = await api.get<any>(`/Policies/groups/${groupId}`);
  return normalizeGroup(data?.data ?? data);
}