export type UserType = {
  id: string;
  userName: string;
  email: string;
  given_name?: string;
  family_name?: string;
  external_id?: string;
  active?: boolean;
  lastModified?: string;
};

const BASE_URL = "http://localhost:8001/Gamma/users";

export async function fetchUsers(): Promise<UserType[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error cargando usuarios");
  const data = await res.json();

  return data.Resources.map((u: any) => ({
    id: u.id,
    userName: u.userName,
    email: u.emails?.[0]?.value || "",
    given_name: u.name?.givenName || "",
    family_name: u.name?.familyName || "",
    external_id: u.externalId || "",
    active: u.active,
    lastModified: u.meta?.lastModified,
  }));
}

export async function createUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  params.append("user_name", user.userName);
  params.append("email", user.email);
  if (user.given_name) params.append("given_name", user.given_name);
  if (user.family_name) params.append("family_name", user.family_name);
  if (user.external_id) params.append("external_id", user.external_id);
  if (user.active !== undefined) params.append("active", String(user.active));

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Error creando usuario");
}

export async function updateUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  if (user.id) params.append("user_id", user.id);
  else params.append("user_name", user.userName);

  if (user.email) params.append("email", user.email);
  if (user.given_name) params.append("given_name", user.given_name);
  if (user.family_name) params.append("family_name", user.family_name);
  if (user.external_id) params.append("external_id", user.external_id);
  if (user.active !== undefined) params.append("active", String(user.active));

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error("Error actualizando usuario");
}

export async function deleteUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  if (user.id) params.append("user_id", user.id);
  else params.append("user_name", user.userName);

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error eliminando usuario");
}