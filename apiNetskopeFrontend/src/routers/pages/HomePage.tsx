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
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // <-- Importa useNavigate

// Datos de tenants con links externos
const tenants = [
  { name: 'URL - List', route: '/URL_List' },
  { name: 'CCI - Apps', route: '/cciApps' },
  { name: 'Usuarios', route: '/Users' },
  { name: 'Grupos', route: '/Groups' },
  { name: 'Políticas Real - Time', route: 'https://example5.com' },
  { name: 'NPA - Private Apps', route: 'https://example6.com' },
  { name: 'Eventos - SWG', route: 'https://example4.com' },
  { name: 'Tenant 5', route: 'https://example5.com' },
  { name: 'Tenant 6', route: 'https://example6.com' },
];

// Colores suaves en tonos de azul
const pastelColors = [
  '#A7C7E7', // Azul Claro 1
  '#B6D5E5', // Azul Claro 2
  '#C8D9E6', // Azul Claro 3
  '#D6E4F1', // Azul Claro 4
  '#C1D8F4', // Azul Claro 5
  '#A0C2E5', // Azul Claro 6
];

export default function Homepage() {
  const ref = useRef<HTMLUListElement | null>(null);
  const { scrollXProgress } = useScroll({ container: ref });
  const maskImage = useScrollOverflowMask(scrollXProgress);

  // Estado para búsqueda
  const [search, setSearch] = useState('');

  // Filtrado de tenants
  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const navigate = useNavigate(); // <-- Aquí inicializo navigate

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
      {/* Cuadro central */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          marginTop: 2,
        }}
      >
        <Card
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: 800,
            borderRadius: 3,
            padding: '20px',
            background: 'transparent',
            boxShadow: 'none',
          }}
        >
          {/* Contenido principal */}
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <RouterLink to="/home">
              <Box
                component="img"
                src="/LogoNetskopeAzul.jpeg"
                alt="Logo"
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: 6,
                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                  mb: 2,
                  mx: "auto",
                }}
              />
              </RouterLink>
            </Box>
            {/* Título de bienvenida */}
            <Typography
              variant="h4"
              fontWeight={600}
              sx={{ textAlign: 'center' }}
            >
              ¡Bienvenido!
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              ¿Qué deseas hacer hoy?
            </Typography>

            {/* Campo de búsqueda */}
            <Box sx={{ mt: 3, mb: 2, maxWidth: 400, mx: 'auto' }}>
              <TextField
                fullWidth
                variant="outlined"
                label="Buscar módulo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Carrusel de tenants */}
            <Box
              sx={{
                maxWidth: '800px',
                display: 'flex',
                justifyContent: 'center',
                borderRadius: '20px',
                margin: 'auto',
                mt: 2,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  borderRadius: '20px',
                }}
              >
                <motion.ul
                  ref={ref}
                  className="scroll-list"
                  style={{
                    display: 'flex',
                    listStyle: 'none',
                    margin: 2,
                    gap: 20,
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
                      whileHover={{ scale: 1.1 }}
                      style={{
                        flex: '0 0 auto',
                        width: 230,
                        height: 200,
                        background: pastelColors[i % pastelColors.length],
                        borderRadius: 50,
                        boxShadow: '0 6px 16px rgba(16,24,40,0.1)',
                        display: 'flex',
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
                      <Typography
                        variant="h6"
                        sx={{
                          color: 'black',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '1.2rem',
                          maxWidth: '80%',
                        }}
                      >
                        {tenant.name}
                      </Typography>
                    </motion.li>
                  ))}
                </motion.ul>
              </Box>
            </Box>

            {/* Botón de Cerrar sesión */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{
                  py: 1.3,
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: '#42a5f5',
                  borderRadius: 2,
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  ':hover': {
                    backgroundColor: '#66b9ff',
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
      <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
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