import { useRef, useState } from 'react'; 
import {
  motion,
  useScroll,
  useMotionValue,
  useMotionValueEvent,
  animate,
  MotionValue,
} from 'framer-motion';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// Icons
import { Cloud, Group, Apps, Link as LinkIcon, Policy, Lock } from '@mui/icons-material';

// Datos de tenants con íconos
const tenants = [
  { name: 'URL - List', route: '/URL_List', icon: <LinkIcon fontSize="large" /> },
  { name: 'CCI - Apps', route: '/cciApps', icon: <Apps fontSize="large" /> },
  { name: 'Usuarios', route: '/Users', icon: <Group fontSize="large" /> },
  { name: 'Grupos', route: '/Groups', icon: <Cloud fontSize="large" /> },
  { name: 'Políticas Real - Time', route: 'https://example5.com', icon: <Policy fontSize="large" /> },
  { name: 'NPA - Private Apps', route: 'https://example6.com', icon: <Lock fontSize="large" /> },
  { name: 'Eventos - SWG', route: 'https://example4.com', icon: <Cloud fontSize="large" /> },
];

// Colores suaves con efecto glass
const pastelColors = [
  'rgba(255,255,255,0.2)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0.22)',
  'rgba(255,255,255,0.28)',
  'rgba(255,255,255,0.24)',
];

export default function Homepage() {
  const ref = useRef<HTMLUListElement | null>(null);
  const { scrollXProgress } = useScroll({ container: ref });
  const maskImage = useScrollOverflowMask(scrollXProgress);

  const [search, setSearch] = useState('');
  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const navigate = useNavigate();

  const handleLogout = () => {
    // 1) Eliminar el token
    localStorage.removeItem('access_token');
    // 2) (Opcional) limpiar cualquier otro dato de sesión si lo hubiera
    // sessionStorage.clear();
    // 3) Redirigir al login
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
      }}
    >
      {/* Contenedor principal */}
      <Box
        sx={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
          marginTop: 2,
        }}
      >
        <Card
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: 850,
            borderRadius: 4,
            padding: '20px',
            background: 'transparent',
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 4,
                    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                    mb: 2,
                    mx: "auto",
                  }}
                />
              </RouterLink>
            </Box>

            {/* Título de bienvenida */}
            <Typography variant="h4" fontWeight={600}>
              ¡Bienvenido!
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              ¿Qué deseas hacer hoy?
            </Typography>

            {/* Campo de búsqueda */}
            <Box sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar módulo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#555" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: "999px",
                    backgroundColor: "rgba(255,255,255,0.4)",
                    backdropFilter: "blur(8px)",
                    input: { color: "#333", fontWeight: 500 },
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  },
                }}
              />
            </Box>

            {/* Carrusel de tenants */}
            <Box
              sx={{
                maxWidth: '850px',
                display: 'flex',
                justifyContent: 'center',
                borderRadius: '20px',
                margin: 'auto',
              }}
            >
              <motion.ul
                ref={ref}
                style={{
                  display: 'flex',
                  listStyle: 'none',
                  margin: 2,
                  gap: 24,
                  padding: '15px',
                  overflowX: 'auto',
                  width: 'fit-content',
                  maxWidth: '100%',
                  maskImage,
                  WebkitMaskImage: maskImage as any,
                }}
              >
                {filteredTenants.map((tenant, i) => (
                  <motion.li
                    key={i}
                    whileHover={{
                      scale: 1.08,
                      boxShadow: "0 10px 22px rgba(66,165,245,0.5)",
                    }}
                    transition={{ type: "spring", stiffness: 250 }}
                    style={{
                      flex: '0 0 auto',
                      width: 200,
                      height: 190,
                      borderRadius: 30,
                      background: pastelColors[i % pastelColors.length],
                      backdropFilter: "blur(16px)",
                      display: 'flex',
                      flexDirection: "column",
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '20px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (tenant.route.startsWith('http')) {
                        window.open(tenant.route, '_blank');
                      } else {
                        navigate(tenant.route);
                      }
                    }}
                  >
                    <Box sx={{ mb: 1, color: "#1976d2" }}>{tenant.icon}</Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#000',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        maxWidth: '85%',
                      }}
                    >
                      {tenant.name}
                    </Typography>
                  </motion.li>
                ))}
              </motion.ul>
            </Box>

            {/* Botón de Cerrar sesión */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                onClick={handleLogout}
                variant="contained"
                sx={{
                  py: 1.3,
                  px: 5,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #42a5f5, #66b9ff)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                  ":hover": {
                    background: "linear-gradient(90deg, #66b9ff, #42a5f5)",
                  },
                }}
              >
                Cerrar sesión
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">&copy; 2025 ApiNetskope</Typography>
      </Box>
    </Box>
  );
}

/* --- máscara de fade --- */
const left = `0%`;
const right = `100%`;
const leftInset = `7%`;
const rightInset = `93%`;
const transparent = `#0000`;
const opaque = `#000`;

function useScrollOverflowMask(scrollXProgress: MotionValue<number>) {
  const maskImage = useMotionValue(
    `linear-gradient(90deg, ${opaque}, ${opaque} ${left}, ${opaque} ${rightInset}, ${transparent})`
  );

  useMotionValueEvent(scrollXProgress, 'change', (value) => {
    if (value === 0) {
      animate(
        maskImage,
        `linear-gradient(90deg, ${opaque}, ${opaque} ${left}, ${opaque} ${rightInset}, ${transparent})`
      );
    } else if (value === 1) {
      animate(
        maskImage,
        `linear-gradient(90deg, ${transparent}, ${opaque} ${leftInset}, ${opaque} ${right}, ${opaque})`
      );
    } else if (
      scrollXProgress.getPrevious() === 0 ||
      scrollXProgress.getPrevious() === 1
    ) {
      animate(
        maskImage,
        `linear-gradient(90deg, ${transparent}, ${opaque} ${leftInset}, ${opaque} ${rightInset}, ${transparent})`
      );
    }
  });

  return maskImage;
}