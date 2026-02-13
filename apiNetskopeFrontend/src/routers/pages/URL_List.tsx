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
  Chip,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Link as RouterLink } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";

import {
  type URLListType,
  type BatchResponse,
  type CreateUrlListResponse,
  fetchUrlLists,
  fetchUrlCount,
  batchUpdateUrlLists,
  deleteUrlListById,
  createUrlList,
  putUrlListById,
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
  const [editName, setEditName] = useState<string>("");
  const [addUrlsText, setAddUrlsText] = useState<string>("");
  const [allowRegexEdit, setAllowRegexEdit] = useState(false);

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
    // eslint-disable-next-line no-restricted-globals
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
    setEditName(list.name);
    setAddUrlsText("");
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
      const resp = await putUrlListById(selectedList.id, editName, combined, allowRegexEdit);

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
      {/* blobs decorativos (igual que Home) */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: 500,
          height: 500,
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
          width: 400,
          height: 400,
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
          maxWidth: 1400,
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
        </Box>

        {/* Card principal (glass) */}
        <Card elevation={0} sx={{ ...glassShellSx }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {/* Título */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.7rem", md: "2.3rem" },
                  color: "#1a1a1a",
                  mb: 0.5,
                }}
              >
                URL Lists
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`Total de URLs: ${totalUrls}`}
                  sx={{
                    backgroundColor: "rgba(66, 165, 245, 0.15)",
                    color: "#1976d2",
                    fontWeight: 700,
                    border: "1px solid rgba(66, 165, 245, 0.3)",
                  }}
                />
                <Chip
                  label={`Listas: ${urlLists.length}`}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                    color: "rgba(0,0,0,0.65)",
                    fontWeight: 700,
                    border: "1px solid rgba(255,255,255,0.7)",
                  }}
                />
              </Box>
            </Box>

            {/* Barra acciones: Crear + Buscar */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: "14px",
                  px: 2,
                  background: primaryGradient,
                  boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
                  "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
                }}
              >
                Crear
              </Button>

              <TextField
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                sx={{ width: "100%", maxWidth: 520 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#1976d2" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    height: 56,
                    borderRadius: "16px",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                    border: "2px solid transparent",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "white",
                      boxShadow: "0 12px 32px rgba(66, 165, 245, 0.18)",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "white",
                      borderColor: "#1976d2",
                      boxShadow: "0 12px 32px rgba(25, 118, 210, 0.25)",
                    },
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    input: { fontWeight: 600 },
                  },
                }}
              />
            </Box>

            {/* Tabla */}
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(12px)",
                  mb: 3,
                }}
              >
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    maxHeight: 380,
                    background: "transparent",
                  }}
                >
                  <Table stickyHeader size="small" aria-label="url list table" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Cant. URLs</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Modificado por</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Fecha Modificación</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Acciones</TableCell>
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
                          <TableRow
                            key={list.id}
                            hover
                            sx={{
                              "&:hover td": { backgroundColor: "rgba(66, 165, 245, 0.06)" },
                            }}
                          >
                            <TableCell>{list.id}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{list.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={list.data.type}
                                size="small"
                                sx={{
                                  backgroundColor: "rgba(66, 165, 245, 0.12)",
                                  border: "1px solid rgba(66, 165, 245, 0.25)",
                                  color: "#1976d2",
                                  fontWeight: 800,
                                }}
                              />
                            </TableCell>
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
              </Box>
            )}

            {/* Feedback */}
            {feedbackMsg.type && (
              <Alert
                severity={feedbackMsg.type}
                onClose={() => setFeedbackMsg({ type: null, message: "" })}
                sx={{ mb: 2, whiteSpace: "pre-line", borderRadius: "16px" }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

            {/* Resumen de creación — CERRABLE */}
            {createSummary && showCreateSummary && (
              <Box
                sx={{
                  ...glassShellSx,
                  p: 2.2,
                  mb: 3,
                  position: "relative",
                  background: "rgba(255,255,255,0.75)",
                }}
              >
                <IconButton
                  size="small"
                  aria-label="cerrar"
                  onClick={() => setShowCreateSummary(false)}
                  sx={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    background: "rgba(255,255,255,0.9)",
                    "&:hover": { background: "rgba(255,255,255,1)" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Typography variant="subtitle1" fontWeight={900} gutterBottom>
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
              </Box>
            )}

            {/* Resumen del último batch — CERRABLE */}
            {batchSummary && showBatchSummary && (
              <Box
                sx={{
                  ...glassShellSx,
                  p: 2.2,
                  mb: 3,
                  position: "relative",
                  background: "rgba(255,255,255,0.75)",
                }}
              >
                <IconButton
                  size="small"
                  aria-label="cerrar"
                  onClick={() => setShowBatchSummary(false)}
                  sx={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    background: "rgba(255,255,255,0.9)",
                    "&:hover": { background: "rgba(255,255,255,1)" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <Typography variant="subtitle1" fontWeight={900} gutterBottom>
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
                  <Typography variant="subtitle2" fontWeight={900} gutterBottom>
                    Resultados por lista:
                  </Typography>
                  <Box
                    sx={{
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.9)",
                      background: "rgba(255,255,255,0.6)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Tipo</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Estatus</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Enviados</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Detalle</TableCell>
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
                </Box>
              </Box>
            )}

            {/* Acción masiva */}
            <Box
              sx={{
                ...glassShellSx,
                mt: 2,
                p: { xs: 2.2, md: 3 },
                background: "rgba(255,255,255,0.75)",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "1.1rem", md: "1.25rem" },
                  mb: 2,
                }}
              >
                Acción masiva
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="action-select-label">Seleccionar acción</InputLabel>
                <Select
                  labelId="action-select-label"
                  value={actionType}
                  label="Seleccionar acción"
                  onChange={(e) => setActionType(e.target.value as "append" | "replace")}
                  sx={{
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  }}
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
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
                placeholder="Ej: 77, 79, [Semillero] AllowList"
              />

              <FormControlLabel
                control={<Checkbox checked={allowRegex} onChange={(e) => setAllowRegex(e.target.checked)} />}
                label="Permitir Regex (solo listas tipo regex)"
                sx={{ mb: 1.5 }}
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
                sx={{
                  mb: 2.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
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
                  py: 1.4,
                  fontWeight: 900,
                  textTransform: "none",
                  borderRadius: "16px",
                  background: primaryGradient,
                  boxShadow: "0 12px 28px rgba(25, 118, 210, 0.28)",
                  "&:hover": { boxShadow: "0 18px 36px rgba(66, 165, 245, 0.32)" },
                }}
              >
                {loading ? <CircularProgress size={24} /> : "Ejecutar Acción"}
              </Button>
            </Box>

            {/* Footer */}
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

      {/* Modal ver/editar */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editMode ? "Editar URL List" : "Ver URL List"}
        </DialogTitle>

        <DialogContent dividers>
          {editMode ? (
            <>
              <TextField
                label="Nombre de la lista"
                fullWidth
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 900 }}>
                URLs existentes (puedes eliminar con el icono)
              </Typography>
              <List
                sx={{
                  maxHeight: 220,
                  overflowY: "auto",
                  mb: 2,
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.9)",
                }}
              >
                {editableUrls.map((url) => (
                  <ListItem
                    key={url}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleDeleteUrlFromEdit(url)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={url} />
                  </ListItem>
                ))}
                {editableUrls.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 2, mb: 2 }}
                  >
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
                sx={{
                  mb: 1.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />

              <FormControlLabel
                control={<Checkbox checked={allowRegexEdit} onChange={(e) => setAllowRegexEdit(e.target.checked)} />}
                label="Permitir Regex (si usas sintaxis regex)"
                sx={{ mb: 0.5 }}
              />
            </>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 900 }}>
                {selectedList?.name} — {selectedList?.data.type} — {selectedList?.data.urls.length} URLs
              </Typography>

              <List
                sx={{
                  maxHeight: 320,
                  overflowY: "auto",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.9)",
                }}
              >
                {selectedList?.data.urls.map((url) => (
                  <ListItem key={url}>
                    <ListItemText primary={url} />
                  </ListItem>
                ))}
                {selectedList?.data.urls.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 2, mb: 2 }}
                  >
                    No hay URLs en esta lista.
                  </Typography>
                )}
              </List>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: "14px" }}
          >
            Cerrar
          </Button>
          {editMode && (
            <Button
              variant="contained"
              onClick={handleSaveEdit}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                borderRadius: "14px",
                background: primaryGradient,
                boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
              }}
            >
              Guardar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal Crear */}
      <Dialog
        open={openCreate}
        onClose={handleCloseCreate}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Crear URL List</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Nombre de la lista"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                backgroundColor: "rgba(255,255,255,0.95)",
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
              },
            }}
          />
          <FormControlLabel
            control={<Checkbox checked={newAllowRegex} onChange={(e) => setNewAllowRegex(e.target.checked)} />}
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
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                backgroundColor: "rgba(255,255,255,0.95)",
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button
            onClick={handleCloseCreate}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: "14px" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateList}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: "14px",
              background: primaryGradient,
              boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
            }}
          >
            Crear lista
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
