import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from "@mui/material";
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
      {/* blobs decorativos (igual que Home/URL) */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: { xs: 320, md: 500 },
          height: { xs: 320, md: 500 },
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
          width: { xs: 280, md: 400 },
          height: { xs: 280, md: 400 },
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
          maxWidth: 1100,
          mx: "auto",
          px: { xs: 2, md: 6 },
          pt: { xs: 2, md: 4 },
          pb: 6,
        }}
      >
        {/* Header superior: logos + back (igual estilo URL) */}
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Card
            elevation={0}
            sx={{
              ...glassShellSx,
              width: "100%",
              maxWidth: 720,
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
                  CCI Apps
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label="Carga Excel (.xlsx)"
                    sx={{
                      backgroundColor: "rgba(66, 165, 245, 0.15)",
                      color: "#1976d2",
                      fontWeight: 700,
                      border: "1px solid rgba(66, 165, 245, 0.3)",
                    }}
                  />
                  <Chip
                    label="Procesa y categoriza"
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "rgba(0,0,0,0.65)",
                      fontWeight: 700,
                      border: "1px solid rgba(255,255,255,0.7)",
                    }}
                  />
                </Box>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  mb: 3,
                  color: "rgba(0,0,0,0.6)",
                  fontWeight: 600,
                  textAlign: "center",
                  px: { xs: 0, sm: 3 },
                }}
              >
                Sube tu archivo Excel (.xlsx) con las columnas <b>id</b>, <b>current_name</b>, <b>application_name</b>{" "}
                para procesarlo y categorizar cada aplicación del CCI.
              </Typography>

              {/* Selector archivo */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Button
                  variant="contained"
                  component="label"
                  sx={{
                    py: 1.3,
                    px: 3,
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: "16px",
                    background: primaryGradient,
                    boxShadow: "0 12px 28px rgba(25, 118, 210, 0.24)",
                    "&:hover": { boxShadow: "0 18px 36px rgba(66, 165, 245, 0.30)" },
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Seleccionar archivo
                  <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
                </Button>

                <Box
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    textAlign: { xs: "center", sm: "left" },
                    px: { xs: 1, sm: 0 },
                  }}
                >
                  {file ? (
                    <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.6)", fontWeight: 700 }}>
                      Archivo: <span style={{ color: "#1a1a1a" }}>{file.name}</span>
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.5)", fontWeight: 600 }}>
                      Ningún archivo seleccionado
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* CTA: subir / descargar */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
                {!downloadUrl && (
                  <Button
                    variant="contained"
                    disabled={!file || loading}
                    onClick={handleUpload}
                    sx={{
                      py: 1.3,
                      px: 3,
                      fontWeight: 900,
                      textTransform: "none",
                      borderRadius: "16px",
                      background: primaryGradient,
                      boxShadow: "0 12px 28px rgba(25, 118, 210, 0.24)",
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": { boxShadow: "0 18px 36px rgba(66, 165, 245, 0.30)" },
                      "&.Mui-disabled": {
                        background: "rgba(66,165,245,0.25)",
                        color: "rgba(0,0,0,0.35)",
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Procesar archivo"}
                  </Button>
                )}

                {downloadUrl && (
                  <Button
                    variant="contained"
                    component="a"
                    href={downloadUrl}
                    download="Aplicaciones_Categorias.xlsx"
                    sx={{
                      py: 1.3,
                      px: 3,
                      fontWeight: 900,
                      textTransform: "none",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #58ca5cff, #2e7d32)",
                      boxShadow: "0 12px 28px rgba(46, 125, 50, 0.22)",
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": { boxShadow: "0 18px 36px rgba(46, 125, 50, 0.28)" },
                    }}
                  >
                    Descargar archivo procesado
                  </Button>
                )}
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
    </Box>
  );
}
