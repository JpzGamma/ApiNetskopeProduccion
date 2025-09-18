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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
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
    ? urlLists.filter((u) => u.name.toLowerCase() === searchName.toLowerCase())
    : urlLists;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
            {/* Logo */}
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
            <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
              URL Lists
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
              Total de URLs: {totalUrls}
            </Typography>

            {/* Search */}
            <TextField
              label="Buscar URL List (nombre exacto)"
              variant="outlined"
              size="small"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              sx={{ mb: 3, width: "100%", maxWidth: 400 }}
            />

            {/* Tabla */}
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUrls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No se encontraron resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUrls.map(({ id, name, data: { type, urls }, modify_by, modify_time }) => (
                        <TableRow key={id}>
                          <TableCell>{id}</TableCell>
                          <TableCell>{name}</TableCell>
                          <TableCell>{type}</TableCell>
                          <TableCell>{urls.length}</TableCell>
                          <TableCell>{modify_by}</TableCell>
                          <TableCell>{formatDate(modify_time)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mensajes */}
            {feedbackMsg.type && (
              <Alert
                severity={feedbackMsg.type}
                onClose={() => setFeedbackMsg({ type: null, message: "" })}
                sx={{ mb: 2 }}
              >
                {feedbackMsg.message}
              </Alert>
            )}

            {/* Formulario acción masiva */}
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
                  <MenuItem value="append">Append</MenuItem>
                  <MenuItem value="replace">Replace</MenuItem>
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
                placeholder="example.com\nwww.google.com\nyoutube.com"
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

      {/* Footer */}
      <Box sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">&copy; 2025 ApiNetskope</Typography>
      </Box>
    </Box>
  );
}