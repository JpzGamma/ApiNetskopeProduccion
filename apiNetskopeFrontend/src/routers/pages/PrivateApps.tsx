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
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "error" | "success" | null; message: string }>({ type: null, message: "" });
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 2,
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
      }}
    >
      {/* Tarjeta central */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: 3,
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          maxWidth: 1500,
          width: "100%",
          p: 3,
          background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        }}
      >
        <Card elevation={0} sx={{ background: "transparent", boxShadow: "none" }}>
          <CardContent sx={{ textAlign: "center" }}>
            {/* Logos */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 3 }}>
              <RouterLink to="/home">
                <Box component="img" src="/LogoNetskopeAzul.jpeg" alt="Logo" sx={{ width: 80, height: 80, borderRadius: 5, boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)", mb: 2 }} />
              </RouterLink>
              <RouterLink to="/home">
                <Box component="img" src="/LogoGamma.jpeg" alt="Logo Nuevo" sx={{ width: 80, height: 80, borderRadius: 5, boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4)", mb: 2 }} />
              </RouterLink>
            </Box>

            <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
              Private Apps
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de apps: {apps.length}
            </Typography>

            {/* Búsqueda y botones */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
              <TextField
                label="Buscar por nombre o ID"
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: "100%", maxWidth: 400 }}
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
                sx={{ backgroundColor: "#42a5f5", ":hover": { backgroundColor: "#66b9ff" } }}
                onClick={() => handleOpenModal()}
              >
                Nueva Private App
              </Button>
              <Button variant="outlined" startIcon={<UploadFileIcon />} component="label">
                Subir CSV/XLSX
                <input type="file" hidden onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
              </Button>
              {bulkFile && (
                <Button variant="contained" onClick={handleBulkUpload}>
                  Cargar {bulkFile.name}
                </Button>
              )}
            </Box>

            {/* Tabla */}
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 600, mb: 3, overflowX: "auto" }}>
                <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Host</TableCell>
                      <TableCell>Protocols</TableCell>
                      <TableCell>Publishers</TableCell>
                      <TableCell>Tags</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                      <TableCell align="center">Políticas</TableCell>
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
                          <TableRow key={a.app_id}>
                            <TableCell>{a.app_id}</TableCell>
                            <TableCell>{a.app_name || "N/A"}</TableCell>
                            <TableCell>
                              <Tooltip title={a.host || "N/A"}>
                                <span style={{ display: "inline-block", maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {a.host || "N/A"}
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={protocolsDisplay}>
                                <span style={{ display: "inline-block", maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {protocolsDisplay}
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{publishersDisplay}</TableCell>
                            <TableCell>{tagsList.length > 0 ? tagsList.join(", ") : "Sin tags"}</TableCell>
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
            )}

            {feedbackMsg.type && (
              <Alert severity={feedbackMsg.type} onClose={() => setFeedbackMsg({ type: null, message: "" })} sx={{ mb: 2 }}>
                {feedbackMsg.message}
              </Alert>
            )}
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                component={RouterLink}
                to="/home"
                variant="contained"
                sx={{ py: 1.3, fontWeight: 600, textTransform: "none", backgroundColor: "#42a5f5", borderRadius: 2, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)", ":hover": { backgroundColor: "#66b9ff" } }}
              >
                Volver
              </Button>
            </Box>
            <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">&copy; 2026 Api - Netskope</Typography>
              
             Equipo de Desarrollo Gamma Ingenieros
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Modal Crear / Editar */}
      <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>{editingApp ? "Editar Private App" : "Nueva Private App"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Nombre */}
          <TextField
            label="Nombre *"
            fullWidth
            value={formData.app_name || ""}
            onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
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
              />
              {idx === (formData.hostsArray?.length || 1) - 1 && (
                <IconButton
                  color="primary"
                  onClick={() => setFormData({ ...formData, hostsArray: [...(formData.hostsArray || []), ""] })}
                >
                  <AddIcon />
                </IconButton>
              )}
              {formData.hostsArray.length > 1 && (
                <IconButton color="error" onClick={() => setFormData({ ...formData, hostsArray: formData.hostsArray.filter((_, i) => i !== idx) })}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}

          {/* Protocolos múltiples */}
          {formData.protocols?.map((p: any, i: number) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControl fullWidth>
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
              />
              <IconButton
                color="error"
                onClick={() => {
                  const newProtocols = [...(formData.protocols || [])];
                  newProtocols.splice(i, 1);
                  setFormData({ ...formData, protocols: newProtocols });
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
                <Chip
                  variant="outlined"
                  label={option.publisher_name}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Publishers" />}
          />

          {/* Tags */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={(formData.tags || []).map((t: any) =>
              typeof t === "string" ? t : t.tag_name
            )}
            onChange={(_, newValue) =>
              setFormData({
                ...formData,
                tags: newValue.map((t: any) =>
                  typeof t === "string" ? t : t.tag_name
                ),
              })
            }
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  variant="outlined"
                  label={String(option)}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Tags" />}
          />

          {/* Switch */}
          <FormControl>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={!!formData.usePublisherDns}
                onChange={(e) => setFormData({ ...formData, usePublisherDns: e.target.checked })}
              />
              <Typography>Usar Publisher DNS</Typography>
            </Box>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveApp}>
            {editingApp ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver */}
      <Dialog open={openViewModal} onClose={handleCloseViewModal} fullWidth maxWidth="sm">
        <DialogTitle>Detalles de Private App</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {selectedApp && (
            <>
              <TextField label="ID" fullWidth value={selectedApp.app_id ?? "N/A"} InputProps={{ readOnly: true }} disabled/>
              <TextField label="Nombre" fullWidth value={selectedApp.app_name || "N/A"} InputProps={{ readOnly: true }} disabled/>
              <TextField label="Host" fullWidth value={selectedApp.host || "N/A"} InputProps={{ readOnly: true }} disabled/>

              {selectedApp.protocols?.map((p, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1 }}>
                  <FormControl fullWidth disabled>
                    <InputLabel>Tipo</InputLabel>
                    <Select value={p.transport || p.type} label="Tipo" disabled>
                      <MenuItem value="tcp">TCP</MenuItem>
                      <MenuItem value="udp">UDP</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Puerto" type="number" value={p.port} InputProps={{ readOnly: true }} disabled/>
                </Box>
              ))}

              <FormControl fullWidth disabled>
                <InputLabel>Publishers</InputLabel>
                <Select multiple value={selectedApp.publishers?.map(p => p.publisher_id) || []} disabled>
                  {publishers.map((p) => (
                    <MenuItem key={p.publisher_id} value={p.publisher_id}>
                      {p.publisher_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Tags"
                fullWidth
                value={formatTagsForDisplay(selectedApp.tags || selectedApp.labels).join(", ") || "Sin tags"}
                InputProps={{ readOnly: true }} disabled
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}