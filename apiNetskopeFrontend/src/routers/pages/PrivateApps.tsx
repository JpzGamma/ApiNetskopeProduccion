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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tooltip,
  InputAdornment,
  Autocomplete,
  Chip,
  Switch,
  Divider,
  Stack,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";

import {
  type PrivateAppType,
  type PublisherType,
  fetchPrivateAppsService,
  fetchPublishersService,
  createPrivateAppService,
  updatePrivateAppService,
  deletePrivateAppService,
  bulkCreatePrivateAppsService,
} from "../../services/PrivateApps";

export default function PrivateApps() {
  const [apps, setApps] = useState<PrivateAppType[]>([]);
  const [filteredApps, setFilteredApps] = useState<PrivateAppType[]>([]);
  const [publishers, setPublishers] = useState<PublisherType[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "error" | "success" | null; message: string }>({
    type: null,
    message: "",
  });
  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState<Partial<PrivateAppType> & { hostsArray: string[] }>({
    app_name: "",
    host: "",
    hostsArray: [""],
    protocols: [{ transport: "tcp", port: "80" }],
    publishers: [],
    tags: [],
  });
  const [editingApp, setEditingApp] = useState<PrivateAppType | null>(null);

  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<PrivateAppType | null>(null);

  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredApps(apps);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredApps(
        apps.filter(
          (a) =>
            (a.app_name || "").toLowerCase().includes(lowerSearch) ||
            String(a.app_id || "").includes(lowerSearch)
        )
      );
    }
  }, [search, apps]);

  // --- Fetch functions ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const appsData = await fetchPrivateAppsService();
      const pubsData = await fetchPublishersService();
      setApps(appsData);
      setFilteredApps(appsData);
      setPublishers(pubsData);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", message: err?.message || "Error cargando datos" });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Private Apps ---
  const handleOpenModal = (app?: PrivateAppType) => {
    if (app) {
      setFormData({
        ...app,
        hostsArray: app.host ? app.host.split(",").filter(Boolean) : [""],
      });
      setEditingApp(app);
    } else {
      setFormData({
        app_name: "",
        host: "",
        hostsArray: [""],
        protocols: [{ transport: "tcp", port: "80" }],
        publishers: [],
        tags: [],
      });
      setEditingApp(null);
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingApp(null);
  };

  const handleSaveApp = async () => {
    setLoading(true);
    try {
      const payload: Partial<PrivateAppType> & { host?: string } = {
        app_name: formData.app_name,
        host: (formData.hostsArray || []).filter(Boolean).join(","),
        protocols: (formData.protocols || []).map((p: any) => ({
          type: (p.transport || p.type || "").toLowerCase(),
          port: String(p.port || ""),
        })),
        publishers: (formData.publishers || []).map((p: any) => ({
          publisher_id: p.publisher_id,
          publisher_name: p.publisher_name,
        })),
        tags: formData.tags || [],
        usePublisherDns: !!formData.usePublisherDns,
      };

      if (editingApp && editingApp.app_id) {
        await updatePrivateAppService(editingApp.app_id, payload);
        setFeedbackMsg({ type: "success", message: "Private App editada con éxito" });
      } else {
        await createPrivateAppService(payload);
        setFeedbackMsg({ type: "success", message: "Private App creada con éxito" });
      }
      handleCloseModal();
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", message: err?.message || "Error guardando Private App" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApp = async (app_id?: number) => {
    if (!app_id) return;
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("¿Seguro que deseas eliminar esta Private App?")) return;
    setLoading(true);
    try {
      await deletePrivateAppService(app_id);
      setFeedbackMsg({ type: "success", message: "Private App eliminada" });
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", message: err?.message || "Error eliminando Private App" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setLoading(true);
    try {
      await bulkCreatePrivateAppsService(bulkFile);
      setFeedbackMsg({ type: "success", message: "Carga masiva exitosa" });
      setBulkFile(null);
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", message: err?.message || "Error en carga masiva" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenViewModal = (app: PrivateAppType) => {
    setSelectedApp(app);
    setOpenViewModal(true);
  };

  const handleCloseViewModal = () => setOpenViewModal(false);

  const formatTagsForDisplay = (rawTags: any[] | undefined) => {
    if (!Array.isArray(rawTags) || rawTags.length === 0) return [];
    return rawTags
      .map((t) =>
        typeof t === "string"
          ? t
          : t.name || t.label || (t as any).value || (t as any).tag_name || (t.toString ? t.toString() : null)
      )
      .filter(Boolean) as string[];
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

  const chipTypeSx = {
    backgroundColor: "rgba(66, 165, 245, 0.12)",
    border: "1px solid rgba(66, 165, 245, 0.25)",
    color: "#1976d2",
    fontWeight: 800,
  } as const;

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
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(66, 165, 245, 0.2) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-12%",
          left: "-6%",
          width: 430,
          height: 430,
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
          maxWidth: 1500,
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
              fontWeight: 800,
              borderRadius: "14px",
              px: 2.2,
              background: primaryGradient,
              boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
              "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
            }}
          >
            Volver
          </Button>
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
                Private Apps
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`Total de apps: ${apps.length}`}
                  sx={{
                    backgroundColor: "rgba(66, 165, 245, 0.15)",
                    color: "#1976d2",
                    fontWeight: 700,
                    border: "1px solid rgba(66, 165, 245, 0.3)",
                  }}
                />
                <Chip
                  label={`Publishers: ${publishers.length}`}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                    color: "rgba(0,0,0,0.65)",
                    fontWeight: 700,
                    border: "1px solid rgba(255,255,255,0.7)",
                  }}
                />
              </Box>
            </Box>

            {/* Barra acciones: buscar + botones */}
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
              <TextField
                placeholder="Buscar por nombre o ID..."
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

              <Box
                sx={{
                  display: "flex",
                  gap: 1.2,
                  flexWrap: "wrap",
                  width: { xs: "100%", md: "auto" },
                  justifyContent: { xs: "stretch", md: "flex-end" },
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenModal()}
                  sx={{
                    textTransform: "none",
                    fontWeight: 900,
                    borderRadius: "14px",
                    px: 2,
                    background: primaryGradient,
                    boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
                    "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
                    flex: { xs: 1, sm: "unset" },
                  }}
                >
                  Nueva Private App
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  component="label"
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: "14px",
                    borderColor: "rgba(25,118,210,0.35)",
                    backgroundColor: "rgba(255,255,255,0.65)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.85)" },
                    flex: { xs: 1, sm: "unset" },
                  }}
                >
                  Subir CSV/XLSX
                  <input type="file" hidden onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
                </Button>

                {bulkFile && (
                  <Button
                    variant="contained"
                    onClick={handleBulkUpload}
                    sx={{
                      textTransform: "none",
                      fontWeight: 900,
                      borderRadius: "14px",
                      px: 2,
                      background: primaryGradient,
                      boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
                      "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
                      flex: { xs: 1, sm: "unset" },
                    }}
                  >
                    Cargar {bulkFile.name}
                  </Button>
                )}
              </Box>
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
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600, background: "transparent" }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 1100 }} aria-label="private apps table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Host</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Protocols</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Publishers</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Tags</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="center">
                          Acciones
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="center">
                          Políticas
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredApps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No hay Private Apps
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApps.map((a) => {
                          const protocolsDisplay =
                            a.protocols && a.protocols.length > 0
                              ? a.protocols.map((p) => `${p.transport || p.type}:${p.port}`).join(", ")
                              : "N/A";
                          const publishersDisplay =
                            a.publishers && a.publishers.length > 0
                              ? a.publishers.map((p) => p.publisher_name || "Sin nombre").join(", ")
                              : "N/A";
                          const tagsList = formatTagsForDisplay(a.tags || a.labels);

                          return (
                            <TableRow
                              key={a.app_id}
                              hover
                              sx={{
                                "&:hover td": { backgroundColor: "rgba(66, 165, 245, 0.06)" },
                              }}
                            >
                              <TableCell>{a.app_id}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{a.app_name || "N/A"}</TableCell>

                              <TableCell>
                                <Tooltip title={a.host || "N/A"}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      maxWidth: 180,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {a.host || "N/A"}
                                  </span>
                                </Tooltip>
                              </TableCell>

                              <TableCell>
                                <Tooltip title={protocolsDisplay}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      maxWidth: 180,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {protocolsDisplay}
                                  </span>
                                </Tooltip>
                              </TableCell>

                              <TableCell>
                                <Tooltip title={publishersDisplay}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      maxWidth: 220,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {publishersDisplay}
                                  </span>
                                </Tooltip>
                              </TableCell>

                              <TableCell>
                                {tagsList.length > 0 ? (
                                  <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", maxWidth: 260 }}>
                                    {tagsList.slice(0, 3).map((t) => (
                                      <Chip key={t} size="small" label={t} sx={chipTypeSx} />
                                    ))}
                                    {tagsList.length > 3 && (
                                      <Chip size="small" label={`+${tagsList.length - 3}`} sx={chipTypeSx} />
                                    )}
                                  </Box>
                                ) : (
                                  "Sin tags"
                                )}
                              </TableCell>

                              <TableCell align="center">
                                <Tooltip title="Editar">
                                  <IconButton sx={{ color: "#FFA726" }} onClick={() => handleOpenModal(a)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Ver">
                                  <IconButton color="primary" onClick={() => handleOpenViewModal(a)}>
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <IconButton color="error" onClick={() => handleDeleteApp(a.app_id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>

                              <TableCell align="center">
                                <Button
                                  component={RouterLink}
                                  to={`/policies?new=1&fromApp=${encodeURIComponent(a.app_name || "")}`}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 800,
                                    borderRadius: "12px",
                                    borderColor: "rgba(25,118,210,0.35)",
                                    backgroundColor: "rgba(255,255,255,0.55)",
                                    "&:hover": { backgroundColor: "rgba(255,255,255,0.85)" },
                                  }}
                                >
                                  Crear Política
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
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
                sx={{ mb: 2, borderRadius: "16px" }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

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

      {/* Modal Crear / Editar */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
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
          {editingApp ? "Editar Private App" : "Nueva Private App"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Nombre */}
          <TextField
            label="Nombre *"
            fullWidth
            value={formData.app_name || ""}
            onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                backgroundColor: "rgba(255,255,255,0.95)",
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
              },
            }}
          />

          {/* Hosts múltiples */}
          {formData.hostsArray?.map((host, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                label={`Host ${idx + 1}`}
                value={host || ""}
                onChange={(e) => {
                  const newHosts = [...(formData.hostsArray || [])];
                  newHosts[idx] = e.target.value;
                  setFormData({ ...formData, hostsArray: newHosts });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />

              {idx === (formData.hostsArray?.length || 1) - 1 && (
                <IconButton
                  color="primary"
                  onClick={() =>
                    setFormData({ ...formData, hostsArray: [...(formData.hostsArray || []), ""] })
                  }
                  sx={{
                    borderRadius: "14px",
                    background: "rgba(66,165,245,0.12)",
                    border: "1px solid rgba(66,165,245,0.25)",
                    "&:hover": { background: "rgba(66,165,245,0.18)" },
                  }}
                >
                  <AddIcon />
                </IconButton>
              )}

              {formData.hostsArray.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      hostsArray: formData.hostsArray.filter((_, i) => i !== idx),
                    })
                  }
                  sx={{
                    borderRadius: "14px",
                    background: "rgba(244,67,54,0.08)",
                    border: "1px solid rgba(244,67,54,0.20)",
                    "&:hover": { background: "rgba(244,67,54,0.12)" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}

          {/* Protocolos múltiples */}
          {formData.protocols?.map((p: any, i: number) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              >
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={p.transport || p.type}
                  label="Tipo"
                  onChange={(e) => {
                    const newProtocols = [...(formData.protocols || [])];
                    newProtocols[i] = { ...newProtocols[i], transport: e.target.value as "tcp" | "udp" };
                    setFormData({ ...formData, protocols: newProtocols });
                  }}
                >
                  <MenuItem value="tcp">TCP</MenuItem>
                  <MenuItem value="udp">UDP</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Puerto"
                type="number"
                value={p.port || ""}
                onChange={(e) => {
                  const newProtocols = [...(formData.protocols || [])];
                  newProtocols[i] = { ...newProtocols[i], port: e.target.value };
                  setFormData({ ...formData, protocols: newProtocols });
                }}
                sx={{
                  width: 160,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />

              <IconButton
                color="error"
                onClick={() => {
                  const newProtocols = [...(formData.protocols || [])];
                  newProtocols.splice(i, 1);
                  setFormData({ ...formData, protocols: newProtocols });
                }}
                sx={{
                  borderRadius: "14px",
                  background: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.20)",
                  "&:hover": { background: "rgba(244,67,54,0.12)" },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Button
            variant="outlined"
            onClick={() =>
              setFormData({
                ...formData,
                protocols: [...(formData.protocols || []), { transport: "tcp", port: "" }],
              })
            }
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "14px",
              borderColor: "rgba(25,118,210,0.35)",
              backgroundColor: "rgba(255,255,255,0.65)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.85)" },
            }}
          >
            + Agregar Protocolo
          </Button>

          {/* Publishers */}
          <Autocomplete
            multiple
            options={publishers}
            getOptionLabel={(option) => option.publisher_name}
            value={formData.publishers || []}
            onChange={(_, newValue) => setFormData({ ...formData, publishers: newValue })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option.publisher_name} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Publishers"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />
            )}
          />

          {/* Tags */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={(formData.tags || []).map((t: any) => (typeof t === "string" ? t : t.tag_name))}
            onChange={(_, newValue) =>
              setFormData({
                ...formData,
                tags: newValue.map((t: any) => (typeof t === "string" ? t : t.tag_name)),
              })
            }
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip variant="outlined" label={String(option)} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />
            )}
          />

          {/* Switch */}
          <Box
            sx={{
              ...glassShellSx,
              p: 1.8,
              background: "rgba(255,255,255,0.75)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography sx={{ fontWeight: 900 }}>Usar Publisher DNS</Typography>
                <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.6)" }}>
                  Activa esta opción si la Private App debe resolver por DNS del Publisher.
                </Typography>
              </Box>

              <Switch
                checked={!!formData.usePublisherDns}
                onChange={(e) => setFormData({ ...formData, usePublisherDns: e.target.checked })}
              />
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button
            onClick={handleCloseModal}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: "14px" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveApp}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: "14px",
              background: primaryGradient,
              boxShadow: "0 10px 24px rgba(25, 118, 210, 0.25)",
              "&:hover": { boxShadow: "0 16px 32px rgba(66, 165, 245, 0.30)" },
            }}
          >
            {editingApp ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver */}
      <Dialog
        open={openViewModal}
        onClose={handleCloseViewModal}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Detalles de Private App</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {selectedApp && (
            <>
              <TextField
                label="ID"
                fullWidth
                value={selectedApp.app_id ?? "N/A"}
                InputProps={{ readOnly: true }}
                disabled
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />
              <TextField
                label="Nombre"
                fullWidth
                value={selectedApp.app_name || "N/A"}
                InputProps={{ readOnly: true }}
                disabled
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />
              <TextField
                label="Host"
                fullWidth
                value={selectedApp.host || "N/A"}
                InputProps={{ readOnly: true }}
                disabled
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              />

              <Divider sx={{ my: 0.5 }} />

              <Typography sx={{ fontWeight: 900 }}>Protocolos</Typography>
              {selectedApp.protocols?.map((p, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1 }}>
                  <FormControl
                    fullWidth
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "16px",
                        backgroundColor: "rgba(255,255,255,0.95)",
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                      },
                    }}
                  >
                    <InputLabel>Tipo</InputLabel>
                    <Select value={p.transport || p.type} label="Tipo" disabled>
                      <MenuItem value="tcp">TCP</MenuItem>
                      <MenuItem value="udp">UDP</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Puerto"
                    type="number"
                    value={p.port}
                    InputProps={{ readOnly: true }}
                    disabled
                    sx={{
                      width: 180,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "16px",
                        backgroundColor: "rgba(255,255,255,0.95)",
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                      },
                    }}
                  />
                </Box>
              ))}

              <Divider sx={{ my: 0.5 }} />

              <Typography sx={{ fontWeight: 900 }}>Publishers</Typography>
              <FormControl
                fullWidth
                disabled
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "16px",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
                  },
                }}
              >
                <InputLabel>Publishers</InputLabel>
                <Select multiple value={selectedApp.publishers?.map((p) => p.publisher_id) || []} disabled>
                  {publishers.map((p) => (
                    <MenuItem key={p.publisher_id} value={p.publisher_id}>
                      {p.publisher_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography sx={{ fontWeight: 900 }}>Tags</Typography>
              <Box
                sx={{
                  ...glassShellSx,
                  p: 1.6,
                  background: "rgba(255,255,255,0.75)",
                }}
              >
                {formatTagsForDisplay(selectedApp.tags || selectedApp.labels).length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {formatTagsForDisplay(selectedApp.tags || selectedApp.labels).map((t) => (
                      <Chip key={t} label={t} size="small" sx={chipTypeSx} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.6)" }}>
                    Sin tags
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button
            onClick={handleCloseViewModal}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: "14px" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
