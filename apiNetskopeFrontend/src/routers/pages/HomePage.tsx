import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// Icons
import { 
  Cloud, 
  Group, 
  Apps, 
  Link as LinkIcon, 
  Lock, 
  Policy, 
  QueryStats 
} from '@mui/icons-material';

// Datos de tenants
const tenants = [
  { 
    name: 'URL List', 
    route: '/URL_List', 
    icon: <LinkIcon fontSize="large" />, 
    color: 'rgba(66, 165, 245, 0.15)',
    tag: 'Gestión'
  },
  { 
    name: 'CCI Apps', 
    route: '/cciApps', 
    icon: <Apps fontSize="large" />, 
    color: 'rgba(102, 187, 106, 0.15)',
    tag: 'Aplicaciones'
  },
  { 
    name: 'Private Apps', 
    route: '/PrivateApps', 
    icon: <Lock fontSize="large" />, 
    color: 'rgba(255, 167, 38, 0.15)',
    tag: 'Seguridad'
  },
  { 
    name: 'Políticas Real-Time', 
    route: '/Policies', 
    icon: <Policy fontSize="large" />, 
    color: 'rgba(239, 83, 80, 0.15)',
    tag: 'Políticas'
  },
  { 
    name: 'SCIM Usuarios', 
    route: '/Users', 
    icon: <Group fontSize="large" />, 
    color: 'rgba(171, 71, 188, 0.15)',
    tag: 'Usuarios'
  },
  { 
    name: 'SCIM Grupos', 
    route: '/Groups', 
    icon: <Cloud fontSize="large" />, 
    color: 'rgba(41, 182, 246, 0.15)',
    tag: 'Grupos'
  },
  { 
    name: 'User Score', 
    route: '/Score', 
    icon: <QueryStats fontSize="large" />, 
    color: 'rgba(255, 112, 67, 0.15)',
    tag: 'Analytics'
  },
];

