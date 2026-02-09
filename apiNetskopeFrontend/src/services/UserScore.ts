import api from "./api";

export type UserScore = {
  user: string;
  score: number | null;
  lastActivity?: string;
};

/**Lista los usuarios activos en las últimas 48h con su UCI (score) */
export async function fetchActiveUsersUCI(): Promise<UserScore[]> {
  const { data } = await api.get("/Gamma/score/uci/active");

  console.log("📊 Respuesta bruta de /Gamma/score/uci/active:", data);

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return list.map((u: any) => ({
    user: u.user ?? u.user_email ?? u.email ?? "(sin usuario)",
    score:
      u.uciScore ??
      u.confidenceScore ??
      u.confidence_score ??
      u.user_confidence_index ??
      u.uci ??
      u.score ??
      null,
    lastActivity: u.startTime ? new Date(u.startTime).toLocaleString() : undefined,
  }));
}

/** Obtiene el UCI (score) de un usuario específico (usa `user_email`) */
export async function getUserUCI(userEmail: string): Promise<UserScore> {
  const { data } = await api.get("/Gamma/score/uci", {
    params: { user_email: userEmail }, 
  });

  console.log("📈 Respuesta bruta de /Gamma/score/uci:", data);

  if (data?.confidences && Array.isArray(data.confidences)) {
    const latest = [...data.confidences].sort(
      (a, b) => b.start - a.start
    )[0];
    return {
      user: data.userId ?? userEmail,
      score: latest?.confidenceScore ?? null,
      lastActivity: latest?.start
        ? new Date(latest.start).toLocaleString()
        : undefined,
    };
  }

  const u = Array.isArray(data) ? data[0] : data;
  return {
    user: u.user ?? u.user_email ?? u.email ?? userEmail,
    score:
      u.uciScore ??
      u.confidenceScore ??
      u.confidence_score ??
      u.user_confidence_index ??
      u.uci ??
      u.score ??
      null,
    lastActivity: u.startTime ? new Date(u.startTime).toLocaleString() : undefined,
  };
}

/** Reinicia el UCI (score) de un usuario (usa también `user_email`) */
export async function resetUserUCI(userEmail: string): Promise<void> {
  await api.post("/Gamma/score/uci/reset", null, {
    params: { user_email: userEmail }, 
  });
  console.log(`♻️ Score reiniciado para ${userEmail}`);
}
