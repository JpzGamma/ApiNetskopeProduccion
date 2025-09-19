import { useState, useEffect } from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  type URLListType,
  fetchUrlLists,
  fetchUrlCount,
  batchUpdateUrlLists,
} from "../../services/URL_List";

export default function URL_List() {
  const [searchName, setSearchName] = useState("");
  const [urlLists, setUrlLists] = useState<URLListType[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUrls, setTotalUrls] = useState(0);

  const [actionType, setActionType] = useState<"append" | "replace">("append");
  const [idsOrNames, setIdsOrNames] = useState("");
  const [urlsInput, setUrlsInput] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "error" | "success" | null;
    message: string;
  }>({ type: null, message: "" });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<URLListType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableUrls, setEditableUrls] = useState<string[]>([]);

  useEffect(() => {
    loadUrlLists();
    loadUrlCount();
  }, []);

  const loadUrlLists = async () => {
    setLoading(true);
    try {
      const data = await fetchUrlLists();
      setUrlLists(data);
    } catch (error) {
      setFeedbackMsg({ type: "error", message: "Error cargando URL Lists." });
    } finally {
      setLoading(false);
    }
  };

  const loadUrlCount = async () => {
    try {
      const count = await fetchUrlCount();
      setTotalUrls(count);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    setFeedbackMsg({ type: null, message: "" });

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
      .filter((u) => u !== "");

    // Validación robusta usando URL constructor:
    const invalidUrls = urls.filter((url) => {
      try {
        // Añade protocolo si falta para validar correctamente
        const fixedUrl = url.match(/^https?:\/\//i) ? url : "http://" + url;
        new URL(fixedUrl);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      setFeedbackMsg({
        type: "error",
        message: `URLs/IPs inválidas detectadas:\n${invalidUrls.join(", ")}`,
      });
      return;
    }

    setLoading(true);
    try {
      await batchUpdateUrlLists(actionType, idsOrNames, urlsInput);
      setFeedbackMsg({
        type: "success",
        message: `Acción "${actionType}" ejecutada con éxito.`,
      });
      setIdsOrNames("");
      setUrlsInput("");
      loadUrlLists();
      loadUrlCount();
    } catch (error) {
      setFeedbackMsg({ type: "error", message: "Hubo un error al ejecutar la acción." });
    } finally {
      setLoading(false);
    }
  };

  const filteredUrls = searchName
    ? urlLists.filter((u) =>
        u.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(
            searchName
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
          )
      )
    : urlLists;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleOpenDialog = (list: URLListType, isEdit = false) => {
    setSelectedList(list);
    setEditMode(isEdit);
    setEditableUrls(list.data.urls);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedList(null);
    setEditMode(false);
  };

  const handleDeleteUrl = (url: string) => {
    setEditableUrls(editableUrls.filter((u) => u !== url));
  };

  const handleSaveEdit = async () => {
    if (!selectedList) return;

    try {
      await batchUpdateUrlLists("replace", selectedList.id.toString(), editableUrls.join("\n"));
      setFeedbackMsg({
        type: "success",
        message: "Lista actualizada correctamente.",
      });
      loadUrlLists();
    } catch (error) {
      setFeedbackMsg({ type: "error", message: "Error al actualizar la lista." });
    }
    handleCloseDialog();
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
              URL Lists
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de URLs: {totalUrls}
            </Typography>

            <TextField
              label="Buscar URL List (nombre exacto)"
              variant="outlined"
              size="small"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              sx={{ mb: 3, width: "100%", maxWidth: 400 }}
            />

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
                      <TableCell>Cant.Urls</TableCell>
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
                            {/* Ojo azul */}
                            <IconButton onClick={() => handleOpenDialog(list, false)} color="primary">
                              <VisibilityIcon />
                            </IconButton>

                            {/* Lápiz amarillo */}
                            <IconButton
                              onClick={() => handleOpenDialog(list, true)}
                              sx={{ color: "#FFA726" }} // color amarillo
                            >
                              <EditIcon />
                            </IconButton>

                            {/* Eliminar */}
                            <IconButton onClick={() => alert(`Eliminar lista con ID: ${list.id}`)} color="error">
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
                sx={{ mb: 2, whiteSpace: "pre-line" }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

            {/* Acción masiva */}
            <Box
              sx={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                pt: 3,
                textAlign: "left",
                maxWidth: 600,
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
                  <MenuItem value="append">Añadir </MenuItem>
                  <MenuItem value="replace">Reemplazar </MenuItem>
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
                placeholder="Ejemplo: 77, [Semillero] AllowList"
              />

              <TextField
                label="Ingresa URLs"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                size="small"
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                sx={{ mb: 3 }}
                placeholder={`example.com
www.example.com
sub.domain.com
http://example.com
https://example.com/path
example.com/path/to/page?query=123`}
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
      </Box>

      <Box sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">&copy; 2025 ApiNetskope</Typography>
      </Box>

      {/* Modal */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedList?.name}
          {editMode ? " - Editar URLs" : " - Ver URLs"}
        </DialogTitle>
        <DialogContent dividers>
          {editMode ? (
            <List sx={{ maxHeight: 300, overflowY: "auto" }}>
              {editableUrls.map((url) => (
                <ListItem
                  key={url}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleDeleteUrl(url)} color="error">
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
          ) : (
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
    </Box>
  );
}