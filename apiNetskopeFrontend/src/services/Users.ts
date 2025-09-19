import api from "./api";

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

const BASE = "/Gamma/users";

/** GET /Gamma/users */
export async function fetchUsers(): Promise<UserType[]> {
  const { data } = await api.get<any>(BASE);

  return (data.Resources || []).map((u: any) => ({
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

/** POST /Gamma/users?user_name=...&email=...&... */
export async function createUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  params.append("user_name", user.userName);
  params.append("email", user.email);
  if (user.given_name) params.append("given_name", user.given_name);
  if (user.family_name) params.append("family_name", user.family_name);
  if (user.external_id) params.append("external_id", user.external_id);
  if (user.active !== undefined) params.append("active", String(user.active));

  await api.post(`${BASE}?${params.toString()}`);
}

/** PUT /Gamma/users?user_id|user_name=...&email=... */
export async function updateUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  if (user.id) params.append("user_id", user.id);
  else params.append("user_name", user.userName);

  if (user.email) params.append("email", user.email);
  if (user.given_name) params.append("given_name", user.given_name);
  if (user.family_name) params.append("family_name", user.family_name);
  if (user.external_id) params.append("external_id", user.external_id);
  if (user.active !== undefined) params.append("active", String(user.active));

  await api.put(`${BASE}?${params.toString()}`);
}

/** DELETE /Gamma/users?user_id|user_name=... */
export async function deleteUser(user: UserType): Promise<void> {
  const params = new URLSearchParams();
  if (user.id) params.append("user_id", user.id);
  else params.append("user_name", user.userName);

  await api.delete(`${BASE}?${params.toString()}`);
}