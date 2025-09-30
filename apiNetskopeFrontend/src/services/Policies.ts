// services/Policies.ts
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
  raw?: any; // Por si necesitas el payload completo original
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
    enabled: typeof obj?.enabled === "string" || typeof obj?.enabled === "number"
      ? String(obj.enabled) as "0" | "1"
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
  group_name?: string;
  enabled?: "0" | "1";
  users?: string[];
  access_method?: AccessMethod;
  action_name?: PolicyAction;
  privateApps?: string[];
  privateAppTags?: string[];
}): Promise<PolicyRule> {
  const qp: any = {};
  if (params.rule_name) qp.rule_name = params.rule_name;
  if (params.group_name) qp.group_name = params.group_name;
  if (params.enabled) qp.enabled = params.enabled;
  if (params.users && params.users.length) qp.users = params.users;
  if (params.access_method) qp.access_method = params.access_method;
  if (params.action_name) qp.action_name = params.action_name;
  if (params.privateApps && params.privateApps.length) qp.private_apps = params.privateApps;
  if (params.privateAppTags && params.privateAppTags.length) qp.private_app_tags = params.privateAppTags;

  // El router del backend usa Query params y body vacío
  const { data } = await api.post<any>("/Gamma/policies/rules", null, { params: qp });
  return normalizePolicy(data?.data ?? data);
}

export async function updatePolicy(
  policyId: string,
  params: {
    rule_name?: string;
    group_name?: string;
    enabled?: "0" | "1";
    users?: string[];
    access_method?: AccessMethod;
    action_name?: PolicyAction;
    privateApps?: string[];
    privateAppTags?: string[];
  }
): Promise<PolicyRule> {
  const qp: any = {};
  if (params.rule_name) qp.rule_name = params.rule_name;
  if (params.group_name) qp.group_name = params.group_name;
  if (params.enabled) qp.enabled = params.enabled;
  if (params.users && params.users.length) qp.users = params.users;
  if (params.access_method) qp.access_method = params.access_method;
  if (params.action_name) qp.action_name = params.action_name;
  if (params.privateApps && params.privateApps.length) qp.private_apps = params.privateApps;
  if (params.privateAppTags && params.privateAppTags.length) qp.private_app_tags = params.privateAppTags;

  const { data } = await api.patch<any>(`/Gamma/policies/rules/${policyId}`, null, { params: qp });
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