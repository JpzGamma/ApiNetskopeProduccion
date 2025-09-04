import api from "./api";

export type RegisterIn = {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
};
export type VerifyIn = { correo: string; codigo: string };
export type LoginIn = { correo: string; password: string };
export type ForgotIn = { correo: string };
export type ResetTokenIn = { token: string; new_password: string };

export async function register(body: RegisterIn) {
  const { data } = await api.post("/auth/register", body);
  return data as { message: string };
}

export async function verify(body: VerifyIn) {
  const { data } = await api.post("/auth/verify", body);
  return data as { message: string };
}

export async function login(body: LoginIn) {
  const { data } = await api.post("/auth/login", body);
  // guarda token
  localStorage.setItem("access_token", data.access_token);
  return data as { access_token: string; token_type: string };
}

export async function forgot(body: ForgotIn) {
  const { data } = await api.post("/auth/forgot", body);
  return data as { message: string };
}

export async function reset(body: ResetTokenIn) {
  const { data } = await api.post("/auth/reset", body);
  return data as { message: string };
}

export function logout() {
  localStorage.removeItem("access_token");
}
export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}