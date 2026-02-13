// src/pages/UserScore.tsx
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
  Autocomplete,
  Chip,
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
  searchUsers,
  type UserScore,
  type UserSearchItem,
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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<UserSearchItem[]>([]);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);

  // ✅ YA NO BORRA msg por defecto
  const loadActiveUsers = async () => {
    setLoading(true);
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

  // Refrescar manual: opcionalmente limpia msg
  const handleRefresh = async () => {
    setMsg({ type: null, text: "" });
    await loadActiveUsers();
  };

  useEffect(() => {
    loadActiveUsers();
  }, []);

  const handleSearch = async (emailToSearch?: string) => {
    const email = (emailToSearch ?? searchEmail).trim();
    if (!email) return;

    setLoading(true);
    setMsg({ type: null, text: "" });

    try {
      const user = await getUserUCI(email);
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
    setSuggestions([]);
  };

  // ✅ Fix: no se borra el msg por culpa de loadActiveUsers()
  const handleReset = async (email: string) => {
    setLoading(true);

    try {
      await resetUserUCI(email);

      // Mostrar mensaje ANTES del refresh
      setMsg({ type: "success", text: `Score reiniciado para ${email}` });

      // Si estamos viendo un usuario específico, recargarlo
      if (searchedUser && searchedUser.user === email) {
        const updated = await getUserUCI(email);
        setSearchedUser(updated);
      } else {
        // Refrescar tabla sin limpiar el mensaje
        const data = await fetchActiveUsersUCI();
        setActiveUsers(data);
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

  // ✅ Autocomplete con debounce
  useEffect(() => {
    const q = searchEmail.trim();
    if (searchedUser) return; // cuando estás en vista individual no mostramos search
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearchingSuggestions(true);
        const res = await searchUsers(q, 20);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [searchEmail, searchedUser]);

  // --- estilos reutilizables (solo UI) ---
  const glassShellSx = {
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.10)",
  } as const;

  const primaryGradient = "linear-gradient(135deg, #42a5f5, #1976d2)";

  const headerChip = searchedUser ? "Vista individual" : "Activos (últimas 48h)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* blobs decorativos */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: { xs: 320, md: 520 },
          height: { xs: 320, md: 520 },
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(66, 165, 245, 0.2) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: { xs: 280, md: 420 },
          height: { xs: 280, md: 420 },
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(163, 201, 241, 0.3) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Contenedor principal */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, md: 6 },
          pt: { xs: 2, md: 4 },
          pb: 6,
        }}
      >
        {/* Header superior: logos + back */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <RouterLink to="/home" style={{ textDecoration: "none" }}>
              <Box
                component="img"
                src="/LogoNetskopeAzul.jpeg"
                alt="Logo Netskope"
                sx={{
                  width: { xs: 56, sm: 64, md: 72 },
                  height: { xs: 56, sm: 64, md: 72 },
                  borderRadius: 3,
                  boxShadow: "0 8px 20px rgba(25, 118, 210, 0.25)",
                  border: "3px solid rgba(255,255,255,0.85)",
                }}
              />
            </RouterLink>

            <RouterLink to="/home" style={{ textDecoration: "none" }}>
              <Box
                component="img"
                src="/LogoGamma.jpeg"
                alt="Logo Gamma"
                sx={{
                  width: { xs: 56, sm: 64, md: 72 },
                  height: { xs: 56, sm: 64, md: 72 },
                  borderRadius: 3,
                  boxShadow: "0 8px 20px rgba(25, 118, 210, 0.25)",
                  border: "3px solid rgba(255,255,255,0.85)",
                }}
              />
            </RouterLink>
          </Box>

          <Button
            component={RouterLink}
            to="/home"
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "14px",
              px: 2,
              background: primaryGradient,
              boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
              "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
            }}
          >
            Volver
          </Button>
        </Box>

        {/* Card central (glass) */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Card
            elevation={0}
            sx={{
              ...glassShellSx,
              width: "100%",
              maxWidth: 1100,
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              {/* Título + chips */}
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.5rem", md: "2.1rem" },
                    color: "#1a1a1a",
                    mb: 0.8,
                  }}
                >
                  Usuario - Score
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={headerChip}
                    sx={{
                      backgroundColor: "rgba(66, 165, 245, 0.15)",
                      color: "#1976d2",
                      fontWeight: 800,
                      border: "1px solid rgba(66, 165, 245, 0.3)",
                    }}
                  />
                  <Chip
                    label={`Registros: ${usersToShow.length}`}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 800,
                      border: "1px solid rgba(255,255,255,0.7)",
                    }}
                  />
                </Box>
              </Box>

              {/* Barra de búsqueda */}
              {!searchedUser && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  sx={{ mb: 2 }}
                >
                  <Autocomplete
                    freeSolo
                    options={suggestions}
                    getOptionLabel={(o) => (typeof o === "string" ? o : o.userName)}
                    loading={searchingSuggestions}
                    onChange={(_, value) => {
                      if (!value) return;
                      const email = typeof value === "string" ? value : value.userName;
                      setSearchEmail(email);
                      void handleSearch(email);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Buscar usuario por correo "
                        variant="outlined"
                        size="small"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          width: { xs: "100%", sm: 520, md: 680 },
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "16px",
                            background: "rgba(255,255,255,0.75)",
                            backdropFilter: "blur(14px)",
                          },
                        }}
                      />
                    )}
                  />

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      onClick={() => void handleSearch()}
                      disabled={loading}
                      sx={{
                        textTransform: "none",
                        fontWeight: 900,
                        borderRadius: "14px",
                        px: 2,
                        background: primaryGradient,
                        boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
                        "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
                        "&.Mui-disabled": {
                          background: "rgba(66,165,245,0.25)",
                          color: "rgba(0,0,0,0.35)",
                        },
                      }}
                    >
                      Buscar
                    </Button>

                    <Tooltip title="Refrescar listado activo 48h">
                      <span>
                        <IconButton
                          onClick={() => void handleRefresh()}
                          disabled={loading}
                          sx={{
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.65)",
                            border: "1px solid rgba(255,255,255,0.7)",
                            "&:hover": { background: "rgba(255,255,255,0.85)" },
                          }}
                        >
                          <RefreshIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              )}

              {/* Feedback */}
              {msg.type && (
                <Alert
                  severity={msg.type}
                  onClose={() => setMsg({ type: null, text: "" })}
                  sx={{
                    mb: 2,
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  {msg.text}
                </Alert>
              )}

              {/* Tabla / Loading */}
              <Box
                sx={{
                  borderRadius: "18px",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                }}
              >
                {loading ? (
                  <Box sx={{ textAlign: "center", py: 5 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1, color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>
                      Cargando datos de Netskope...
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560, background: "transparent" }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900 }}>Usuario</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>Último Score</TableCell>
                          <TableCell sx={{ fontWeight: 900 }} align="center">
                            Reiniciar Score
                          </TableCell>
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
                            <TableRow key={u.user} hover>
                              <TableCell sx={{ fontWeight: 800 }}>{u.user}</TableCell>
                              <TableCell>{u.score ?? "-"}</TableCell>
                              <TableCell align="center">
                                <Tooltip title="Reiniciar score">
                                  <IconButton
                                    color="warning"
                                    onClick={() => setConfirmReset({ open: true, user: u.user })}
                                    sx={{
                                      borderRadius: "14px",
                                      background: "rgba(255, 193, 7, 0.12)",
                                      border: "1px solid rgba(255, 193, 7, 0.20)",
                                      "&:hover": { background: "rgba(255, 193, 7, 0.18)" },
                                    }}
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
                )}
              </Box>

              {searchedUser && (
                <Box sx={{ textAlign: "center", mt: 3 }}>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToTable}
                    variant="contained"
                    sx={{
                      textTransform: "none",
                      fontWeight: 900,
                      borderRadius: "14px",
                      px: 2,
                      background: primaryGradient,
                      boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
                      "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
                    }}
                  >
                    Volver a la tabla
                  </Button>
                </Box>
              )}

              {/* Footer interno */}
              <Box sx={{ mt: 4, textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.5)", fontWeight: 600 }}>
                  &copy; 2026 Api - Netskope
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.4)", fontSize: "0.85rem" }}>
                  Equipo de Desarrollo Gamma Ingenieros
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Modal confirm reset */}
      <Dialog
        open={confirmReset.open}
        onClose={() => setConfirmReset({ open: false })}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Confirmar reinicio</DialogTitle>
        <DialogContent sx={{ color: "rgba(0,0,0,0.75)", fontWeight: 650 }}>
          ¿Deseas reiniciar el score de <b>{confirmReset.user}</b>?
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmReset({ open: false })} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleReset(confirmReset.user!)}
            disabled={loading}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: "14px",
              px: 2,
              background: primaryGradient,
              boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
              "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
              "&.Mui-disabled": {
                background: "rgba(66,165,245,0.25)",
                color: "rgba(0,0,0,0.35)",
              },
            }}
          >
            Reiniciar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
