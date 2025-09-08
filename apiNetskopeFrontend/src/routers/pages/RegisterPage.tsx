import { useState } from "react";
import { TextField, Button, Stack, Alert, Link, Card, CardContent } from "@mui/material";
import { register } from "../../services/auth";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const res = await register({ nombre, apellido, correo, password });
      setMsg(res.message);
      // opcional: llevar al verify con el correo cargado
      setTimeout(()=> nav(`/verify?correo=${encodeURIComponent(correo)}`), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al registrar");
    }
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 600, mx: "auto", mt: 6, borderRadius: 3, width: "100%" }}>
      <CardContent sx={{ p: 4 }}>
    <form onSubmit={onSubmit}>
      <Stack spacing={2}>
        <h2>Crear cuenta</h2>
        {msg && <Alert severity="success">{msg}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} required />
        <TextField label="Apellido" value={apellido} onChange={(e)=>setApellido(e.target.value)} required />
        <TextField label="Correo corporativo" type="email" value={correo} onChange={(e)=>setCorreo(e.target.value)} required />
        <TextField label="Contraseña" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        <Button variant="contained" type="submit">Registrarme</Button>
        <Link href="/login">Volver a iniciar sesión</Link>
      </Stack>
    </form>
    </CardContent>
    </Card>
  );
}