export type GroupType = {
  id: string;
  displayName: string;
  members?: { value: string; display: string }[];
};

const BASE_URL = "http://localhost:8001/Gamma/groups";

export async function fetchGroupsService(): Promise<GroupType[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error cargando grupos");
  const data = await res.json();

  return data.Resources.map((g: any) => ({
    id: g.id,
    displayName: g.displayName,
    members: g.members || [],
  }));
}

export async function createGroupService(displayName: string, members: string[]) {
  const params = new URLSearchParams();
  params.append("group_name", displayName);

  if (members.length > 0) {
    members.forEach((m) => params.append("members", m.trim()));
  }

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Error creando grupo");
}

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

  if (addMembers.length > 0) {
    addMembers.forEach((m) => params.append("add_members", m.trim()));
  }

  if (removeMembers.length > 0) {
    removeMembers.forEach((m) => params.append("remove_members", m.trim()));
  }

  const res = await fetch(`${BASE_URL}/patch?${params.toString()}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Error actualizando grupo");
}

export async function deleteGroupService(group: GroupType) {
  const params = new URLSearchParams();
  if (group.id) params.append("group_id", group.id);
  else params.append("name", group.displayName);

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error eliminando grupo");
}