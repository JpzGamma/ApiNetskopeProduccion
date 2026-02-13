import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Stack,
  Alert,
  Link as MUILink,
  Card,
  CardContent,
  Typography,
  Box,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Email, Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import { login } from "../../services/auth";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";

const LAST_LOGIN_EMAIL_KEY = "last_login_email";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const st = location.state as any;

    // ✅ 1) Si viene del RESET: autollenar correo
    // - Prioridad: state.correo
    // - Fallback: localStorage(last_login_email)
    if (st?.fromReset === true) {
      const emailFromState =
        typeof st?.correo === "string" ? st.correo.trim() : "";
      const emailFromStorage = (localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || "").trim();

      const emailToUse = emailFromState || emailFromStorage;
      if (emailToUse) setCorreo(emailToUse);

      // limpiar storage para que no quede pegado
      localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);

      // limpiar state para que NO quede autollenado si entra al login normal
      nav(location.pathname, { replace: true, state: null });
      return;
    }

    // ✅ 2) Si viene del VERIFY: autollenar correo (tu flujo actual)
    if (st?.fromVerify === true && typeof st?.correo === "string") {
      setCorreo(st.correo);

      // limpiar state para que NO quede autollenado si entra al login normal
      nav(location.pathname, { replace: true, state: null });
      return;
    }

    // ✅ 3) Si NO viene de reset ni verify: NO autollenar.
    // (Si algún día quieres autollenar siempre, aquí sería el lugar.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await login({ correo, password });

      // ✅ Si backend requiere 2FA, mandamos a la pantalla del código
      if (res?.requires2fa) {
        nav("/verify-2fa", { replace: true, state: { correo } });
        return;
      }

      // ✅ Si no requiere 2FA, entra normal
      nav("/home");
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Error al iniciar sesión";
      setError(detail);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        p: 2,
      }}
    >
      {/* Main Container */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "40px",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
          background:
            "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
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
            <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 3 }}>
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

            {/* Title */}
            <Typography variant="h6" fontWeight={600} align="center" gutterBottom>
              Iniciar Sesión
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              ¡Bienvenidos!
            </Typography>

            {/* Login Form */}
            <form onSubmit={onSubmit} autoComplete="off">
              <div style={{ display: "none" }} aria-hidden>
                <input name="prevent_autofill_username" autoComplete="username" />
                <input
                  name="prevent_autofill_password"
                  type="password"
                  autoComplete="current-password"
                />
              </div>

              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}

                {/* Email Field */}
                <TextField
                  label="Correo electrónico"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  fullWidth
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Field + 👁️ */}
                <TextField
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Forgot Password */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <MUILink component={RouterLink} to="/forgot" variant="body2">
                    ¿Olvidaste tu contraseña?
                  </MUILink>
                </Box>

                {/* Submit Button */}
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
                >
                  Iniciar Sesión
                </Button>
              </Stack>
            </form>

            {/* Registration Link */}
            <Typography variant="body2" align="center" sx={{ mt: 3 }}>
              ¿No tienes una cuenta?{" "}
              <MUILink component={RouterLink} to="/register">
                Regístrate aquí
              </MUILink>
            </Typography>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body2">&copy; 2026 Api - Netskope</Typography>
          Equipo de Desarrollo Gamma Ingenieros
        </Box>
      </Box>
    </Box>
  );
}
