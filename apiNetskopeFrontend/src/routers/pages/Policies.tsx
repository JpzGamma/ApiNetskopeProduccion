// pages/Policies.tsx
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import { Link as RouterLink } from "react-router-dom";

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
  const [searchGroup, setSearchGroup] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

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

  /* ------------ Derived lists ------------ */
  const groupsFiltered = useMemo(() => {
    const needle = searchGroup.trim().toLowerCase();
    return !needle ? groups : groups.filter((g) => g.name.toLowerCase().includes(needle));
  }, [groups, searchGroup]);

  const policiesFiltered = useMemo(() => {
    const needle = searchPolicy.trim().toLowerCase();
    const arr = !needle
      ? policies
      : policies.filter((p) => p.rule_name.toLowerCase().includes(needle));

    if (!selectedGroupId) return arr;
    return arr.filter((p) => p.group_id === selectedGroupId);
  }, [policies, searchPolicy, selectedGroupId]);

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

    const payload = {
      rule_name: form.rule_name.trim() || undefined,
      group_id: form.group_id || undefined,
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

  /* ------------ Render ------------ */
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          borderRadius: 3,
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        }}
      >
        <Card elevation={0} sx={{ background: "transparent" }}>
          <CardContent>
            {/* Header */}
            <RouterLink to="/home">
              <Box
                component="img"
                src="/LogoNetskopeAzul.jpeg"
                alt="Logo"
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: 6,
                  boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
                  mb: 2,
                }}
              />
            </RouterLink>

            <Typography variant="h4" fontWeight={700} align="center" sx={{ mb: 2 }}>
              Policies & Groups
            </Typography>

            {/* Controles */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems="center"
              justifyContent="center"
              sx={{ mb: 2 }}
            >
              <TextField
                size="small"
                placeholder="Buscar política por nombre"
                value={searchPolicy}
                onChange={(e) => setSearchPolicy(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 340, background: "white", borderRadius: 1 }}
              />

              <TextField
                size="small"
                placeholder="Buscar grupo por nombre"
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 320, background: "white", borderRadius: 1 }}
              />

              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel id="group-filter-label">Filtrar por grupo</InputLabel>
                <Select
                  labelId="group-filter-label"
                  value={selectedGroupId}
                  label="Filtrar por grupo"
                  onChange={(e) => setSelectedGroupId(e.target.value as string)}
                  sx={{ background: "white" }}
                >
                  <MenuItem value="">
                    <em>Todos</em>
                  </MenuItem>
                  {groupsFiltered.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1}>
                <Tooltip title="Refrescar">
                  <span>
                    <IconButton onClick={loadAll} disabled={loading}>
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
                  Nueva política
                </Button>
              </Stack>
            </Stack>

            {/* Feedback */}
            {msg.type && (
              <Alert
                severity={msg.type}
                onClose={() => setMsg({ type: null, text: "" })}
                sx={{ mb: 2 }}
              >
                {msg.text}
              </Alert>
            )}

            {/* Tabla */}
            <TableContainer component={Paper} sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Acceso</TableCell>
                    <TableCell>Usuarios</TableCell>
                    <TableCell>Apps</TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policiesFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        Sin resultados
                      </TableCell>
                    </TableRow>
                  ) : (
                    policiesFiltered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.rule_name}</TableCell>
                        <TableCell>
                          {groups.find((g) => g.id === p.group_id)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={p.enabled === "1" ? "Activa" : "Inactiva"}
                            color={p.enabled === "1" ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell>{p.action_name || "-"}</TableCell>
                        <TableCell>
                          {(p.access_method || []).join(", ") || "-"}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          {(p.users || []).join(", ") || "-"}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          {(p.privateApps || []).join(", ") || "-"}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
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

            {/* Footer */}
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Button component={RouterLink} to="/home" variant="contained">
                Volver
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Modal Crear/Editar */}
      <Dialog open={openEdit} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar política" : "Nueva política"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre de la política"
              value={form.rule_name}
              onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="group-label">Grupo</InputLabel>
              <Select
                labelId="group-label"
                value={form.group_id}
                label="Grupo"
                onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
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

            <FormControl fullWidth>
              <InputLabel id="enabled-label">Estado</InputLabel>
              <Select
                labelId="enabled-label"
                value={form.enabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.value as "0" | "1" }))
                }
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
            />
            <TextField
              label="Private Apps (coma-separadas)"
              value={form.privateApps}
              onChange={(e) => setForm((f) => ({ ...f, privateApps: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Private App Tags (coma-separadas)"
              value={form.privateAppTags}
              onChange={(e) =>
                setForm((f) => ({ ...f, privateAppTags: e.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
