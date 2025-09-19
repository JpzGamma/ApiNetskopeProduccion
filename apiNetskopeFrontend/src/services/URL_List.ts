// services/URL_List.ts
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

/* ===================== Queries ===================== */

export async function fetchUrlLists(): Promise<URLListType[]> {
  const { data } = await api.get<URLListType[]>("/Gamma/url-lists");
  return data;
}

export async function fetchUrlCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/Gamma/url-lists/count");
  return data.count;
}

/* ========== Batch (append/replace, deploy en backend) ========== */
/**
 * idsOrNames: coma-separado. Números => IDs, otros => nombres.
 * urlsInput : texto multilinea, una entrada por línea.
 * allowRegex: si true, también enviará entradas detectadas como regex (solo a listas tipo regex).
 */
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
    urlsArray, // body: array plano de strings
    { params }
  );

  return data;
}

/* ===================== Delete (deploy auto en backend) ===================== */

export async function deleteUrlListById(listId: number): Promise<void> {
  await api.delete(`/Gamma/url-lists/${listId}`);
}

export async function deleteUrlListByName(name: string): Promise<void> {
  await api.delete(`/Gamma/url-lists/by-name`, { params: { name } });
}

/* ===================== Create (deploy auto en backend) ===================== */
/**
 * Crea una URL List con nombre y un set inicial de URLs (no puede estar vacía).
 * newAllowRegex: si true, permite que el backend bucketice regex cuando corresponda.
 */
export async function createUrlList(
  newName: string,
  newUrls: string,
  newAllowRegex: boolean
): Promise<CreateUrlListResponse> {
  const urlsArray = newUrls
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  // Validación rápida en cliente (evita llamadas vacías)
  if (!newName.trim()) {
    throw new Error("El nombre es obligatorio.");
  }
  if (urlsArray.length === 0) {
    throw new Error("Debes ingresar al menos una URL.");
  }

  const { data } = await api.post<CreateUrlListResponse>(
    "/Gamma/url-lists",
    {
      name: newName.trim(),
      urls: urlsArray,
      allow_regex: newAllowRegex,
    }
  );

  return data;
}