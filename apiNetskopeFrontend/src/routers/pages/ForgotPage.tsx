import { useState } from "react";
import {
  TextField,
  Button,
  Stack,
  Alert,
  Card,
  CardContent,
  Typography,
  Box,
  InputAdornment,
} from "@mui/material";
import { forgot } from "../../services/auth";
import { Email } from "@mui/icons-material";
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        p: 2,
        height: "100vh",
      }}
    >
      {/* Fondo de cuadro */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "40px",
          background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Card
          elevation={6}
          sx={{
            width: "100%",
            maxWidth: 400,
            borderRadius: 3,
            boxShadow: "0px 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'center',gap:3, mb: 3 }}>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 5,
                    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                    mb: 2,
                    mx: "auto",
                  }}
                />
              </RouterLink>
              {/* Segundo Logo */}
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoGamma.jpeg" 
                  alt="Logo Nuevo"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 5,
                    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                    mb: 2,
                    mx: "auto",
                  }}
                />
              </RouterLink>
            </Box>
            <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 1 }}>
              ¿Olvidaste tu contraseña?
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Ingresa tu correo para recibir el código de restablecimiento.
            </Typography>

            <form onSubmit={onSubmit}>
              <Stack spacing={2}>
                {err && <Alert severity="error">{err}</Alert>}

                {/* Correo electrónico */}
                <TextField
                  label="Correo electrónico"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    textTransform: "none",
                    backgroundColor: "#42a5f5",
                    borderRadius: 2,
                    ":hover": {
                      backgroundColor: "#1e88e5",
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar código"}
                </Button>

                {/* Enlace para volver al login */}
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/login"
                    sx={{              
                      py: 1.3,
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      borderColor: '#42a5f5',
                      color: '#42a5f5',
                      textTransform: "none",
                      borderRadius: 2,
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                      "&:hover": {
                        backgroundColor: '#e3f2fd',
                        borderColor: '#1e88e5',
                        color: '#1e88e5',
                      },
                    }}
                  >
                    Volver
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body2">
            &copy; 2026 Api - Netskope
          </Typography>
          Equipo de Desarrollo Gamma Ingenieros
        </Box>
      </Box>
    </Box>
  );
}