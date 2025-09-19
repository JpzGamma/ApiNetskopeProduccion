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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  type GroupType,
  fetchGroupsService,
  createGroupService,
  updateGroupService,
  deleteGroupService,
} from "../../services/Groups";

export default function Groups() {
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "error" | "success" | null;
    message: string;
  }>({ type: null, message: "" });

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    id?: string;
    displayName: string;
    newDisplayName?: string;
  }>({ displayName: "" });
  const [membersInput, setMembersInput] = useState("");
  const [removeMembersInput, setRemoveMembersInput] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await fetchGroupsService();
      setGroups(data);
    } catch (error: any) {
      setFeedbackMsg({
        type: "error",
        message: error?.message || "Error cargando grupos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (group?: GroupType) => {
    if (group) {
      setIsEditing(true);
      setFormData({ id: group.id, displayName: group.displayName });
    } else {
      setIsEditing(false);
      setFormData({ displayName: "" });
    }
    setMembersInput("");
    setRemoveMembersInput("");
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
        await updateGroupService(
          formData.id,
          formData.displayName,
          formData.newDisplayName,
          membersInput ? membersInput.split(",") : [],
          removeMembersInput ? removeMembersInput.split(",") : []
        );
        setFeedbackMsg({ type: "success", message: "Grupo actualizado con éxito" });
      } else {
        await createGroupService(
          formData.displayName,
          membersInput ? membersInput.split(",") : []
        );
        setFeedbackMsg({ type: "success", message: "Grupo creado con éxito" });
      }

      handleCloseModal();
      await fetchGroups();
    } catch (error: any) {
      setFeedbackMsg({
        type: "error",
        message: error?.message || "Error en la operación.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (group: GroupType) => {
    if (!window.confirm("¿Seguro que deseas eliminar este grupo?")) return;

    setLoading(true);
    try {
      await deleteGroupService(group);
      setFeedbackMsg({ type: "success", message: "Grupo eliminado con éxito" });
      await fetchGroups();
    } catch (error: any) {
      setFeedbackMsg({
        type: "error",
        message: error?.message || "Error eliminando grupo",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = search
    ? groups.filter((g) =>
        g.displayName.toLowerCase().includes(search.toLowerCase())
      )
    : groups;

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
          maxWidth: 1000,
          width: "100%",
          p: 3,
          background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
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
              Groups
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de grupos: {groups.length}
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
                label="Buscar por nombre de grupo"
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
                Nuevo Grupo
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 3, overflowX: "auto" }}>
                <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Miembros</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No se encontraron grupos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGroups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>{g.displayName}</TableCell>
                          <TableCell>
                            {g.members && g.members.length > 0
                              ? g.members.map((m) => m.display).join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" onClick={() => handleOpenModal(g)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete(g)}>
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
        <DialogTitle>{isEditing ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nombre del grupo *"
            fullWidth
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            disabled={isEditing}
          />
          {isEditing && (
            <TextField
              margin="dense"
              label="Nuevo nombre (opcional)"
              fullWidth
              value={formData.newDisplayName || ""}
              onChange={(e) => setFormData({ ...formData, newDisplayName: e.target.value })}
            />
          )}
          <TextField
            margin="dense"
            label="Miembros a agregar (username, correo o ID, separados por coma)"
            fullWidth
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
          />
          {isEditing && (
            <TextField
              margin="dense"
              label="Miembros a quitar (username, correo o ID, separados por coma)"
              fullWidth
              value={removeMembersInput}
              onChange={(e) => setRemoveMembersInput(e.target.value)}
            />
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