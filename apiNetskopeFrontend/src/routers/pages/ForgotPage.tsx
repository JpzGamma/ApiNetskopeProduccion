import { useState } from "react";
import { TextField, Button, Stack, Alert, Link as MUILink, Card, CardContent } from "@mui/material";
import { forgot } from "../../services/auth";
import { useNavigate, Link as RouterLink } from "react-router-dom";

export default function ForgotPage() {
  const [correo, setCorreo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // 1) solicitamos el envío del correo
      await forgot({ correo });

      // 2) navegamos a reset-password para que el usuario pegue el token manualmente
      nav("/reset-password", {
        replace: true,
        state: {
          info: `Si el correo existe, te enviamos un enlace. Copia el token del correo y pégalo aquí.`,
        },
      });
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al solicitar el restablecimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 400, mx: "auto", mt: 6, borderRadius: 3, width: "100%" }}>
      <CardContent sx={{ p: 4 }}>
    <form onSubmit={onSubmit}>
      <Stack spacing={2}>
        <h2>¿Olvidaste tu contraseña?</h2>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField
          label="Correo"
          type="email"
          value={correo}
          onChange={(e)=>setCorreo(e.target.value)}
          required
        />
        <Button variant="contained" type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar enlace"}
        </Button>

        <MUILink component={RouterLink} to="/login">
          Volver al login
        </MUILink>
      </Stack>
    </form>
    </CardContent>
    </Card>
  );
}