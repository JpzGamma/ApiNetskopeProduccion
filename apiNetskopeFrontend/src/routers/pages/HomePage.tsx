import { Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const nav = useNavigate();
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Bienvenido 👋</Typography>
      <Typography>Autenticación correcta. Aquí montaremos los módulos por tenant.</Typography>
      <Button variant="outlined" onClick={() => nav("/login")}>Ir al login</Button>
    </Stack>
  );
}