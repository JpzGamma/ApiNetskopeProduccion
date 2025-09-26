import api from "./api";

export type GroupType = {
  id: string;
  displayName: string;
  members: { value: string; display: string }[];
};

export type FetchGroupsResponse = {
  groups: GroupType[];
  total: number;
  startIndex: number;
  itemsPerPage: number;
};

const BASE = "/Gamma/groups";

/** Normaliza un objeto de grupo a GroupType */
function normalizeGroup(g: any, idx: number): GroupType {
  const id: string =
    (typeof g?.id === "string" && g.id) ||
    (typeof g?.meta?.location === "string" &&
      g.meta.location.split("/").pop()) ||
    String(idx + 1);

  const displayNameRaw =
    (typeof g?.displayName === "string" && g.displayName) ||
    (typeof g?.displayname === "string" && g.displayname) ||
    "";

  const displayName = displayNameRaw.trim() || "(sin nombre)";

  const membersArr: any[] = Array.isArray(g?.members) ? g.members : [];
  const members = membersArr.map((m: any, i: number) => ({
    value:
      (typeof m?.value === "string" && m.value) ||
      (typeof m?.$ref === "string" && m.$ref.split("/").pop()) ||
      `${id}-member-${i}`,
    display:
      (typeof m?.display === "string" && m.display) ||
      (typeof m?.value === "string" && m.value) ||
      "—",
  }));

  return { id, displayName, members };
}

/**
 * GET /Gamma/groups
 * - Si opts.name está presente: busca un solo grupo por displayName (backend devuelve objeto)
 * - Si no: lista paginada normal (backend devuelve ListResponse con Resources)
 */
export async function fetchGroupsService(
  opts: { startIndex?: number; count?: number; all?: boolean; name?: string } = {}
): Promise<FetchGroupsResponse> {
  // BÚSQUEDA EXACTA (se usará solo si tú lo disparas con Enter)
  if (opts.name && opts.name.trim()) {
    const params = new URLSearchParams();
    params.set("name", opts.name.trim());
    const { data } = await api.get<any>(`${BASE}?${params.toString()}`);
    const one = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const groups: GroupType[] = one?.displayName ? [normalizeGroup(one, 0)] : [];
    return { groups, total: groups.length, startIndex: 1, itemsPerPage: groups.length };
  }

  // LISTADO PAGINADO
  const params = new URLSearchParams();
  params.set("start_index", String(opts.startIndex ?? 1));
  params.set("count", String(opts.count ?? 100));
  if (opts.all) params.set("all", "true");

  const { data } = await api.get<any>(`${BASE}?${params.toString()}`);
  const resources: any[] = Array.isArray(data?.Resources) ? data.Resources : [];
  const groups: GroupType[] = resources.map((g: any, idx: number) => normalizeGroup(g, idx));

  return {
    groups,
    total: Number(data.totalResults ?? groups.length),
    startIndex: Number(data.startIndex ?? 1),
    itemsPerPage: Number(data.itemsPerPage ?? groups.length),
  };
}

/** POST /Gamma/groups?group_name=...&members=a&members=b */
export async function createGroupService(displayName: string, members: string[]) {
  const params = new URLSearchParams();
  params.append("group_name", displayName);
  members.map((m) => m.trim()).filter(Boolean).forEach((m) => params.append("members", m));
  await api.post(`${BASE}?${params.toString()}`);
}

/** PATCH /Gamma/groups/patch?... */
export async function updateGroupService(
  id: string | undefined,
  displayName: string,
  newDisplayName?: string,
  addMembers: string[] = [],
  removeMembers: string[] = []
) {
  const params = new URLSearchParams();
  if (id) params.append("group_id", id);
  else params.append("name", displayName);

  if (newDisplayName) params.append("new_display_name", newDisplayName);
  addMembers.map((m) => m.trim()).filter(Boolean).forEach((m) => params.append("add_members", m));
  removeMembers.map((m) => m.trim()).filter(Boolean).forEach((m) => params.append("remove_members", m));
  await api.patch(`${BASE}/patch?${params.toString()}`);
}

/** DELETE /Gamma/groups?group_id=... | name=... */
export async function deleteGroupService(group: GroupType) {
  const params = new URLSearchParams();
  if (group.id) params.append("group_id", group.id);
  else params.append("name", group.displayName);
  await api.delete(`${BASE}?${params.toString()}`);
}