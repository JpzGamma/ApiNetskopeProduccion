import api, {
  ACCESS_TOKEN_KEY,
  PENDING_2FA_TOKEN_KEY,
  authHeaderWithPending2FA,
  clearAuthTokens,
} from "./api";

/** =========================
 * Types
 * ========================= */

export type RegisterIn = {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
};

export type VerifyIn = { correo: string; codigo: string };
export type LoginIn = { correo: string; password: string };
export type ForgotIn = { correo: string };
export type ResetTokenIn = { correo: string; codigo: string; new_password: string };

export type TokenOut = {
  access_token: string;
  token_type: string;
  requires_2fa?: boolean; // backend lo manda cuando 2FA está activo
};

export type Verify2FAIn = { codigo: string };

/** =========================
 * Helpers de token
 * ========================= */

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getPending2FAToken(): string | null {
  return localStorage.getItem(PENDING_2FA_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function is2FAPending(): boolean {
  return Boolean(getPending2FAToken());
}

export function logout(): void {
  clearAuthTokens();
}

/** =========================
 * Auth endpoints
 * ========================= */

export async function register(body: RegisterIn) {
  const { data } = await api.post("/auth/register", body);
  return data as { message: string };
}

export async function verify(body: VerifyIn) {
  const { data } = await api.post("/auth/verify", body);
  return data as { message: string };
}

/**
 * Login:
 * - Si requires_2fa=true: guarda token temporal en pending_2fa_token y NO autentica aún.
 * - Si requires_2fa=false: guarda access_token final y autentica.
 */
export async function login(
  body: LoginIn
): Promise<
  | { requires2fa: true }
  | { requires2fa: false; access_token: string; token_type: string }
> {
  const { data } = await api.post("/auth/login", body);
  const res = data as TokenOut;

  // Limpieza por si había algo pendiente (o token viejo)
  localStorage.removeItem(PENDING_2FA_TOKEN_KEY);

  if (res.requires_2fa) {
    // Guardar token temporal para verify-2fa
    localStorage.setItem(PENDING_2FA_TOKEN_KEY, res.access_token);

    // Por seguridad, eliminar token final viejo si existía
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    return { requires2fa: true };
  }

  // Guardar token final
  localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
  return { requires2fa: false, access_token: res.access_token, token_type: res.token_type };
}

/**
 * verify2fa:
 * Usa el token temporal pending_2fa_token SOLO para esta llamada
 * y luego guarda el token FINAL en access_token.
 */
export async function verify2fa(body: Verify2FAIn) {
  if (!is2FAPending()) {
    throw new Error("No hay verificación 2FA pendiente. Inicia sesión de nuevo.");
  }

  const { data } = await api.post("/auth/verify-2fa", body, {
    headers: authHeaderWithPending2FA(),
  });

  // Guardar token final y limpiar pendiente
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  localStorage.removeItem(PENDING_2FA_TOKEN_KEY);

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
