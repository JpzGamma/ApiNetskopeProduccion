import { useState, useEffect } from "react";
import { TextField, Button, Stack, Alert, Box, Card, CardContent, Typography, InputAdornment } from "@mui/material";
import { reset } from "../../services/auth";
import { useSearchParams, useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { Lock } from "@mui/icons-material"; // Importando el icono de Lock

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
    setMsg(null);
    setErr(null);
    try {
      const res = await reset({ token, new_password: newPassword });
      setMsg(res.message);
      setTimeout(() => nav("/login"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Error al restablecer");
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
          background:"linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
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
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box
                component="img"
                src="/LogoNetskopeAzul.jpeg"
                alt="Logo de seguridad"
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 6,
                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                }}
              />
            </Box>

            <Typography
              variant="h6"
              fontWeight={600}
              align="center"
              sx={{ mb: 1 }}
            >
              Restablecer Contraseña
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Ingresa el token recibido por correo para restablecer tu
              contraseña.
            </Typography>

            <form onSubmit={onSubmit} autoComplete="off">
              {/* Hack para evitar autocompletado */}
              <input type="text" name="fakeuser" autoComplete="username" style={{ display: "none" }} />
              <input type="password" name="fakepass" autoComplete="new-password" style={{ display: "none" }} />
              <Stack spacing={2}>
                {msg && <Alert severity="success">{msg}</Alert>}
                {err && <Alert severity="error">{err}</Alert>}

                <TextField
                  label="Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  helperText="Pega aquí el token que recibiste por correo"          
                  fullWidth
                  autoComplete="off"
                  type="password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  autoComplete="off"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
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
                >
                  Cambiar Contraseña
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
      </Box>

      <Box
        sx={{
          mt: 3,
          color: "text.secondary",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        <Typography variant="caption">
          © {new Date().getFullYear()} ApiNetskope
        </Typography>
      </Box>
    </Box>
  );
}