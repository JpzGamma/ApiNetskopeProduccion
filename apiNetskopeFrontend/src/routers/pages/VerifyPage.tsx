import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { verify } from '../../services/auth';
import {
  useSearchParams,
  useNavigate,
  Link as RouterLink,
  useLocation,
} from 'react-router-dom';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';

export default function VerifyPage() {
  const [sp] = useSearchParams();
  const location = useLocation();

  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [showCode, setShowCode] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    // ✅ Prioridad: correo desde state (viene del registro)
    const stateCorreo = (location.state as any)?.correo as string | undefined;

    // ✅ Fallback: correo desde query param (compatibilidad)
    const q = sp.get('correo') || undefined;

    if (stateCorreo) setCorreo(stateCorreo);
    else if (q) setCorreo(q);
  }, [sp, location.state]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    try {
      const res = await verify({ correo: correo.trim(), codigo: codigo.trim() });
      setMsg(res.message);

      setTimeout(() => {
        // ✅ Pasamos correo a login SOLO si vienes de este flujo
        nav('/login', { state: { correo: correo.trim(), fromVerify: true } });
      }, 800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Error al verificar');
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
          background:
            'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
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
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 5,
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4)',
                    mb: 2,
                    mx: 'auto',
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
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4)',
                    mb: 2,
                    mx: 'auto',
                  }}
                />
              </RouterLink>
            </Box>

            <Typography variant="h6" fontWeight={600} align="center" sx={{ mb: 1 }}>
              Verificar Correo
            </Typography>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Ingresa el código enviado
            </Typography>

            <form onSubmit={onSubmit}>
              {/* Hack para evitar autocompletado molesto */}
              <input
                type="text"
                name="fakeuser"
                autoComplete="username"
                style={{ display: 'none' }}
              />
              <input
                type="password"
                name="fakepass"
                autoComplete="new-password"
                style={{ display: 'none' }}
              />

              <Stack spacing={2}>
                {msg && <Alert severity="success">{msg}</Alert>}
                {err && <Alert severity="error">{err}</Alert>}

                {/* Correo */}
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

                {/* Código de verificación (oculto con 👁️) */}
                <TextField
                  label="Código de verificación"
                  type={showCode ? 'text' : 'password'}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
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
                          aria-label={showCode ? 'Ocultar código' : 'Mostrar código'}
                          onClick={() => setShowCode((v) => !v)}
                          edge="end"
                        >
                          {showCode ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Enlace para reenviar código */}
                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                  ¿No recibiste el código?{' '}
                  <MUILink component={RouterLink} to="/verify">
                    Reenviar
                  </MUILink>
                </Typography>

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
                  Verificar y Crear Cuenta
                </Button>

                {/* Enlace para volver al login */}
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/login"
                    sx={{
                      py: 1.3,
                      fontWeight: 600,
                      textTransform: 'none',
                      backgroundColor: '#ffffff',
                      borderColor: '#42a5f5',
                      color: '#42a5f5',
                      borderRadius: 2,
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                      ':hover': {
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
        <Box sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">&copy; 2026 Api - Netskope</Typography>
          Equipo de Desarrollo Gamma Ingenieros
        </Box>
      </Box>
    </Box>
  );
}
