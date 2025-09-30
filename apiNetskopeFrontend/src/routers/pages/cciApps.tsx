import { useState } from "react";
import { Box, Button, Typography, Card, CardContent, CircularProgress,} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { uploadCciExcel } from "../../services/cciApps";

export default function CciApps() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
        alert("Solo se permiten archivos con extensión .xlsx");
        return;
      }
      setFile(selectedFile);
      setDownloadUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Solo se permiten archivos con extensión .xlsx");
      return;
    }

    setLoading(true);

    try {
      const blob = await uploadCciExcel(file);
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al subir el archivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        p: 2,
      }}
    >
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "40px",
          background:
            "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: 500,
        }}
      >
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            padding: "20px",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: 4, textAlign: "center" }}>
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

            {/* Título */}
            <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
              Cargar archivo Excel
            </Typography>

            <Typography variant="body2" sx={{ mb: 3 }}>
              Sube tu archivo Excel (.xlsx) para procesarlo
            </Typography>

            {/* Seleccionar archivo */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                component="label"
                sx={{
                  py: 1.3,
                  px: 3,
                  fontWeight: 600,
                  textTransform: "none",
                  backgroundColor: "#42a5f5",
                  borderRadius: 2,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                  ":hover": {
                    backgroundColor: "#66b9ff",
                  },
                }}
              >
                Seleccionar archivo
                <input
                  type="file"
                  hidden
                  accept=".xlsx"
                  onChange={handleFileChange}
                />
              </Button>
            </Box>

            {/* Nombre del archivo seleccionado */}
            {file && (
              <Typography
                variant="body2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                Archivo seleccionado: <strong>{file.name}</strong>
              </Typography>
            )}

            {/* Botón subir */}
            {!downloadUrl && (
              <Button
                variant="outlined"
                disabled={!file || loading}
                onClick={handleUpload}
                sx={{
                  py: 1.3,
                  px: 3,
                  fontWeight: 600,
                  textTransform: "none",
                  borderColor: "#42a5f5",
                  color: "#42a5f5",
                  borderRadius: 2,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                  ":hover": {
                    backgroundColor: "#e3f2fd",
                    borderColor: "#1e88e5",
                    color: "#1e88e5",
                  },
                }}
              >
                {loading ? <CircularProgress size={24} /> : "Subir archivo"}
              </Button>
            )}

            {/* Botón descargar */}
            {downloadUrl && (
              <Button
                variant="contained"
                component="a"
                href={downloadUrl}
                download="Aplicaciones_Categorias.xlsx"
                sx={{
                  mt: 2,
                  py: 1.3,
                  px: 3,
                  fontWeight: 600,
                  textTransform: "none",
                  backgroundColor: "#58ca5cff",
                  borderRadius: 2,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                  ":hover": {
                    backgroundColor: "#87c88bff",
                  },
                }}
              >
                Descargar archivo procesado
              </Button>
            )}

            {/* Botón de volver */}
            <Box sx={{ textAlign: "center", mt: 3 }}>
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
                  ":hover": {
                    backgroundColor: "#66b9ff",
                  },
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
    </Box>
  );
}