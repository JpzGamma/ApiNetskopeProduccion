// services/URL_List.ts
export type URLListType = {
  id: number;
  name: string;
  data: {
    type: string;
    urls: string[];
    json_version: number;
  };
  modify_by: string;
  modify_time: string;
  modify_type: string;
  pending: number;
};

// Obtener todas las listas
export async function fetchUrlLists(): Promise<URLListType[]> {
  const res = await fetch("http://localhost:8001/Gamma/url-lists");
  if (!res.ok) throw new Error("Error al cargar URL Lists");
  return await res.json();
}

// Obtener conteo total de URLs
export async function fetchUrlCount(): Promise<number> {
  const res = await fetch("http://localhost:8001/Gamma/url-lists/count");
  if (!res.ok) throw new Error("Error al cargar conteo");
  const { count } = await res.json();
  return count;
}

// Ejecutar acción masiva (append o replace)
export async function batchUpdateUrlLists(
  actionType: "append" | "replace",
  idsOrNames: string,
  urlsInput: string
): Promise<void> {
  const ids: string[] = [];
  const names: string[] = [];

  idsOrNames
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean)
    .forEach((entry) => {
      if (/^\d+$/.test(entry)) {
        ids.push(entry);
      } else {
        names.push(entry);
      }
    });

  const urlsArray = urlsInput
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const params = new URLSearchParams();
  if (ids.length > 0) params.append("ids", ids.join(","));
  if (names.length > 0) params.append("names", names.join(","));

  const url = `http://localhost:8001/Gamma/url-lists/_batch/${actionType}?${params.toString()}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(urlsArray),
  });

  if (!response.ok) throw new Error("Error en la actualización");
}