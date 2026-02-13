// src/pages/Groups.tsx
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
  Chip,
  InputAdornment,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

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

  // Modal "Ver grupo"
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

  // --- carga paginada (cuando NO hay búsqueda exacta activa) ---
  useEffect(() => {
    if (exactSearchRef.current) return;
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
    if (!name.trim()) {
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

  // --- estilos reutilizables (solo UI) ---
  const glassShellSx = {
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.10)",
  } as const;

  const primaryGradient = "linear-gradient(135deg, #42a5f5, #1976d2)";

  const headerLabel = exactSearchRef.current
    ? `Resultados: ${groups.length}`
    : `Total de grupos: ${total}`;

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
                  Groups
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={headerLabel}
                    sx={{
                      backgroundColor: "rgba(66, 165, 245, 0.15)",
                      color: "#1976d2",
                      fontWeight: 800,
                      border: "1px solid rgba(66, 165, 245, 0.3)",
                    }}
                  />
                  <Chip
                    label={`Mostrando: ${filteredGroups.length}`}
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
                  placeholder="Buscar por nombre de grupo "
                  variant="outlined"
                  size="small"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    // al tipear, salimos del modo exacto (si estaba activo)
                    if (exactSearchRef.current) exactSearchRef.current = "";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadExactByName(search);
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
                  Nuevo Grupo
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
                  <Table stickyHeader size="small" sx={{ minWidth: 880 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Miembros</TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="center">
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : filteredGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No se encontraron grupos
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGroups.map((g) => (
                          <TableRow key={g.id || g.displayName} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{g.displayName || "(sin nombre)"}</TableCell>
                            <TableCell sx={{ maxWidth: 520 }}>
                              {Array.isArray(g.members) && g.members.length > 0
                                ? g.members.map((m) => m?.display || m?.value || "—").join(", ")
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
              </Box>

              {/* Paginación: mostrar siempre (como antes). Si estás en exacto, count=total ya viene del backend */}
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
                  onPageChange={(_e, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[50, 100, 200]}
                />
              </Box>

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

      {/* Modal Crear/Editar */}
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
        <DialogTitle sx={{ fontWeight: 900 }}>{isEditing ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            margin="dense"
            label="Nombre del grupo *"
            fullWidth
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            disabled={isEditing}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          {isEditing && (
            <TextField
              margin="dense"
              label="Nuevo nombre (opcional)"
              fullWidth
              value={formData.newDisplayName || ""}
              onChange={(e) => setFormData({ ...formData, newDisplayName: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />
          )}
          <TextField
            margin="dense"
            label="Miembros a agregar (username, correo o ID, separados por coma)"
            fullWidth
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(14px)",
              },
            }}
          />
          {isEditing && (
            <TextField
              margin="dense"
              label="Miembros a quitar (username, correo o ID, separados por coma)"
              fullWidth
              value={removeMembersInput}
              onChange={(e) => setRemoveMembersInput(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />
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

      {/* Modal Ver grupo */}
      <Dialog
        open={openViewModal}
        onClose={() => setOpenViewModal(false)}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Detalles del Grupo</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 900 }}>
            {selectedGroup?.displayName || "(sin nombre)"}
          </Typography>

          {selectedGroup?.members && selectedGroup.members.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {selectedGroup.members.map((m: any) => (
                <Box
                  key={m.value}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                    py: 1,
                    gap: 1,
                  }}
                >
                  <Typography sx={{ color: "rgba(0,0,0,0.75)", fontWeight: 700 }}>
                    {m.display || m.value || "—"}
                  </Typography>
                  <IconButton edge="end" color="error" onClick={() => handleRemoveMember(m.value)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>Sin miembros</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewModal(false)} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
