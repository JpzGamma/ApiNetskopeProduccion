import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Stack,
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { reset } from "../../services/auth"; // Debe aceptar { correo, codigo, new_password }
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import { Lock, Mail, Password, Visibility, VisibilityOff } from "@mui/icons-material";

const RESET_EMAIL_KEY = "reset_email";
const LAST_LOGIN_EMAIL_KEY = "last_login_email";

export default function ResetPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState(""); // 6 dígitos
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [showCode, setShowCode] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const nav = useNavigate();
  const location = useLocation();

  // ✅ Autollenar correo si viene de Forgot (state) o localStorage
  useEffect(() => {
    const stateEmail = (location.state as any)?.correo as string | undefined;
    const saved = localStorage.getItem(RESET_EMAIL_KEY);

    const emailToUse = (stateEmail || saved || "").trim();
    if (emailToUse) setCorreo(emailToUse);
  }, [location.state]);

  const validarPassword = (p: string) =>
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[\W_]/.test(p);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    // Validaciones rápidas en cliente
    if (!correo.trim()) {
      setErr("Ingresa tu correo.");
      return;
    }
    if (!/^\d{6}$/.test(codigo.trim())) {
      setErr("El código debe tener 6 dígitos.");
      return;
    }
    if (!validarPassword(newPassword)) {
      setErr(
        "La nueva contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo."
      );
      return;
    }

    try {
      const email = correo.trim();

      const res = await reset({
        correo: email,
        codigo: codigo.trim(),
        new_password: newPassword,
      });

      setMsg(res.message || "Contraseña actualizada correctamente");

      // ✅ Guardar correo para autollenar en login (solo si viene de reset)
      localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);

      // (Opcional) ya no se necesita reset_email
      // localStorage.removeItem(RESET_EMAIL_KEY);

      setTimeout(() => {
        nav("/login", {
          replace: true,
          state: { fromReset: true, correo: email },
        });
      }, 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al restablecer contraseña");
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
            maxWidth: 420,
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

            <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 1 }}>
              Restablecer Contraseña
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Ingresa tu correo, el <b>código de 6 dígitos</b> recibido y tu nueva
              contraseña.
            </Typography>

            <form onSubmit={onSubmit} autoComplete="off">
              {/* Hacks anti-autocompletado */}
              <input
                type="text"
                name="fakeuser"
                autoComplete="username"
                style={{ display: "none" }}
              />
              <input
                type="password"
                name="fakepass"
                autoComplete="new-password"
                style={{ display: "none" }}
              />

              <Stack spacing={2}>
                {msg && <Alert severity="success">{msg}</Alert>}
                {err && <Alert severity="error">{err}</Alert>}

                <TextField
                  label="Correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  fullWidth
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Código (6 dígitos)"
                  value={codigo}
                  type={showCode ? "text" : "password"}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCodigo(v);
                  }}
                  helperText="Código enviado a tu correo"
                  fullWidth
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Password color="action" />
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

                <TextField
                  label="Nueva contraseña"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  autoComplete="new-password"
                  helperText="Mín. 8 caracteres, con mayúscula, minúscula, número y símbolo"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword((v) => !v)}
                          edge="end"
                          aria-label={
                            showNewPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
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
                    ":hover": { backgroundColor: "#1e88e5" },
                  }}
                >
                  Cambiar Contraseña
                </Button>

                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/login"
                    sx={{
                      py: 1.3,
                      fontWeight: 600,
                      textTransform: "none",
                      backgroundColor: "#ffffff",
                      borderColor: "#42a5f5",
                      color: "#42a5f5",
                      borderRadius: 2,
                      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                      ":hover": {
                        backgroundColor: "#e3f2fd",
                        borderColor: "#1e88e5",
                        color: "#1e88e5",
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
          <Typography variant="body2">© {new Date().getFullYear()} ApiNetskope</Typography>
          Equipo de Desarrollo Gamma Ingenieros
        </Box>
      </Box>
    </Box>
  );
}