export default function Homepage() {
  const [search, setSearch] = useState('');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const navigate = useNavigate();

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Elementos decorativos de fondo */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(66, 165, 245, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163, 201, 241, 0.3) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Header superior con logout */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          px: { xs: 2, md: 6 },
          py: 3,
        }}
      >
        {/* Botón logout */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Tooltip title="Cerrar sesión" arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #42a5f5, #1976d2)',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </motion.div>
      </Box>

      {/* Contenido principal */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1400px',
          mx: 'auto',
          px: { xs: 2, md: 6 },
          pt: { xs: 2, md: 4 },
          pb: 8,
        }}
      >
        {/* Logos centrados */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: { xs: 2, sm: 3 },
              mb: 4,
            }}
          >
            <RouterLink to="/home" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo Netskope"
                  sx={{
                    width: { xs: 60, sm: 70, md: 80 },
                    height: { xs: 60, sm: 70, md: 80 },
                    borderRadius: 3,
                    boxShadow: '0 8px 20px rgba(25, 118, 210, 0.3)',
                    transition: 'all 0.3s ease',
                    border: '3px solid rgba(255, 255, 255, 0.8)',
                  }}
                />
              </motion.div>
            </RouterLink>

            <RouterLink to="/home" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Box
                  component="img"
                  src="/LogoGamma.jpeg"
                  alt="Logo Gamma"
                  sx={{
                    width: { xs: 60, sm: 70, md: 80 },
                    height: { xs: 60, sm: 70, md: 80 },
                    borderRadius: 3,
                    boxShadow: '0 8px 20px rgba(25, 118, 210, 0.3)',
                    transition: 'all 0.3s ease',
                    border: '3px solid rgba(255, 255, 255, 0.8)',
                  }}
                />
              </motion.div>
            </RouterLink>
          </Box>
        </motion.div>

        {/* Sección de bienvenida */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                color: '#1a1a1a',
                mb: 1,
              }}
            >
              ¡Bienvenido!
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(0, 0, 0, 0.6)',
                fontWeight: 500,
                fontSize: { xs: '1rem', md: '1.1rem' },
              }}
            >
              ¿Qué deseas hacer hoy?
            </Typography>
          </Box>
        </motion.div>

        {/* Barra de búsqueda destacada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Box
            sx={{
              maxWidth: '600px',
              mx: 'auto',
              mb: 6,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                  </InputAdornment>
                ),
                sx: {
                  height: '60px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  border: '2px solid transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'white',
                    boxShadow: '0 12px 32px rgba(66, 165, 245, 0.2)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    borderColor: '#1976d2',
                    boxShadow: '0 12px 32px rgba(25, 118, 210, 0.3)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  input: {
                    color: '#333',
                    fontWeight: 500,
                  },
                },
              }}
            />
          </Box>
        </motion.div>

        {/* Grid de módulos - Diseño tipo Bento Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
              mb: 6,
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredTenants.map((tenant, index) => (
                <motion.div
                  key={tenant.name}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    layout: { duration: 0.3 },
                  }}
                  whileHover={{ y: -8 }}
                  onHoverStart={() => setHoveredCard(index)}
                  onHoverEnd={() => setHoveredCard(null)}
                >
                  <Box
                    onClick={() => {
                      if (tenant.route.startsWith('http')) {
                        window.open(tenant.route, '_blank');
                      } else {
                        navigate(tenant.route);
                      }
                    }}
                    sx={{
                      position: 'relative',
                      height: '220px',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(20px)',
                      border: '2px solid rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0 20px 40px rgba(66, 165, 245, 0.25)',
                        borderColor: '#42a5f5',
                        background: 'rgba(255, 255, 255, 0.95)',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '5px',
                        background: 'linear-gradient(90deg, #42a5f5, #1976d2)',
                        opacity: hoveredCard === index ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                      },
                    }}
                  >
                    {/* Fondo decorativo */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: tenant.color,
                        opacity: 0.6,
                        transition: 'all 0.4s ease',
                        transform: hoveredCard === index ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />

                    {/* Contenido */}
                    <Box
                      sx={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        p: 3,
                      }}
                    >
                      {/* Header */}
                      <Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, #42a5f5, #1976d2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                            }}
                          >
                            {tenant.icon}
                          </Box>

                          <Chip
                            label={tenant.tag}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(66, 165, 245, 0.15)',
                              color: '#1976d2',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              border: '1px solid rgba(66, 165, 245, 0.3)',
                            }}
                          />
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: '#1a1a1a',
                            mb: 0.5,
                            fontSize: '1.15rem',
                            lineHeight: 1.3,
                          }}
                        >
                          {tenant.name}
                        </Typography>
                      </Box>

                      {/* Footer con flecha */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(0, 0, 0, 0.5)',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                          }}
                        >
                          Acceder
                        </Typography>

                        <motion.div
                          animate={{
                            x: hoveredCard === index ? 5 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              background: hoveredCard === index 
                                ? 'linear-gradient(135deg, #42a5f5, #1976d2)' 
                                : 'rgba(66, 165, 245, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <ArrowForwardIcon
                              sx={{
                                color: hoveredCard === index ? 'white' : '#42a5f5',
                                fontSize: 20,
                              }}
                            />
                          </Box>
                        </motion.div>
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          </Box>

          {/* Mensaje cuando no hay resultados */}
          {filteredTenants.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  px: 3,
                }}
              >
                <SearchIcon sx={{ fontSize: 64, color: 'rgba(0, 0, 0, 0.2)', mb: 2 }} />
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  No se encontraron módulos
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(0, 0, 0, 0.4)',
                  }}
                >
                  Intenta con otro término de búsqueda
                </Typography>
              </Box>
            </motion.div>
          )}
        </motion.div>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          pb: 4,
          px: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(0, 0, 0, 0.5)',
            fontWeight: 500,
          }}
        >
          &copy; 2026 Api - Netskope
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(0, 0, 0, 0.4)',
            fontSize: '0.85rem',
          }}
        >
          Equipo de Desarrollo Gamma Ingenieros
        </Typography>
      </Box>
    </Box>
  );
}
