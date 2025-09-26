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
  Tooltip,
  TablePagination,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based
  const [rowsPerPage, setRowsPerPage] = useState(100);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "error" | "success" | null; message: string; }>({ type: null, message: "" });

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{ id?: string; displayName: string; newDisplayName?: string; }>({ displayName: "" });
  const [membersInput, setMembersInput] = useState("");
  const [removeMembersInput, setRemoveMembersInput] = useState("");

  // Modal "Ver grupo"
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

  // --- carga paginada (cuando NO hay búsqueda exacta activa) ---
  useEffect(() => {
    void loadPaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  async function loadPaged() {
    setLoading(true);
    try {
      const startIndex = page * rowsPerPage + 1;
      const { groups, total } = await fetchGroupsService({ startIndex, count: rowsPerPage });
      setGroups(groups);
      setTotal(total);
    } catch (error: any) {
      setFeedbackMsg({ type: "error", message: error?.message || "Error cargando grupos." });
    } finally {
      setLoading(false);
    }
  }

  // Buscar exacto en backend al presionar Enter (opcional)
  const exactSearchRef = useRef<string>("");
  async function loadExactByName(name: string) {
    if (!name.trim()) { // limpiar y volver a paginado
      exactSearchRef.current = "";
      setPage(0);
      await loadPaged();
      return;
    }
    setLoading(true);
    try {
      exactSearchRef.current = name.trim();
      const { groups, total } = await fetchGroupsService({ name: name.trim() });
      setGroups(groups);
      setTotal(total);
      setPage(0);
    } catch (error: any) {
      setGroups([]);
      setTotal(0);
      setFeedbackMsg({ type: "error", message: error?.message || "Error buscando grupo." });
    } finally {
      setLoading(false);
    }
  }

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
        await createGroupService(formData.displayName, membersInput ? membersInput.split(",") : []);
        setFeedbackMsg({ type: "success", message: "Grupo creado con éxito" });
      }

      handleCloseModal();
      // recargar según si hay búsqueda exacta activa o no
      if (exactSearchRef.current) {
        await loadExactByName(exactSearchRef.current);
      } else {
        await loadPaged();
      }
    } catch (error: any) {
      setFeedbackMsg({ type: "error", message: error?.message || "Error en la operación." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (group: GroupType) => {
    if (!window.confirm("¿Seguro que deseas eliminar este grupo?")) return;
    setLoading(true);
    try {
      await deleteGroupService(group);
      setFeedbackMsg({ type: "success", message: "Grupo eliminado con éxito" });
      if (exactSearchRef.current) {
        await loadExactByName(exactSearchRef.current);
      } else {
        await loadPaged();
      }
    } catch (error: any) {
      setFeedbackMsg({ type: "error", message: error?.message || "Error eliminando grupo" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroup = (group: GroupType) => {
    setSelectedGroup(group);
    setOpenViewModal(true);
  };

  const handleRemoveMember = async (memberValue: string) => {
    if (!selectedGroup) return;
    if (!window.confirm(`¿Seguro que deseas eliminar a ${memberValue}?`)) return;

    setLoading(true);
    try {
      await updateGroupService(selectedGroup.id, selectedGroup.displayName, undefined, [], [memberValue]);
      setFeedbackMsg({ type: "success", message: "Miembro eliminado con éxito" });
      if (exactSearchRef.current) {
        await loadExactByName(exactSearchRef.current);
      } else {
        await loadPaged();
      }
      const updated = groups.find((g) => g.id === selectedGroup.id);
      if (updated) setSelectedGroup(updated);
    } catch (error: any) {
      setFeedbackMsg({ type: "error", message: error?.message || "Error eliminando miembro" });
    } finally {
      setLoading(false);
    }
  };

  // —— Filtro local (contains) sobre lo que esté cargado en la tabla ——
  const filteredGroups = useMemo(() => {
    const needle = (search || "").toLowerCase().trim();
    if (!needle) return groups;
    return groups.filter((g) => (g?.displayName || "").toLowerCase().includes(needle));
  }, [search, groups]);

  const handleChangePage = (_: any, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 2, background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)" }}>
      <Box sx={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)", maxWidth: 1000, width: "100%", p: 3, background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)" }}>
        <Card elevation={0} sx={{ background: "transparent", boxShadow: "none" }}>
          <CardContent sx={{ textAlign: "center" }}>
            <RouterLink to="/home">
              <Box component="img" src="/LogoNetskopeAzul.jpeg" alt="Logo" sx={{ width: 70, height: 70, borderRadius: 6, boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)", mb: 2, mx: "auto" }} />
            </RouterLink>
            <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>Groups</Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>Total de grupos (tenant): {total}</Typography>

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
              <TextField
                label="Buscar por nombre de grupo"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // Enter -> búsqueda exacta en backend (opcional)
                    void loadExactByName(search);
                  }
                }}
                sx={{ width: "100%", maxWidth: 400 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ backgroundColor: "#42a5f5", ":hover": { backgroundColor: "#66b9ff" } }}
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
              <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 1.5, overflowX: "auto" }}>
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
                        <TableCell colSpan={3} align="center">No se encontraron grupos</TableCell>
                      </TableRow>
                    ) : (
                      filteredGroups.map((g) => (
                        <TableRow key={g.id || g.displayName}>
                          <TableCell>{g.displayName || "(sin nombre)"}</TableCell>
                          <TableCell sx={{ maxWidth: 520 }}>
                            {Array.isArray(g.members) && g.members.length > 0
                              ? g.members.map((m) => (m?.display || m?.value || "—")).join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Ver">
                              <IconButton onClick={() => handleViewGroup(g)} color="primary">
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton onClick={() => handleOpenModal(g)} sx={{ color: "#FFA726" }}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton onClick={() => handleDeleteGroup(g)} color="error">
                                <DeleteIcon />
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
              rowsPerPageOptions={[50, 100, 200]}
            />

            {feedbackMsg.type && (
              <Alert severity={feedbackMsg.type} onClose={() => setFeedbackMsg({ type: null, message: "" })} sx={{ mb: 2 }}>
                {feedbackMsg.message}
              </Alert>
            )}

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button component={RouterLink} to="/home" variant="contained" sx={{ py: 1.3, fontWeight: 600, textTransform: "none", backgroundColor: "#42a5f5", borderRadius: 2, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)", ":hover": { backgroundColor: "#66b9ff" } }}>
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
          <Button variant="contained" onClick={handleSubmit}>{isEditing ? "Actualizar" : "Crear"}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver grupo */}
      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>Detalles del Grupo</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>{selectedGroup?.displayName || "(sin nombre)"}</Typography>
          {selectedGroup?.members && selectedGroup.members.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {selectedGroup.members.map((m) => (
                <Box key={m.value} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", py: 1 }}>
                  <Typography>{m.display || m.value || "—"}</Typography>
                  <IconButton edge="end" color="error" onClick={() => handleRemoveMember(m.value)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography>Sin miembros</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">&copy; 2025 ApiNetskope</Typography>
      </Box>
    </Box>
  );
}