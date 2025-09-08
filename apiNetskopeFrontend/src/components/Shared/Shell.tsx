import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import type { PropsWithChildren } from "react";
import { isAuthenticated, logout } from "../../services/auth";
import { useLocation, useNavigate } from "react-router-dom";

type ShellProps = PropsWithChildren<{}>;

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/verify",
  "/forgot",
  "/reset-password",
]);

export default function Shell({ children }: ShellProps) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isAuthScreen = AUTH_PATHS.has(pathname);

  const onLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* AppBar fijo */}
      <AppBar position="fixed" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ApiNetskope
          </Typography>
          {isAuthenticated() && (
            <Button color="inherit" onClick={onLogout}>
              Salir
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Separador para no tapar el contenido */}
      <Toolbar />

      {/* MAIN: ocupa todo el alto restante */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          px: { xs: 2, md: 3 },
          py: 3,

          /* === Estilo global SOLO para pantallas de auth === */
          ...(isAuthScreen
            ? {
                display: "grid",
                placeItems: "center",
                /* Fondo compuesto por varias capas para imitar el mock */
                backgroundImage: `
                  linear-gradient(160deg, transparent 0 56%, #F25C05 56% 78%, transparent 0),
                  linear-gradient(180deg, #0E3C5A 0 42%, transparent 42%),
                  linear-gradient(100deg, transparent 0 28%, #22b7b7 28% 55%, transparent 55%),
                  linear-gradient(0deg, #f4f6fa, #f4f6fa)
                `,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }
            : { bgcolor: "#f7f7f9" }),
        }}>
        {children}
        <Box component="footer" sx={{ py: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="caption">© {new Date().getFullYear()} ApiNetskope</Typography>
      </Box>
      </Box>

      {/* Footer */}
      
    </Box>
  );
}