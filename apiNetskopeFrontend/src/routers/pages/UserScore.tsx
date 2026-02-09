import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  fetchActiveUsersUCI,
  getUserUCI,
  resetUserUCI,
  type UserScore,
} from "../../services/UserScore";

export default function UserScorePage() {
  const [activeUsers, setActiveUsers] = useState<UserScore[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });
  const [confirmReset, setConfirmReset] = useState<{ open: boolean; user?: string }>({
    open: false,
  });

  const loadActiveUsers = async () => {
    setLoading(true);
    setMsg({ type: null, text: "" });
    try {
      const data = await fetchActiveUsersUCI();
      setActiveUsers(data);
      setSearchedUser(null);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error cargando usuarios activos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveUsers();
  }, []);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setLoading(true);
    setMsg({ type: null, text: "" });
    try {
      const user = await getUserUCI(searchEmail.trim());
      setSearchedUser(user);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Usuario no encontrado" });
      setSearchedUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTable = () => {
    setSearchedUser(null);
    setSearchEmail("");
  };

const handleReset = async (email: string) => {
  setLoading(true);
  setMsg({ type: null, text: "" });

  try {
    await resetUserUCI(email);
    setMsg({ type: "success", text: `Score reiniciado para ${email}` });

    if (searchedUser && searchedUser.user === email) {
      const updated = await getUserUCI(email);
      setSearchedUser(updated);
    } else {
      await loadActiveUsers();
    }
  } catch (e: any) {
    const errorText =
      e?.response?.status === 500
        ? `No se puede reiniciar el score de ${email}. El usuario no tiene un UCI activo en Netskope.`
        : e?.message || "Error al reiniciar score";

    setMsg({ type: "error", text: errorText });
  } finally {
    setLoading(false);
    setConfirmReset({ open: false });
  }
};

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => setMsg({ type: null, text: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const usersToShow = searchedUser ? [searchedUser] : activeUsers;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1000,
          borderRadius: 3,
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          background:
            "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        }}
      >
        <Card elevation={0} sx={{ background: "transparent" }}>
          <CardContent>
            {/* Logos */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 3 }}>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoNetskopeAzul.jpeg"
                  alt="Logo Netskope"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 5,
                    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                    mb: 2,
                  }}
                />
              </RouterLink>
              <RouterLink to="/home">
                <Box
                  component="img"
                  src="/LogoGamma.jpeg"
                  alt="Logo Gamma Ingenieros"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 5,
                    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)",
                    mb: 2,
                  }}
                />
              </RouterLink>
            </Box>

            <Typography variant="h4" fontWeight={700} align="center" sx={{ mb: 3 }}>
              Usuario - Score
            </Typography>

            {/* Barra de búsqueda */}
            {!searchedUser && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="center"
                sx={{ mb: 2 }}
              >
                <TextField
                  placeholder="Buscar usuario por correo"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300, background: "white", borderRadius: 1 }}
                />
                <Button variant="contained" onClick={handleSearch} disabled={loading}>
                  Buscar
                </Button>
                <Tooltip title="Refrescar listado activo 48h">
                  <span>
                    <IconButton onClick={loadActiveUsers} disabled={loading}>
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            )}

            {msg.type && (
              <Alert
                severity={msg.type}
                onClose={() => setMsg({ type: null, text: "" })}
                sx={{ mb: 2 }}
              >
                {msg.text}
              </Alert>
            )}

            {/* Spinner de carga */}
            {loading ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Cargando datos de Netskope...
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ maxHeight: 520 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Usuario</TableCell>
                        <TableCell>Último Score</TableCell>
                        <TableCell align="center">Reiniciar Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usersToShow.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            Sin resultados
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersToShow.map((u) => (
                          <TableRow key={u.user}>
                            <TableCell>{u.user}</TableCell>
                            <TableCell>{u.score ?? "-"}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="Reiniciar score">
                                <IconButton
                                  color="warning"
                                  onClick={() =>
                                    setConfirmReset({ open: true, user: u.user })
                                  }
                                >
                                  <RestartAltIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Botón volver a tabla (si se buscó individualmente) */}
                {searchedUser && (
                  <Box sx={{ textAlign: "center", mt: 3 }}>
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={handleBackToTable}
                      variant="contained"
                      sx={{
                        py: 1.3,
                        fontWeight: 600,
                        textTransform: "none",
                        backgroundColor: "#42a5f5",
                        borderRadius: 2,
                        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                        ":hover": { backgroundColor: "#66b9ff" },
                      }}
                    >
                      Volver a la tabla
                    </Button>
                  </Box>
                )}
              </>
            )}

            {/* Botón volver al home */}
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Button
                component={RouterLink}
                to="/home"
                variant="contained"
                sx={{
                  py: 1.3,
                  fontWeight: 600,
                  textTransform: "none",
                  backgroundColor: "#42a5f5",
                  borderRadius: 2,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                  ":hover": { backgroundColor: "#66b9ff" },
                }}
              >
                Volver
              </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">&copy; 2026 Api - Netskope</Typography>
              <Typography variant="caption">Equipo de Desarrollo Gamma Ingenieros</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Modal confirm reset */}
      <Dialog open={confirmReset.open} onClose={() => setConfirmReset({ open: false })}>
        <DialogTitle>Confirmar reinicio</DialogTitle>
        <DialogContent>
          ¿Deseas reiniciar el score de <b>{confirmReset.user}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset({ open: false })}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            sx={{ backgroundColor: "#42a5f5", ":hover": { backgroundColor: "#66b9ff" } }}
            onClick={() => handleReset(confirmReset.user!)}
          >
            Reiniciar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
