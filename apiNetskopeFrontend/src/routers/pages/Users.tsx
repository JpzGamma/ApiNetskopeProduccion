import { useState, useEffect } from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  type UserType,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/Users";

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "error" | "success" | null;
    message: string;
  }>({ type: null, message: "" });

  // Modal
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
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch {
      setFeedbackMsg({ type: "error", message: "Error cargando usuarios." });
    } finally {
      setLoading(false);
    }
  };

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
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

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
      loadUsers();
    } catch {
      setFeedbackMsg({ type: "error", message: "Error en la operación." });
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
      loadUsers();
    } catch {
      setFeedbackMsg({ type: "error", message: "Error eliminando usuario" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.userName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
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
          background:
            "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        }}
      >
        <Card elevation={0} sx={{ background: "transparent", boxShadow: "none" }}>
          <CardContent sx={{ textAlign: "center" }}>
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
            <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
              Users
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de usuarios: {users.length}
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
                label="Buscar por username o correo"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: "100%", maxWidth: 400 }}
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
              <TableContainer
                component={Paper}
                sx={{ maxHeight: 400, mb: 3, overflowX: "auto" }}
              >
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
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenModal(u)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(u)}
                            >
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
      </Box>

      {/* Modal Crear/Editar */}
      <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>
          {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="UserName *"
            fullWidth
            value={formData.userName}
            onChange={(e) =>
              setFormData({ ...formData, userName: e.target.value })
            }
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
            value={formData.given_name}
            onChange={(e) =>
              setFormData({ ...formData, given_name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Apellido (opcional)"
            fullWidth
            value={formData.family_name}
            onChange={(e) =>
              setFormData({ ...formData, family_name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="External ID (opcional)"
            placeholder="Solo si deseas enlazar con otro sistema"
            fullWidth
            value={formData.external_id}
            onChange={(e) =>
              setFormData({ ...formData, external_id: e.target.value })
            }
          />
          {isEditing && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Checkbox
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
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

      {/* Footer */}
      <Box sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">&copy; 2025 ApiNetskope</Typography>
      </Box>
    </Box>
  );
}