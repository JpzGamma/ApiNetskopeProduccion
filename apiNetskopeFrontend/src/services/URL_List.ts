import api from "./api";

/* ===================== Tipos ===================== */

export type URLListType = {
  id: number;
  name: string;
  data: {
    type: "exact" | "regex";
    urls: string[];
    json_version?: number;
  };
  modify_by: string;
  modify_time: string;
  modify_type: string;
  pending: number;
};

export type BatchResultItem = {
  id: number;
  type: "exact" | "regex";
  status: "ok" | "error" | "skipped";
  sent?: number;
  error?: string;
  reason?: string;
  result?: unknown;
};

export type BatchResponse = {
  action: "append" | "replace";
  targets: number[];
  not_found_names: string[];
  accepted: {
    exact: string[];
    wildcard_as_exact: string[];
    regex: string[];
  };
  rejected: string[];
  results: BatchResultItem[];
  deploy?: unknown;
  deploy_error?: string;
};

export type CreateUrlListResponse = {
  create: {
    created: {
      id: number;
      name: string;
      data: { type: "exact" | "regex"; urls: string[]; json_version?: number };
      modify_by?: string;
      modify_time?: string;
      modify_type?: string;
      pending?: number;
    };
    type_used: "exact" | "regex";
    sent: number;
    rejected: string[];
  };
  deploy?: unknown;
  deploy_error?: string;
};

export type PutUrlListResponse = {
  put: {
    put: unknown;
    accepted: { exact: string[]; wildcard_as_exact: string[]; regex: string[] };
    rejected: string[];
    type_used: "exact" | "regex";
    sent: number;
  };
  deploy?: unknown;
  deploy_error?: string;
};

/* ===================== Queries ===================== */

export async function fetchUrlLists(): Promise<URLListType[]> {
  const { data } = await api.get<URLListType[]>("/Gamma/url-lists");
  return data;
}

export async function fetchUrlCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/Gamma/url-lists/count");
  return data.count;
}

/* ========== Batch (append/replace) ========== */
export async function batchUpdateUrlLists(
  actionType: "append" | "replace",
  idsOrNames: string,
  urlsInput: string,
  allowRegex: boolean
): Promise<BatchResponse> {
  const ids: string[] = [];
  const names: string[] = [];

  idsOrNames
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((entry) => {
      if (/^\d+$/.test(entry)) ids.push(entry);
      else names.push(entry);
    });

  const urlsArray = urlsInput
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const params: Record<string, string> = {};
  if (ids.length) params.ids = ids.join(",");
  if (names.length) params.names = names.join(",");
  if (allowRegex) params.allow_regex = "true";

  const { data } = await api.patch<BatchResponse>(
    `/Gamma/url-lists/_batch/${actionType}`,
    urlsArray,
    { params }
  );

  return data;
}

/* ===================== Delete ===================== */

export async function deleteUrlListById(listId: number): Promise<void> {
  await api.delete(`/Gamma/url-lists/${listId}`);
}

export async function deleteUrlListByName(name: string): Promise<void> {
  await api.delete(`/Gamma/url-lists/by-name`, { params: { name } });
}

/* ===================== Create ===================== */
export async function createUrlList(
  newName: string,
  newUrls: string,
  newAllowRegex: boolean
): Promise<CreateUrlListResponse> {
  const urlsArray = newUrls
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  if (!newName.trim()) throw new Error("El nombre es obligatorio.");
  if (urlsArray.length === 0) throw new Error("Debes ingresar al menos una URL.");

  const { data } = await api.post<CreateUrlListResponse>(
    "/Gamma/url-lists",
    { name: newName.trim(), urls: urlsArray, allow_regex: newAllowRegex }
  );

  return data;
}

/* ===================== PUT (editar nombre + reemplazar URLs) ===================== */
export async function putUrlListById(
  id: number,
  name: string | undefined,
  combinedUrls: string[],             // URLs finales (existentes - borradas + nuevas)
  allowRegex: boolean
): Promise<PutUrlListResponse> {
  if (!combinedUrls.length) throw new Error("Debes enviar al menos una URL.");
  const payload: any = { urls: combinedUrls, allow_regex: allowRegex };
  if (name && name.trim()) payload.name = name.trim();

  const { data } = await api.put<PutUrlListResponse>(`/Gamma/url-lists/${id}`, payload);
  return data;
}