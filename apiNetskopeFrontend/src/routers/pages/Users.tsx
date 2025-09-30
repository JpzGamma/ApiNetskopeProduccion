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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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
    if (exactSearchRef.current) {
      // Si hay una búsqueda exacta vigente, no recargamos por paginación;
      // el resultado exacto se muestra tal cual (sin paginación).
      return;
    }
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

  const totalLabel = exactSearchRef.current
    ? `Resultados: ${users.length}`
    : `Total de usuarios: ${total}`;

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
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
          maxWidth: 1500,
          width: "100%",
          p: 3,
          background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        }}
      >
        <Card elevation={0} sx={{ background: "transparent", boxShadow: "none" }}>
          <CardContent sx={{ textAlign: "center" }}>
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
            <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
              Users
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              {totalLabel}
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                flexWrap: "wrap",
                mb: 3,
              }}
            >
              <TextField
                label="Buscar por username o correo (en esta página). Enter = búsqueda exacta en servidor"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // al tipear, salimos del modo exacto (si estaba activo)
                  if (exactSearchRef.current) exactSearchRef.current = "";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void loadExactFromServer(search);
                  }
                }}
                sx={{ width: "100%", maxWidth: 520 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                  backgroundColor: "#42a5f5",
                  ":hover": { backgroundColor: "#66b9ff" },
                }}
                onClick={() => handleOpenModal()}
              >
                Nuevo Usuario
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 420, mb: 1.5, overflowX: "auto" }}>
                <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>UserName</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Apellido</TableCell>
                      <TableCell>Activo</TableCell>
                      <TableCell>Última modificación</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.userName}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.given_name || "-"}</TableCell>
                          <TableCell>{u.family_name || "-"}</TableCell>
                          <TableCell>{u.active ? "Sí" : "No"}</TableCell>
                          <TableCell>{formatDate(u.lastModified)}</TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" onClick={() => handleOpenModal(u)}>
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
            )}

            {/* Paginación visible cuando NO hay búsqueda exacta del servidor */}
            {!exactSearchRef.current && (
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_e, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100]}
              />
            )}

            {feedbackMsg.type && (
              <Alert
                severity={feedbackMsg.type}
                onClose={() => setFeedbackMsg({ type: null, message: "" })}
                sx={{ mb: 2 }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

            <Box sx={{ textAlign: "center", mt: 2 }}>
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

      {/* Modal Crear/Editar (conservado) */}
      <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="UserName *"
            fullWidth
            value={formData.userName}
            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
            disabled={isEditing}
          />
          <TextField
            margin="dense"
            label="Email *"
            fullWidth
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Nombre (opcional)"
            fullWidth
            value={formData.given_name || ""}
            onChange={(e) => setFormData({ ...formData, given_name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Apellido (opcional)"
            fullWidth
            value={formData.family_name || ""}
            onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="External ID (opcional)"
            placeholder="Solo si deseas enlazar con otro sistema"
            fullWidth
            value={formData.external_id || ""}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
          />
          {isEditing && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Checkbox
                checked={!!formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <Typography>Activo</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {isEditing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}