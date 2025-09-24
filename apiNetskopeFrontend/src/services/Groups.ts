import api from "./api";

export type GroupType = {
  id: string;
  displayName: string;
  members: { value: string; display: string }[];
};

const BASE = "/Gamma/groups";

/** GET /Gamma/groups  — Devuelve todos los grupos con members */
export async function fetchGroupsService(): Promise<GroupType[]> {
  const { data } = await api.get<any>(BASE);

  const resources: any[] = Array.isArray(data?.Resources) ? data.Resources : [];

  return resources.map((g: any, idx: number) => {
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
        (typeof m?.$ref === "string" &&
          m.$ref.split("/").pop()) ||
        `${id}-member-${i}`,
      display:
        (typeof m?.display === "string" && m.display) ||
        (typeof m?.value === "string" && m.value) ||
        "—",
    }));

    return { id, displayName, members };
  });
}

/** POST /Gamma/groups?group_name=...&members=a&members=b */
export async function createGroupService(
  displayName: string,
  members: string[]
) {
  const params = new URLSearchParams();
  params.append("group_name", displayName);
  members
    .map((m) => m.trim())
    .filter(Boolean)
    .forEach((m) => params.append("members", m));

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

  addMembers
    .map((m) => m.trim())
    .filter(Boolean)
    .forEach((m) => params.append("add_members", m));

  removeMembers
    .map((m) => m.trim())
    .filter(Boolean)
    .forEach((m) => params.append("remove_members", m));

  await api.patch(`${BASE}/patch?${params.toString()}`);
}

/** DELETE /Gamma/groups?group_id=... | name=... */
export async function deleteGroupService(group: GroupType) {
  const params = new URLSearchParams();
  if (group.id) params.append("group_id", group.id);
  else params.append("name", group.displayName);

  await api.delete(`${BASE}?${params.toString()}`);
}