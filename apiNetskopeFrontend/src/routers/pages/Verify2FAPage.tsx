import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import { verify2fa, logout, is2FAPending, isAuthenticated } from "../../services/auth";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";

export default function Verify2FAPage() {
  const [codigo, setCodigo] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const location = useLocation();

  const correo = (location.state as any)?.correo as string | undefined;

  // ✅ Siempre vacío al entrar
  useEffect(() => {
    setCodigo("");
  }, []);

  /**
   * ✅ Guardas para evitar pantalla en blanco:
   * - Si NO hay pending_2fa_token => vuelve al login
   * - Si ya hay access_token => ya está autenticado => home
   */
  useEffect(() => {
    if (isAuthenticated()) {
      nav("/home", { replace: true });
      return;
    }
    if (!is2FAPending()) {
      nav("/login", { replace: true });
      return;
    }
  }, [nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (codigo.trim().length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }

    // ✅ si por alguna razón se borró el pending token, no sigas
    if (!is2FAPending()) {
      setError("No hay verificación 2FA pendiente. Inicia sesión de nuevo.");
      nav("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      await verify2fa({ codigo: codigo.trim() });
      nav("/home", { replace: true });
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Código inválido o expirado";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const onBackToLogin = () => {
    logout();
    nav("/login", { replace: true });
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
      {/* Fondo de cuadro (igual a tus otras pantallas) */}
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
            maxWidth: 420,
            borderRadius: 3,
            boxShadow: "0px 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logos (igual que las otras) */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 3 }}>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo Netskope"
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

              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoGamma.jpeg"
                  alt="Logo Gamma"
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

            <Typography variant="h6" fontWeight={600} align="center" gutterBottom>
              Verificación 2FA
            </Typography>

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {correo ? `Te enviamos un código a: ${correo}` : "Te enviamos un código a tu correo."}
            </Typography>

            {/* 🚫 Anti-autofill */}
            <div style={{ display: "none" }} aria-hidden>
              <input name="fake-username" autoComplete="username" />
              <input name="fake-password" type="password" autoComplete="current-password" />
            </div>

            <form onSubmit={onSubmit} autoComplete="off">
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Código (6 dígitos)"
                  value={codigo}
                  type={showCode ? "text" : "password"}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  fullWidth
                  inputMode="numeric"
                  autoComplete="new-password"
                  name="login_2fa_code"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCode((v) => !v)}
                          edge="end"
                          aria-label={showCode ? "Ocultar código" : "Mostrar código"}
                        >
                          {showCode ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& input:-webkit-autofill": {
                      WebkitBoxShadow: "0 0 0 1000px transparent inset",
                      WebkitTextFillColor: "inherit",
                      caretColor: "inherit",
                      transition: "background-color 9999s ease-out 0s",
                    },
                    "& input:-webkit-autofill:focus": {
                      WebkitBoxShadow: "0 0 0 1000px transparent inset",
                      WebkitTextFillColor: "inherit",
                      caretColor: "inherit",
                    },
                  }}
                />

                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    textTransform: "none",
                    backgroundColor: "#42a5f5",
                    borderRadius: 2,
                    ":hover": { backgroundColor: "#1e88e5" },
                  }}
                >
                  {loading ? "Verificando..." : "Verificar código"}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={onBackToLogin}
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    borderColor: "#42a5f5",
                    color: "#42a5f5",
                    textTransform: "none",
                    borderRadius: 2,
                    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                    "&:hover": {
                      backgroundColor: "#e3f2fd",
                      borderColor: "#1e88e5",
                      color: "#1e88e5",
                    },
                  }}
                >
                  Volver
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Footer igual */}
        <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body2">&copy; 2026 Api - Netskope</Typography>
          Equipo de Desarrollo Gamma Ingenieros
        </Box>
      </Box>
    </Box>
  );
}
