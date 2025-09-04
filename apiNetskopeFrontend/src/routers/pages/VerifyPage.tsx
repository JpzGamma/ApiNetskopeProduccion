import { useState, useEffect } from "react";
import { TextField, Button, Stack, Alert, Link } from "@mui/material";
import { verify } from "../../services/auth";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function VerifyPage() {
  const [sp] = useSearchParams();
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const q = sp.get("correo");
    if (q) setCorreo(q);
  }, [sp]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const res = await verify({ correo, codigo });
      setMsg(res.message);
      setTimeout(()=> nav("/login"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al verificar");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={2}>
        <h2>Verificar cuenta</h2>
        {msg && <Alert severity="success">{msg}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Correo" type="email" value={correo} onChange={(e)=>setCorreo(e.target.value)} required />
        <TextField label="Código" value={codigo} onChange={(e)=>setCodigo(e.target.value)} required />
        <Button variant="contained" type="submit">Verificar</Button>
        <Link href="/login">Volver al login</Link>
      </Stack>
    </form>
  );
}