import { useState } from "react";
import {
  TextField, Button, Stack, Alert, Link as MUILink,
  Card, CardContent, Typography, Avatar, Box
} from "@mui/material";
import { login } from "../../services/auth";
import { useNavigate, Link as RouterLink } from "react-router-dom";

export default function LoginPage() {
  const [correo, setCorreo] = useState(localStorage.getItem("remember_email") || "");
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
      const detail = e?.response?.data?.detail || e?.response?.data?.message || "Error al iniciar sesión";
      setError(detail);
    }
  };

  return (
    <Card elevation={4} sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          {/* Coloca tu logo en /public/logo.png */}
          <Avatar src="public/LogoNetskopeAzul.jpeg" alt="Logo" sx={{ width: 64, height: 64, boxShadow: 2 }} />
        </Box>

        <Typography variant="h5" fontWeight={700} sx={{ mb: 2, textAlign: "center" }}>
          Iniciar sesión
        </Typography>

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Correo" type="email" value={correo} onChange={(e)=>setCorreo(e.target.value)} required fullWidth />
            <TextField label="Contraseña" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required fullWidth />
            <Button
              variant="contained"
              type="submit"
              fullWidth
              sx={{
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                backgroundImage: "linear-gradient(180deg, #ff7a2a 0%, #f25c05 100%)",
                ":hover": {
                  backgroundImage: "linear-gradient(180deg, #ff7a2a 0%, #d94f04 100%)",
                },
              }}
            >
              Entrar
            </Button>
            <Stack direction="row" justifyContent="space-between">
              <MUILink component={RouterLink} to="/register">Crear cuenta</MUILink>
              <MUILink component={RouterLink} to="/forgot">¿Olvidaste tu contraseña?</MUILink>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}