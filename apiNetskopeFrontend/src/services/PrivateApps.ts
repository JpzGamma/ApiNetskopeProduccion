// src/services/PrivateApps.ts
import api from "./api";

// -------------------- Types --------------------
export type PublisherType = {
  publisher_id: number;
  publisher_name: string;
};

export type ProtocolType = {
  transport?: "tcp" | "udp";
  type?: "tcp" | "udp";
  port: string;
};

export type PrivateAppType = {
  app_id: number;
  app_name: string;
  host: string;
  protocols: ProtocolType[];
  publishers?: PublisherType[];
  tags?: (string | { name?: string; label?: string })[];
  labels?: (string | { name?: string })[];
  usePublisherDns?: boolean;
};

// -------------------- Base --------------------
const BASE = "/Gamma/private-apps";
const BASE_PUBLISHERS = "/Gamma/publishers";

// -------------------- Publishers --------------------
export async function fetchPublishersService(): Promise<PublisherType[]> {
  const { data } = await api.get<any>(BASE_PUBLISHERS);
  return data.data?.publishers || [];
}

// -------------------- Private Apps --------------------
export async function fetchPrivateAppsService(): Promise<PrivateAppType[]> {
  const { data } = await api.get<any>(BASE);
  const rawApps: any[] = data.data?.private_apps || [];

  return rawApps.map((app: any) => {
    const tagsRaw = app.tags || app.labels || [];
    const normalizeTag = (t: any) =>
      typeof t === "string"
        ? t
        : t?.tag_name || t?.name || t?.label || (t?.value ? String(t.value) : null);

    return {
      ...app,
      publishers: app.publishers || app.service_publisher_assignments || [],
      tags: Array.isArray(tagsRaw) ? tagsRaw.map(normalizeTag).filter(Boolean) : [],
      protocols:
        Array.isArray(app.protocols) && app.protocols.length > 0
          ? app.protocols.map((p: any) => ({ transport: p.transport || p.type, port: String(p.port) }))
          : [],
    } as PrivateAppType;
  });
}

export async function fetchPrivateAppByIdService(appId: number): Promise<PrivateAppType> {
  const { data } = await api.get<any>(`${BASE}/${appId}`);
  const d = data?.data || {};
  const tagsRaw = d.tags || d.labels || [];
  const normalizeTag = (t: any) =>
    typeof t === "string"
      ? t
      : t?.tag_name || t?.name || t?.label || (t?.value ? String(t.value) : null);

  return {
    ...d,
    publishers: d.publishers || d.service_publisher_assignments || [],
    tags: Array.isArray(tagsRaw) ? tagsRaw.map(normalizeTag).filter(Boolean) : [],
    protocols:
      Array.isArray(d.protocols) && d.protocols.length > 0
        ? d.protocols.map((p: any) => ({ transport: p.transport || p.type, port: String(p.port) }))
        : [],
  } as PrivateAppType;
}

// -------------------- Create / Update / Delete --------------------
export async function createPrivateAppService(app: Partial<PrivateAppType>) {
  const payload: any = {
    app_name: app.app_name,
    host: app.host,
    protocols:
      app.protocols?.map((p) => ({
        type: (p.transport || p.type || "tcp").toLowerCase(),
        port: String(p.port || ""),
      })) || [],
    publishers: app.publishers?.map((p) => ({ publisher_id: p.publisher_id, publisher_name: p.publisher_name })) || [],
    tags: app.tags || [],
    usePublisherDns: !!app.usePublisherDns,
  };

  await api.post(BASE, payload);
}

export async function updatePrivateAppService(appId: number, app: Partial<PrivateAppType>) {
  const payload: any = {
    app_name: app.app_name,
    host: app.host,
    protocols:
      app.protocols?.map((p) => ({
        type: (p.transport || p.type || "tcp").toLowerCase(),
        port: String(p.port || ""),
      })) || [],
    publishers: app.publishers?.map((p) => ({ publisher_id: p.publisher_id, publisher_name: p.publisher_name })) || [],
    tags: app.tags || [],
    usePublisherDns: !!app.usePublisherDns,
  };

  await api.patch(`${BASE}/${appId}`, payload);
}

export async function deletePrivateAppService(appId: number) {
  await api.delete(`${BASE}/${appId}`);
}

// -------------------- Bulk --------------------
export async function bulkCreatePrivateAppsService(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  await api.post(`${BASE}/_bulk`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

// -------------------- Policies Integration --------------------

/**
 * Crea una Policy Rule para una app.
 * Asegura que se envíen correctamente users, access_method, match_criteria_action y privateApps
 */
export async function createPolicyRuleForApp(rule_name: string, action_name: string, extra?: any) {
  const payload = {
    rule_name: rule_name || "default-rule",
    group_name: extra?.group_name || "My policy group",
    enabled: extra?.enabled ? "1" : "0",
    rule_data: {
      users: extra?.users || [],
      access_method: extra?.access_method ? [extra.access_method] : ["Client"],
      match_criteria_action: { action_name: action_name || "allow" },
      privateApps: extra?.private_apps || extra?.privateApps || [],
      destination_type: extra?.destination_type || "",
    },  
  };

  return payload;

}

