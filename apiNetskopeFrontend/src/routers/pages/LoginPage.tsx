import { useState } from "react";
import { TextField, Button, Stack, Alert, Link } from "@mui/material";
import { login } from "../../services/auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ correo, password });
      nav("/home");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Error al iniciar sesión");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={2}>
        <h2>Iniciar sesión</h2>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Correo" type="email" value={correo} onChange={(e)=>setCorreo(e.target.value)} required />
        <TextField label="Contraseña" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <Button variant="contained" type="submit">Entrar</Button>
        <Stack direction="row" spacing={2}>
          <Link href="/register">Crear cuenta</Link>
          <Link href="/forgot">¿Olvidaste tu contraseña?</Link>
        </Stack>
      </Stack>
    </form>
  );
}