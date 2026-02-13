// src/pages/Users.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TablePagination,
  Chip,
  InputAdornment,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

import {
  type UserType,
  fetchUsersService,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/Users";

/** Debounce pequeño para no spamear re-render al escribir */
function useDebounce<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "error" | "success" | null;
    message: string;
  }>({ type: null, message: "" });

  // Modal Crear/Editar (lo que ya funcionaba)
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserType>({
    id: "",
    userName: "",
    email: "",
    given_name: "",
    family_name: "",
    external_id: "",
    active: true,
    lastModified: "",
  });

  // ——— MODO de carga: paginado normal o búsqueda exacta en backend (Enter) ———
  const exactSearchRef = useRef<string>(""); // cuando esté no usamos paginación del server

  useEffect(() => {
    if (exactSearchRef.current) return;
    void loadPaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  async function loadPaged() {
    setLoading(true);
    try {
      const startIndex = page * rowsPerPage + 1;
      const { users, total } = await fetchUsersService({ startIndex, count: rowsPerPage });
      setUsers(users);
      setTotal(total);
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message || "Error cargando usuarios." });
    } finally {
      setLoading(false);
    }
  }

  // Búsqueda exacta en backend al presionar Enter (username o correo)
  async function loadExactFromServer(q: string) {
    const needle = q.trim();
    if (!needle) {
      exactSearchRef.current = "";
      setPage(0);
      await loadPaged();
      return;
    }
    setLoading(true);
    try {
      exactSearchRef.current = needle;
      const { users } = await fetchUsersService({ user_name: needle });
      setUsers(users);
      setTotal(users.length);
      setPage(0);
    } catch (e: any) {
      setUsers([]);
      setTotal(0);
      setFeedbackMsg({ type: "error", message: e?.message || "Error buscando usuario." });
    } finally {
      setLoading(false);
    }
  }

  // ——— Filtro local “mientras escribes” (sobre lo cargado) ———
  const filteredUsers = useMemo(() => {
    const n = (debouncedSearch || "").toLowerCase().trim();
    if (!n) return users;
    return users.filter((u) => {
      const uname = (u.userName || "").toLowerCase();
      const mail = (u.email || "").toLowerCase();
      return uname.includes(n) || mail.includes(n);
    });
  }, [debouncedSearch, users]);

  const handleChangePage = (_: any, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // --- Acciones (conservadas) ---
  const handleOpenModal = (user?: UserType) => {
    if (user) {
      setIsEditing(true);
      setFormData(user);
    } else {
      setIsEditing(false);
      setFormData({
        id: "",
        userName: "",
        email: "",
        given_name: "",
        family_name: "",
        external_id: "",
        active: true,
        lastModified: "",
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setTimeout(() => setFeedbackMsg({ type: null, message: "" }), 0);
  };

  const handleSubmit = async () => {
    setFeedbackMsg({ type: null, message: "" });
    setLoading(true);
    try {
      if (isEditing) {
        await updateUser(formData);
        setFeedbackMsg({ type: "success", message: "Usuario actualizado con éxito" });
      } else {
        await createUser(formData);
        setFeedbackMsg({ type: "success", message: "Usuario creado con éxito" });
      }
      handleCloseModal();
      if (exactSearchRef.current) {
        await loadExactFromServer(exactSearchRef.current);
      } else {
        await loadPaged();
      }
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message || "Error en la operación." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: UserType) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setLoading(true);
    try {
      await deleteUser(user);
      setFeedbackMsg({ type: "success", message: "Usuario eliminado con éxito" });
      if (exactSearchRef.current) {
        await loadExactFromServer(exactSearchRef.current);
      } else {
        await loadPaged();
      }
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message || "Error eliminando usuario" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const totalLabel = exactSearchRef.current ? `Resultados: ${users.length}` : `Total de usuarios: ${total}`;

  // --- estilos reutilizables (solo UI) ---
  const glassShellSx = {
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.10)",
  } as const;

  const primaryGradient = "linear-gradient(135deg, #42a5f5, #1976d2)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* blobs decorativos (igual que los otros) */}
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
          maxWidth: 1300,
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
              maxWidth: 1200,
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
                  Users
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={totalLabel}
                    sx={{
                      backgroundColor: "rgba(66, 165, 245, 0.15)",
                      color: "#1976d2",
                      fontWeight: 800,
                      border: "1px solid rgba(66, 165, 245, 0.3)",
                    }}
                  />
                  <Chip
                    label={`Mostrando: ${filteredUsers.length}`}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 800,
                      border: "1px solid rgba(255,255,255,0.7)",
                    }}
                  />
                  
                </Box>
              </Box>

              {/* Controles */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 1.5,
                  alignItems: { xs: "stretch", md: "center" },
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <TextField
                  placeholder="Buscar por username o correo "
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (exactSearchRef.current) exactSearchRef.current = "";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadExactFromServer(search);
                  }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.75)",
                      backdropFilter: "blur(14px)",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenModal()}
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
                    width: { xs: "100%", md: "auto" },
                  }}
                >
                  Nuevo Usuario
                </Button>
              </Box>

              {/* Tabla */}
              <Box
                sx={{
                  borderRadius: "18px",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                }}
              >
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 560, background: "transparent" }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>UserName</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Apellido</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Activo</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Última modificación</TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="center">
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{u.userName}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.given_name || "-"}</TableCell>
                            <TableCell>{u.family_name || "-"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={u.active ? "Sí" : "No"}
                                sx={{
                                  fontWeight: 900,
                                  borderRadius: "12px",
                                  backgroundColor: u.active ? "rgba(76, 175, 80, 0.14)" : "rgba(244, 67, 54, 0.12)",
                                  color: u.active ? "#2e7d32" : "#c62828",
                                  border: "1px solid rgba(255,255,255,0.8)",
                                }}
                              />
                            </TableCell>
                            <TableCell>{formatDate(u.lastModified)}</TableCell>
                            <TableCell align="center">
                              <IconButton sx={{ color: "#FFA726" }} onClick={() => handleOpenModal(u)}>
                                <EditIcon />
                              </IconButton>
                              <IconButton color="error" onClick={() => handleDelete(u)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Paginación visible cuando NO hay búsqueda exacta del servidor */}
              {!exactSearchRef.current && (
                <Box
                  sx={{
                    mt: 1.5,
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.7)",
                  }}
                >
                  <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                  />
                </Box>
              )}

              {feedbackMsg.type && (
                <Alert
                  severity={feedbackMsg.type}
                  onClose={() => setFeedbackMsg({ type: null, message: "" })}
                  sx={{
                    mt: 2,
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  {feedbackMsg.message}
                </Alert>
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

      {/* Modal Crear/Editar (conservado, solo UI) */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
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
        <DialogTitle sx={{ fontWeight: 900 }}>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            margin="dense"
            label="UserName *"
            fullWidth
            value={formData.userName}
            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
            disabled={isEditing}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          <TextField
            margin="dense"
            label="Email *"
            fullWidth
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          <TextField
            margin="dense"
            label="Nombre (opcional)"
            fullWidth
            value={formData.given_name || ""}
            onChange={(e) => setFormData({ ...formData, given_name: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          <TextField
            margin="dense"
            label="Apellido (opcional)"
            fullWidth
            value={formData.family_name || ""}
            onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          <TextField
            margin="dense"
            label="External ID (opcional)"
            placeholder="Solo si deseas enlazar con otro sistema"
            fullWidth
            value={formData.external_id || ""}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />

          {isEditing && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Checkbox checked={!!formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
              <Typography sx={{ fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>Activo</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
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
            {isEditing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
