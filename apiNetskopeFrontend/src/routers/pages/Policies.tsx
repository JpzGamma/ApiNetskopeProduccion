// src/pages/Policies.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";

import {
  fetchPolicies,
  fetchPolicyGroups,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type PolicyRule,
  type PolicyGroup,
  type PolicyAction,
  type AccessMethod,
} from "../../services/Policies";
import { Link as RouterLink, useLocation } from "react-router-dom";

/* ------------ Helpers ------------ */
const accessMethods: AccessMethod[] = ["Client", "Browser"];
const actions: PolicyAction[] = ["allow", "block"];

/* ------------ Component ------------ */
export default function PoliciesPage() {
  /* ------------ State ------------ */
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [groups, setGroups] = useState<PolicyGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros/búsqueda
  const [searchPolicy, setSearchPolicy] = useState("");
  const [searchTag, setSearchTag] = useState("");

  // feedback
  const [msg, setMsg] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  });

  // modal create/edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<PolicyRule | null>(null);
  const [form, setForm] = useState<{
    rule_name: string;
    group_id: string;
    enabled: "0" | "1";
    access_method?: AccessMethod;
    action_name?: PolicyAction;
    users: string;
    privateApps: string;
    privateAppTags: string;
  }>({
    rule_name: "",
    group_id: "",
    enabled: "1",
    access_method: undefined,
    action_name: undefined,
    users: "",
    privateApps: "",
    privateAppTags: "",
  });

  // modales de detalle
  const [openUsers, setOpenUsers] = useState<string[] | null>(null);
  const [openApps, setOpenApps] = useState<string[] | null>(null);

  const location = useLocation();

  /* ------------ Load ------------ */
  async function loadAll() {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([fetchPolicies(), fetchPolicyGroups()]);
      setPolicies(p);
      setGroups(g);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error cargando datos" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Abrir modal precargado si venimos desde Private Apps
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const wantNew = sp.get("new");
    const fromApp = sp.get("fromApp");
    if (wantNew === "1") {
      setEditing(null);
      setForm((f) => ({ ...f, privateApps: fromApp ? decodeURIComponent(fromApp) : "" }));
      setOpenEdit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------ Derived lists ------------ */
  const policiesFiltered = useMemo(() => {
    const needleName = searchPolicy.trim().toLowerCase();
    const needleTag = searchTag.trim().toLowerCase();

    return policies.filter((p) => {
      const nameOk = !needleName || p.rule_name.toLowerCase().includes(needleName);
      const tagList = (p.privateAppTags || []).map((t) => String(t).toLowerCase());
      const tagOk = !needleTag || tagList.some((t) => t.includes(needleTag));
      return nameOk && tagOk;
    });
  }, [policies, searchPolicy, searchTag]);

  /* ------------ UI helpers ------------ */
  const resetForm = () =>
    setForm({
      rule_name: "",
      group_id: "",
      enabled: "1",
      access_method: undefined,
      action_name: undefined,
      users: "",
      privateApps: "",
      privateAppTags: "",
    });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpenEdit(true);
  };

  const openUpdate = (p: PolicyRule) => {
    setEditing(p);
    setForm({
      rule_name: p.rule_name || "",
      group_id: p.group_id || "",
      enabled: p.enabled ?? "1",
      access_method: (p.access_method && p.access_method[0]) || undefined,
      action_name: p.action_name,
      users: (p.users || []).join(","),
      privateApps: (p.privateApps || []).join(","),
      privateAppTags: (p.privateAppTags || []).join(","),
    });
    setOpenEdit(true);
  };

  const closeEdit = () => setOpenEdit(false);

  /* ------------ Actions ------------ */
  const handleSave = async () => {
    setMsg({ type: null, text: "" });
    const gName = form.group_id ? groups.find((g) => g.id === form.group_id)?.name : undefined;

    const payload = {
      rule_name: form.rule_name.trim() || undefined,
      group_name: gName,
      enabled: form.enabled,
      access_method: form.access_method,
      action_name: form.action_name,
      users: form.users.split(",").map((s) => s.trim()).filter(Boolean),
      privateApps: form.privateApps.split(",").map((s) => s.trim()).filter(Boolean),
      privateAppTags: form.privateAppTags.split(",").map((s) => s.trim()).filter(Boolean),
    };

    setLoading(true);
    try {
      if (editing) {
        await updatePolicy(editing.id, payload);
        setMsg({ type: "success", text: "Política actualizada" });
      } else {
        await createPolicy(payload);
        setMsg({ type: "success", text: "Política creada" });
      }
      closeEdit();
      await loadAll();
    } catch (e: any) {
      setMsg({ type: "error", text: e?.response?.data?.detail || e?.message || "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (p: PolicyRule) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Eliminar la política "${p.rule_name}"?`)) return;
    setLoading(true);
    try {
      await deletePolicy(p.id);
      setMsg({ type: "success", text: "Política eliminada" });
      await loadAll();
    } catch (e: any) {
      setMsg({ type: "error", text: e?.response?.data?.detail || e?.message || "Error" });
    } finally {
      setLoading(false);
    }
  };

  /* ------------ Estilos (igual que CciApps/URL) ------------ */
  const glassShellSx = {
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.10)",
  } as const;

  const primaryGradient = "linear-gradient(135deg, #42a5f5, #1976d2)";

  /* ------------ Render ------------ */
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* blobs decorativos (igual a los otros) */}
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
                  Policies
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={`Total: ${policies.length}`}
                    sx={{
                      backgroundColor: "rgba(66, 165, 245, 0.15)",
                      color: "#1976d2",
                      fontWeight: 800,
                      border: "1px solid rgba(66, 165, 245, 0.3)",
                    }}
                  />
                  <Chip
                    label={`Mostrando: ${policiesFiltered.length}`}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 800,
                      border: "1px solid rgba(255,255,255,0.7)",
                    }}
                  />
                  <Chip
                    label={loading ? "Cargando..." : "Lista actualizada"}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "rgba(0,0,0,0.55)",
                      fontWeight: 700,
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
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1.5,
                    width: "100%",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Buscar política por nombre"
                    value={searchPolicy}
                    onChange={(e) => setSearchPolicy(e.target.value)}
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

                  <TextField
                    size="small"
                    placeholder="Buscar tag por nombre"
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
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
                </Box>

                <Box sx={{ display: "flex", gap: 1.2, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Tooltip title="Refrescar">
                    <span>
                      <IconButton
                        onClick={loadAll}
                        disabled={loading}
                        sx={{
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.65)",
                          border: "1px solid rgba(255,255,255,0.75)",
                        }}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={openCreate}
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
                    Nueva política
                  </Button>
                </Box>
              </Box>

              {/* Feedback */}
              {msg.type && (
                <Alert
                  severity={msg.type}
                  onClose={() => setMsg({ type: null, text: "" })}
                  sx={{
                    mb: 2,
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  {msg.text}
                </Alert>
              )}

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
                  <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Nombre</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Estado</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Acción</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Acceso</TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="center">
                          Usuarios
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="center">
                          Apps
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Tags</TableCell>
                        <TableCell sx={{ fontWeight: 900 }} align="center">
                          Acciones
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : policiesFiltered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            Sin resultados
                          </TableCell>
                        </TableRow>
                      ) : (
                        policiesFiltered.map((p) => (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{p.rule_name}</TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={p.enabled === "1" ? "Activa" : "Inactiva"}
                                sx={{
                                  fontWeight: 900,
                                  borderRadius: "12px",
                                  backgroundColor:
                                    p.enabled === "1"
                                      ? "rgba(76, 175, 80, 0.14)"
                                      : "rgba(255,255,255,0.55)",
                                  color: p.enabled === "1" ? "#2e7d32" : "rgba(0,0,0,0.55)",
                                  border: "1px solid rgba(255,255,255,0.8)",
                                }}
                              />
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={p.action_name || "-"}
                                sx={{
                                  fontWeight: 900,
                                  borderRadius: "12px",
                                  backgroundColor:
                                    (p.action_name || "").toLowerCase() === "allow"
                                      ? "rgba(76, 175, 80, 0.14)"
                                      : (p.action_name || "").toLowerCase() === "block"
                                        ? "rgba(244, 67, 54, 0.12)"
                                        : "rgba(255,255,255,0.55)",
                                  color:
                                    (p.action_name || "").toLowerCase() === "block"
                                      ? "#c62828"
                                      : "rgba(0,0,0,0.65)",
                                  border: "1px solid rgba(255,255,255,0.8)",
                                }}
                              />
                            </TableCell>

                            <TableCell>{(p.access_method || []).join(", ") || "-"}</TableCell>

                            {/* Usuarios: SOLO icono */}
                            <TableCell align="center">
                              {p.users && p.users.length > 0 ? (
                                <Tooltip title="Ver usuarios">
                                  <IconButton size="small" onClick={() => setOpenUsers(p.users!)}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                "-"
                              )}
                            </TableCell>

                            {/* Apps: SOLO icono */}
                            <TableCell align="center">
                              {p.privateApps && p.privateApps.length > 0 ? (
                                <Tooltip title="Ver apps">
                                  <IconButton size="small" onClick={() => setOpenApps(p.privateApps!)}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                "-"
                              )}
                            </TableCell>

                            <TableCell sx={{ maxWidth: 240 }}>
                              {(p.privateAppTags || []).join(", ") || "-"}
                            </TableCell>

                            <TableCell align="center">
                              <Tooltip title="Editar">
                                <IconButton onClick={() => openUpdate(p)} sx={{ color: "#FFA726" }}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton onClick={() => handleDelete(p)} color="error">
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

              {/* Footer interno (mini) */}
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
        open={openEdit}
        onClose={closeEdit}
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
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editing ? "Editar política" : "Nueva política"}
        </DialogTitle>

        <DialogContent dividers sx={{ background: "transparent" }}>
          <Stack spacing={2}>
            <TextField
              label="Nombre de la política"
              value={form.rule_name}
              onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />

            <FormControl fullWidth>
              <InputLabel id="group-label">Grupo</InputLabel>
              <Select
                labelId="group-label"
                value={form.group_id}
                label="Grupo"
                onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                sx={{
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <MenuItem value="">
                  <em>(sin grupo)</em>
                </MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="enabled-label">Estado</InputLabel>
                <Select
                  labelId="enabled-label"
                  value={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.value as "0" | "1" }))}
                  sx={{
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <MenuItem value="1">Activa</MenuItem>
                  <MenuItem value="0">Inactiva</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="access-label">Access method</InputLabel>
                <Select
                  labelId="access-label"
                  value={form.access_method ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      access_method: (e.target.value as AccessMethod) || undefined,
                    }))
                  }
                  sx={{
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <MenuItem value="">
                    <em>(sin especificar)</em>
                  </MenuItem>
                  {accessMethods.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="action-label">Acción</InputLabel>
              <Select
                labelId="action-label"
                value={form.action_name ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    action_name: (e.target.value as PolicyAction) || undefined,
                  }))
                }
                sx={{
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <MenuItem value="">
                  <em>(sin especificar)</em>
                </MenuItem>
                {actions.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Usuarios (coma-separados)"
              value={form.users}
              onChange={(e) => setForm((f) => ({ ...f, users: e.target.value }))}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />
            <TextField
              label="Private Apps (coma-separadas)"
              value={form.privateApps}
              onChange={(e) => setForm((f) => ({ ...f, privateApps: e.target.value }))}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />
            <TextField
              label="Private App Tags (coma-separadas)"
              value={form.privateAppTags}
              onChange={(e) => setForm((f) => ({ ...f, privateAppTags: e.target.value }))}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(14px)",
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeEdit} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
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
            {editing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Usuarios */}
      <Dialog
        open={!!openUsers}
        onClose={() => setOpenUsers(null)}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Usuarios de la política</DialogTitle>
        <DialogContent dividers sx={{ background: "transparent" }}>
          {openUsers && openUsers.length > 0 ? (
            <List dense>
              {openUsers.map((u, i) => (
                <ListItem key={i}>
                  <ListItemText primary={u} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2">Sin usuarios.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenUsers(null)} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Apps */}
      <Dialog
        open={!!openApps}
        onClose={() => setOpenApps(null)}
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
        <DialogTitle sx={{ fontWeight: 900 }}>Apps asociadas</DialogTitle>
        <DialogContent dividers sx={{ background: "transparent" }}>
          {openApps && openApps.length > 0 ? (
            <List dense>
              {openApps.map((a, i) => (
                <ListItem key={i}>
                  <ListItemText primary={a} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2">Sin apps.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenApps(null)} sx={{ textTransform: "none", fontWeight: 800 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
