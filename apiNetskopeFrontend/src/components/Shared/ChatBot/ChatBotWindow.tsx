import { useState, useEffect, useRef } from "react";
import { Box, Paper, TextField, Button, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface ChatBotWindowProps {
  onClose: () => void;
}

export default function ChatBotWindow({ onClose }: ChatBotWindowProps) {
  const [messages, setMessages] = useState<{ from: "user" | "bot"; answer: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mensaje de bienvenida
  useEffect(() => {
    const welcomeMessage = {
      from: "bot" as const,
      answer: "👋 ¡Hola! Soy GammIA, tu asistente IA 🚀 ¿Listo para empezar?",
    };
    setTimeout(() => setMessages([welcomeMessage]), 500);
  }, []);

  // Scroll automático hacia el último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { from: "user" as const, answer: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("https://ops-tds.gammaingenieros.com/webhook/tds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput }),
      });

      // Verificar si la respuesta es exitosa
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Obtener el texto de la respuesta primero
      const contentType = res.headers.get("content-type");
      const responseText = await res.text();

      console.log("Content-Type:", contentType);
      console.log("Respuesta como texto:", responseText);

      let botAnswer = "";

      // Intentar parsear como JSON solo si el content-type lo indica
      if (contentType && contentType.includes("application/json")) {
        try {
          const data = JSON.parse(responseText);
          console.log("Datos parseados como JSON:", data);

          // Buscar la respuesta en diferentes campos posibles
          if (data.answer) {
            botAnswer = data.answer;
          } else if (data.output) {
            botAnswer = data.output;
          } else if (data.response) {
            botAnswer = data.response;
          } else if (data.text) {
            botAnswer = data.text;
          } else if (data.message) {
            botAnswer = data.message;
          } else if (Array.isArray(data) && data.length > 0) {
            // n8n a veces devuelve un array
            const firstItem = data[0];
            botAnswer =
              firstItem.answer ||
              firstItem.output ||
              firstItem.response ||
              firstItem.text ||
              firstItem.message ||
              JSON.stringify(firstItem, null, 2);
          } else {
            // Si no encuentra ningún campo conocido, mostrar el objeto completo
            botAnswer = JSON.stringify(data, null, 2);
          }
        } catch (parseError) {
          console.error("Error al parsear JSON:", parseError);
          // Si falla el parseo, usar el texto directamente
          botAnswer = responseText;
        }
      } else {
        // Si no es JSON, usar el texto directamente
        console.log("Respuesta no es JSON, usando texto directo");
        botAnswer = responseText;
      }

      // Limpiar el mensaje si viene con caracteres extraños
      botAnswer = botAnswer.trim();

      const botMsg = {
        from: "bot" as const,
        answer: botAnswer || "Sin respuesta del servidor 😅",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Error completo:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          answer: `❌ Error de conexión con el chatbot.\n\nDetalles: ${errorMessage}\n\nPor favor, verifica la consola del navegador.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        bottom: isMobile ? 20 : 170,
        right: isMobile ? 0 : 32,
        width: isMobile ? "100%" : "25vw",
        maxWidth: 480,
        height: isMobile ? "75vh" : "60vh",
        borderRadius: isMobile ? "16px 16px 0 0" : 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(12px)",
        background: "linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)",
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)",
        zIndex: 1250,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(90deg, #3c8fd2ff, #76bcf5ff)",
          color: "white",
          p: isMobile ? 1.2 : 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant={isMobile ? "subtitle2" : "subtitle1"} sx={{ fontWeight: 600 }}>
          🤖 GammIA
        </Typography>
        <Button
          size="small"
          color="inherit"
          onClick={onClose}
          sx={{
            minWidth: 32,
            fontSize: 16,
            color: "black",
            "&:hover": { color: "#fff" },
          }}
        >
          ✕
        </Button>
      </Box>

      {/* Área de mensajes */}
      <Box
        sx={{
          flex: 1,
          p: isMobile ? 1 : 2,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: "rgba(255,255,255,0.5)",
        }}
      >
        {messages.map((m, i) => (
          <Box key={i} textAlign={m.from === "user" ? "right" : "left"}>
            <Paper
              sx={{
                display: "inline-block",
                p: 1,
                px: 1.5,
                bgcolor: m.from === "user" ? "primary.main" : "#e3f2fd",
                color: m.from === "user" ? "white" : "black",
                borderRadius: 3,
                maxWidth: "75%",
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                fontSize: isMobile ? "0.85rem" : "0.95rem",
                boxShadow:
                  m.from === "user"
                    ? "0 2px 8px rgba(33,150,243,0.3)"
                    : "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              {m.answer}
            </Paper>
          </Box>
        ))}
        {isLoading && (
          <Box textAlign="left">
            <Paper
              sx={{
                display: "inline-block",
                p: 1,
                px: 1.5,
                bgcolor: "#e3f2fd",
                borderRadius: 3,
                fontSize: isMobile ? "0.85rem" : "0.95rem",
              }}
            >
              <Typography component="span">Pensando...</Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: isMobile ? 1 : 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          borderTop: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.6)",
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={isLoading}
            sx={{
              "& .MuiInputBase-input": {
                fontSize: isMobile ? "0.85rem" : "1rem",
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={isLoading}
            sx={{
              py: isMobile ? 1 : 1.3,
              px: isMobile ? 2 : 5,
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "999px",
              background: isLoading
                ? "linear-gradient(90deg, #bdbdbd, #9e9e9e)"
                : "linear-gradient(90deg, #42a5f5, #66b9ff)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
              ":hover": {
                background: isLoading
                  ? "linear-gradient(90deg, #bdbdbd, #9e9e9e)"
                  : "linear-gradient(90deg, #66b9ff, #42a5f5)",
              },
            }}
          >
            {isLoading ? "..." : "Enviar"}
          </Button>
        </Box>
        <Typography
          variant="caption"
          sx={{ textAlign: "center", color: "rgba(0,0,0,0.6)", mt: 0.5 }}
        >
          Equipo de Desarrollo Gamma Ingenieros
        </Typography>
      </Box>
    </Paper>
  );
}
