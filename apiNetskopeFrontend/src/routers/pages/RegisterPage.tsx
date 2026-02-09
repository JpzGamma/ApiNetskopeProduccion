import { useState } from 'react';
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
} from '@mui/material';
import { Email, Lock, AccountCircle } from '@mui/icons-material';
import { register } from '../../services/auth';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const res = await register({ nombre, apellido, correo, password });
      setMsg(res.message);

      // Limpiar campos después de registro exitoso
      setNombre('');
      setApellido('');
      setCorreo('');
      setPassword('');

      setTimeout(
        () => nav(`/verify?correo=${encodeURIComponent(correo)}`),
        800
      );
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Error al registrar');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
        p: 2,
        height: '100vh',
      }}
    >
      {/* Fondo de cuadro */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Card
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            boxShadow: '0px 10px 30px rgba(0,0,0,0.05)',
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
            <Typography
              variant="h6"
              fontWeight={600}
              align="center"
              sx={{ mb: 1 }}
            >
              Crear cuenta
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Únete a nuestra plataforma
            </Typography>

            <form onSubmit={onSubmit} autoComplete='off'>
              <Stack spacing={2}>
                <div style={{ display: "none" }} aria-hidden>
                  <input name="prevent_autofill_username" autoComplete="username" />
                  <input name="prevent_autofill_password" type="password" autoComplete="new-password" />
                </div>
                {/* Mensajes de éxito o error */}
                {msg && <Alert severity="success">{msg}</Alert>}
                {err && <Alert severity="error">{err}</Alert>}

                {/* Campos Nombre y Apellido */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <TextField
                    label="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    fullWidth
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    fullWidth
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Correo electrónico */}
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

                {/* Contraseña */}
                <TextField
                  label="Contraseña"
                  type="password"
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
                  }}
                />

              
                {/* Botón de registro */}
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    textTransform: 'none',
                    backgroundColor: '#42a5f5',
                    borderRadius: 2,
                    ':hover': {
                      backgroundColor: '#1e88e5',
                    },
                  }}
                >
                  Crear cuenta
                </Button>

                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                  ¿Ya tienes cuenta?{' '}
                  <MUILink component={RouterLink} to="/login">
                    Inicia Sesión
                  </MUILink>
                </Typography>
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