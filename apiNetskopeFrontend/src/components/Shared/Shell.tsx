import { AppBar, Toolbar, Typography, Container, Box, Button } from "@mui/material";
import { type PropsWithChildren } from "react";
import { isAuthenticated, logout } from "../../services/auth";
import { useNavigate } from "react-router-dom";

type ShellProps = PropsWithChildren<{}>;

export default function Shell({ children }: PropsWithChildren) {
  const nav = useNavigate();
  const onLogout = () => { logout(); nav("/login"); };
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>ApiNetskope</Typography>
          {isAuthenticated() && <Button color="inherit" onClick={onLogout}>Salir</Button>}
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}