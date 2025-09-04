import { useState, useEffect } from "react";
import { TextField, Button, Stack, Alert, Link as MUILink } from "@mui/material";
import { reset } from "../../services/auth";
import { useSearchParams, useNavigate, useLocation, Link as RouterLink } from "react-router-dom";

export default function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const location = useLocation() as { state?: { info?: string } };
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const t = sp.get("token");
    if (t) setToken(t);
  }, [sp]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await reset({ token, new_password: newPassword });
      setMsg(res.message);
      setTimeout(()=> nav("/login"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al restablecer");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={2}>
        <h2>Restablecer contraseña</h2>

        {location.state?.info && <Alert severity="info">{location.state.info}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}

        <TextField
          label="Token"
          value={token}
          onChange={(e)=>setToken(e.target.value)}
          helperText="Pega aquí el token que recibiste por correo"
          required
        />
        <TextField
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e)=>setNewPassword(e.target.value)}
          required
        />
        <Button variant="contained" type="submit">Cambiar contraseña</Button>

        <MUILink component={RouterLink} to="/login">
          Volver al login
        </MUILink>
      </Stack>
    </form>
  );
}