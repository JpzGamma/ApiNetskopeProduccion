import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Stack,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Link as RouterLink } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  type URLListType,
  type BatchResponse,
  type CreateUrlListResponse,
  fetchUrlLists,
  fetchUrlCount,
  batchUpdateUrlLists,
  deleteUrlListById,
  createUrlList,
  putUrlListById, // ⬅️ nuevo
} from "../../services/URL_List";

export default function URL_List() {
  const [searchName, setSearchName] = useState("");
  const [urlLists, setUrlLists] = useState<URLListType[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUrls, setTotalUrls] = useState(0);

  // Acción masiva
  const [actionType, setActionType] = useState<"append" | "replace">("append");
  const [idsOrNames, setIdsOrNames] = useState("");
  const [urlsInput, setUrlsInput] = useState("");
  const [allowRegex, setAllowRegex] = useState(false);

  // Feedback + resúmenes (cerrables)
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "error" | "success" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  const [batchSummary, setBatchSummary] = useState<BatchResponse | null>(null);
  const [showBatchSummary, setShowBatchSummary] = useState(false);

  // Dialog ver/editar
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<URLListType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableUrls, setEditableUrls] = useState<string[]>([]);
  const [editName, setEditName] = useState<string>("");        // ⬅️ nuevo (renombrar)
  const [addUrlsText, setAddUrlsText] = useState<string>("");  // ⬅️ nuevo (añadir)
  const [allowRegexEdit, setAllowRegexEdit] = useState(false); // ⬅️ nuevo (regex en edición)

  // Modal Crear
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAllowRegex, setNewAllowRegex] = useState(false);
  const [newUrls, setNewUrls] = useState("");
  const [createSummary, setCreateSummary] = useState<CreateUrlListResponse | null>(null);
  const [showCreateSummary, setShowCreateSummary] = useState(false);

  useEffect(() => {
    loadUrlLists();
    loadUrlCount();
  }, []);

  const loadUrlLists = async () => {
    setLoading(true);
    try {
      const data = await fetchUrlLists();
      setUrlLists(data);
    } catch {
      setFeedbackMsg({ type: "error", message: "Error cargando URL Lists." });
    } finally {
      setLoading(false);
    }
  };

  const loadUrlCount = async () => {
    try {
      const count = await fetchUrlCount();
      setTotalUrls(count);
    } catch {}
  };

  /* ---------- Submit batch ---------- */

  const handleSubmit = async () => {
    setFeedbackMsg({ type: null, message: "" });
    setBatchSummary(null);
    setShowBatchSummary(false);

    if (!idsOrNames.trim()) {
      setFeedbackMsg({ type: "error", message: "Debes ingresar IDs o nombres." });
      return;
    }
    if (!urlsInput.trim()) {
      setFeedbackMsg({ type: "error", message: "Debes ingresar URLs para la acción." });
      return;
    }

    const urls = urlsInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const invalids = urls.filter((u) => u.length < 2);
    if (invalids.length > 0) {
      setFeedbackMsg({
        type: "error",
        message: `Entradas inválidas:\n${invalids.join(", ")}`,
      });
      return;
    }

    setLoading(true);
    try {
      const resp = await batchUpdateUrlLists(actionType, idsOrNames, urlsInput, allowRegex);
      setBatchSummary(resp);
      setShowBatchSummary(true);
      setFeedbackMsg({
        type: "success",
        message: `Acción "${actionType}" ejecutada. Deploy aplicado automáticamente.`,
      });
      setIdsOrNames("");
      setUrlsInput("");
      setAllowRegex(false);
      await Promise.all([loadUrlLists(), loadUrlCount()]);
    } catch (error: any) {
      setFeedbackMsg({ type: "error", message: error?.message ?? "Error al ejecutar la acción." });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Delete (por ID) ---------- */

  const handleDeleteList = async (list: URLListType) => {
    if (!confirm(`¿Eliminar la URL List "${list.name}" (ID ${list.id})?`)) return;
    setLoading(true);
    try {
      await deleteUrlListById(list.id);
      setFeedbackMsg({
        type: "success",
        message: `Lista ${list.id} eliminada. Deploy aplicado automáticamente.`,
      });
      await Promise.all([loadUrlLists(), loadUrlCount()]);
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message ?? "Error al eliminar." });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Tabla / filtros ---------- */

  const filteredUrls = useMemo(() => {
    if (!searchName) return urlLists;
    const needle = searchName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return urlLists.filter((u) =>
      u.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(needle)
    );
  }, [searchName, urlLists]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ---------- Dialog ver/editar ---------- */

  const handleOpenDialog = (list: URLListType, isEdit = false) => {
    setSelectedList(list);
    setEditMode(isEdit);
    setEditableUrls(list.data.urls);
    setEditName(list.name);   // pre-carga nombre
    setAddUrlsText("");       // limpia textarea de altas
    setAllowRegexEdit(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedList(null);
    setEditMode(false);
  };

  const handleDeleteUrlFromEdit = (url: string) => {
    setEditableUrls((prev) => prev.filter((u) => u !== url));
  };

  // Guardar edición con PUT: nombre + (urls existentes - borradas + nuevas)
  const handleSaveEdit = async () => {
    if (!selectedList) return;

    const newOnes = addUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const combined = [...editableUrls, ...newOnes];

    if (combined.length === 0) {
      setFeedbackMsg({ type: "error", message: "La lista no puede quedar vacía." });
      return;
    }

    setLoading(true);
    try {
      const resp = await putUrlListById(
        selectedList.id,
        editName,
        combined,
        allowRegexEdit
      );

      const rejected = (resp as any)?.put?.rejected ?? [];
      if (Array.isArray(rejected) && rejected.length > 0) {
        setFeedbackMsg({
          type: "info",
          message: `Algunas entradas fueron rechazadas por validación: ${rejected.join(", ")}`,
        });
      } else {
        setFeedbackMsg({ type: "success", message: "Lista actualizada correctamente." });
      }

      await loadUrlLists();
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message ?? "Error al actualizar la lista." });
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };

  /* ---------- Crear (modal) ---------- */

  const handleOpenCreate = () => {
    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    setNewName("");
    setNewAllowRegex(false);
    setNewUrls("");
  };

  const handleCreateList = async () => {
    setFeedbackMsg({ type: null, message: "" });
    setCreateSummary(null);
    setShowCreateSummary(false);

    if (!newName.trim()) {
      setFeedbackMsg({ type: "error", message: "Debes ingresar un nombre para la lista." });
      return;
    }
    if (!newUrls.trim()) {
      setFeedbackMsg({ type: "error", message: "Debes ingresar al menos una URL." });
      return;
    }

    setLoading(true);
    try {
      const resp = await createUrlList(newName.trim(), newUrls, newAllowRegex);
      setCreateSummary(resp);
      setShowCreateSummary(true);
      setFeedbackMsg({
        type: "success",
        message: `Lista creada como '${resp.create.type_used}'. Deploy aplicado automáticamente.`,
      });
      handleCloseCreate();
      await Promise.all([loadUrlLists(), loadUrlCount()]);
    } catch (e: any) {
      setFeedbackMsg({ type: "error", message: e?.message ?? "Error al crear la lista." });
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: 1200,
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
              URL Lists
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de URLs: {totalUrls}
            </Typography>

            {/* Buscador + Crear */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              <Button variant="contained" onClick={handleOpenCreate} sx={{ textTransform: "none" }}>
                Crear
              </Button>

              <TextField
                label="Buscar URL List (nombre)"
                variant="outlined"
                size="small"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                sx={{ width: "100%", maxWidth: 400 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 350, mb: 3, overflowX: "auto" }}>
                <Table stickyHeader size="small" aria-label="url list table" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Cant. URLs</TableCell>
                      <TableCell>Modificado por</TableCell>
                      <TableCell>Fecha Modificación</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUrls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No se encontraron resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUrls.map((list) => (
                        <TableRow key={list.id}>
                          <TableCell>{list.id}</TableCell>
                          <TableCell>{list.name}</TableCell>
                          <TableCell>{list.data.type}</TableCell>
                          <TableCell>{list.data.urls.length}</TableCell>
                          <TableCell>{list.modify_by}</TableCell>
                          <TableCell>{formatDate(list.modify_time)}</TableCell>
                          <TableCell>
                            <Tooltip title="Ver">
                              <IconButton onClick={() => handleOpenDialog(list, false)} color="primary">
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton onClick={() => handleOpenDialog(list, true)} sx={{ color: "#FFA726" }}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton onClick={() => handleDeleteList(list)} color="error">
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

            {/* Alert de feedback (verde/rojo) */}
            {feedbackMsg.type && (
              <Alert
                severity={feedbackMsg.type}
                onClose={() => setFeedbackMsg({ type: null, message: "" })}
                sx={{ mb: 2, whiteSpace: "pre-line" }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

            {/* Resumen de creación — CERRABLE */}
            {createSummary && showCreateSummary && (
              <Paper sx={{ p: 2, mb: 3, position: "relative" }}>
                <IconButton
                  size="small"
                  aria-label="cerrar"
                  onClick={() => setShowCreateSummary(false)}
                  sx={{ position: "absolute", right: 8, top: 8 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Lista creada
                </Typography>
                <Typography variant="body2">
                  <b>ID:</b> {createSummary.create.created.id ?? "—"} — <b>Tipo:</b>{" "}
                  {createSummary.create.type_used} — <b>Enviados:</b> {createSummary.create.sent}
                </Typography>
                {createSummary.create.rejected.length > 0 && (
                  <Typography variant="caption" color="error">
                    Rechazados: {createSummary.create.rejected.join(", ")}
                  </Typography>
                )}
              </Paper>
            )}

            {/* Resumen del último batch — CERRABLE */}
            {batchSummary && showBatchSummary && (
              <Paper sx={{ p: 2, mb: 3, position: "relative" }}>
                <IconButton
                  size="small"
                  aria-label="cerrar"
                  onClick={() => setShowBatchSummary(false)}
                  sx={{ position: "absolute", right: 8, top: 8 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Resumen de la carga
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  divider={<Divider flexItem orientation="vertical" />}
                >
                  <Box>
                    <Typography variant="body2">
                      <b>Targets:</b> {batchSummary.targets.join(", ") || "—"}
                    </Typography>
                    {batchSummary.not_found_names.length > 0 && (
                      <Typography variant="body2" color="warning.main">
                        <b>No encontrados:</b> {batchSummary.not_found_names.join(", ")}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2">
                      <b>Aceptados (exact):</b> {batchSummary.accepted.exact.length}
                    </Typography>
                    <Typography variant="body2">
                      <b>Wildcard como exact:</b> {batchSummary.accepted.wildcard_as_exact.length}
                    </Typography>
                    {batchSummary.accepted.regex && (
                      <Typography variant="body2">
                        <b>Regex:</b> {batchSummary.accepted.regex.length}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="error">
                      <b>Rechazados:</b> {batchSummary.rejected.length}
                    </Typography>
                  </Box>
                </Stack>

                {batchSummary.rejected.length > 0 && (
                  <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                    <b>Rechazados:</b> {batchSummary.rejected.join(", ")}
                  </Typography>
                )}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resultados por lista:
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Estatus</TableCell>
                        <TableCell>Enviados</TableCell>
                        <TableCell>Detalle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {batchSummary.results.map((r) => (
                        <TableRow key={`${r.id}-${r.type}`}>
                          <TableCell>{r.id}</TableCell>
                          <TableCell>{r.type}</TableCell>
                          <TableCell>{r.status}</TableCell>
                          <TableCell>{r.sent ?? "—"}</TableCell>
                          <TableCell
                            sx={{
                              maxWidth: 380,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.error || r.reason || "OK"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            )}

            {/* Acción masiva */}
            <Box
              sx={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                pt: 3,
                textAlign: "left",
                maxWidth: 700,
                mx: "auto",
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Acción masiva
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="action-select-label">Seleccionar acción</InputLabel>
                <Select
                  labelId="action-select-label"
                  value={actionType}
                  label="Seleccionar acción"
                  onChange={(e) => setActionType(e.target.value as "append" | "replace")}
                >
                  <MenuItem value="append">Añadir</MenuItem>
                  <MenuItem value="replace">Reemplazar</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="IDs o Nombres (separados por coma)"
                variant="outlined"
                fullWidth
                size="small"
                value={idsOrNames}
                onChange={(e) => setIdsOrNames(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Ej: 77, 79, [Semillero] AllowList"
              />

              <FormControlLabel
                control={<Checkbox checked={allowRegex} onChange={(e) => setAllowRegex(e.target.checked)} />}
                label="Permitir Regex (solo listas tipo regex)"
                sx={{ mb: 2 }}
              />

              <TextField
                label="Ingresa URLs (una por línea)"
                variant="outlined"
                fullWidth
                multiline
                rows={6}
                size="small"
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                sx={{ mb: 3 }}
                placeholder={`example.com
www.example.com
*.example.com
sub.domain.com
example.com/path/to/page`}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                disabled={loading}
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
                {loading ? <CircularProgress size={24} /> : "Ejecutar Acción"}
              </Button>
            </Box>

            {/* Botón volver */}
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
      {/* Modal ver/editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editMode ? "Editar URL List" : "Ver URL List"}
        </DialogTitle>

        <DialogContent dividers>
          {editMode ? (
            <>
              <TextField
                label="Nombre de la lista"
                fullWidth
                sx={{ mb: 2 }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                URLs existentes (puedes eliminar con el icono)
              </Typography>
              <List sx={{ maxHeight: 220, overflowY: "auto", mb: 2 }}>
                {editableUrls.map((url) => (
                  <ListItem
                    key={url}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteUrlFromEdit(url)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={url} />
                  </ListItem>
                ))}
                {editableUrls.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
                    No hay URLs en esta lista.
                  </Typography>
                )}
              </List>

              <TextField
                label="Añadir nuevas URLs (una por línea)"
                fullWidth
                multiline
                rows={5}
                value={addUrlsText}
                onChange={(e) => setAddUrlsText(e.target.value)}
                placeholder={`example.com
*.example.com
sub.dominio.com`}
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowRegexEdit}
                    onChange={(e) => setAllowRegexEdit(e.target.checked)}
                  />
                }
                label="Permitir Regex (si usas sintaxis regex)"
                sx={{ mb: 1 }}
              />
            </>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {selectedList?.name} — {selectedList?.data.type} — {selectedList?.data.urls.length} URLs
              </Typography>
              <List sx={{ maxHeight: 300, overflowY: "auto" }}>
                {selectedList?.data.urls.map((url) => (
                  <ListItem key={url}>
                    <ListItemText primary={url} />
                  </ListItem>
                ))}
                {selectedList?.data.urls.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
                    No hay URLs en esta lista.
                  </Typography>
                )}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cerrar</Button>
          {editMode && (
            <Button variant="contained" onClick={handleSaveEdit}>
              Guardar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal Crear */}
      <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="sm">
        <DialogTitle>Crear URL List</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Nombre de la lista"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newAllowRegex}
                onChange={(e) => setNewAllowRegex(e.target.checked)}
              />
            }
            label="Permitir Regex (si contiene sintaxis de regex)"
            sx={{ mb: 2 }}
          />
          <TextField
            label="URLs iniciales (una por línea)"
            value={newUrls}
            onChange={(e) => setNewUrls(e.target.value)}
            fullWidth
            multiline
            rows={6}
            placeholder={`example.com
www.example.com
*.example.com
sub.domain.com
example.com/path/to/page`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateList}>
            Crear lista
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}