import { Box, Button, Typography, Card, CardContent } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function WelcomePage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        p: 2,
        marginTop: 0,
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
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 400,
            borderRadius: 3,
            padding: "20px",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: 4, textAlign: "center" }}>
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

            {/* Título */}
            <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
              Bienvenido
            </Typography>

            {/* Descripción */}
            <Typography variant="body2" sx={{ mb: 3 }}>
              Accede a tu cuenta o crea una nueva para comenzar
            </Typography>

            {/* Botones */}
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* Botón Iniciar Sesión */}
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{
                  py: 1.3,
                  fontWeight: 600,
                  textTransform: "none",
                  backgroundColor: "#42a5f5",
                  borderRadius: 2,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                  ":hover": {
                    backgroundColor: "#66b9ff",
                  },
                }}
              >
                Iniciar Sesión
              </Button>

              {/* Botón Registrarse */}
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
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
                Registrarse
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography variant="body2">
            &copy; 2025 Api - Netskope
          </Typography>
          Equipo de Desarrollo - Gamma Medellín
        </Box>
      </Box>
    </Box>
  );
}