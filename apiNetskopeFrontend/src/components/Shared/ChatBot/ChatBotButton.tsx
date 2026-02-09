// src/components/ChatBot/ChatBotButton.tsx
import { useState } from "react";
import { Box, Zoom } from "@mui/material";
//import EmojiEmotionsRoundedIcon from "@mui/icons-material/EmojiEmotionsRounded";
import ChatBotWindow from "./ChatBotWindow";

export default function ChatBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Ventana del chat */}
      <Zoom in={open}>
        <Box>{open && <ChatBotWindow onClose={() => setOpen(false)} />}</Box>
      </Zoom>

      {/* Botón flotante principal */}
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 134,
          height: 134,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(187,222,251,0.5), rgba(227,242,253,0.4))",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s ease-in-out",
          zIndex: 1300,
          backdropFilter: "blur(8px)",
          "&:hover": {
            transform: "scale(1.08)",
            boxShadow: "0 12px 28px rgba(33,150,243,0.4)",
          },
        }}
      >
        {/* Círculo interior */}
        <Box
          sx={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: 'linear-gradient(135deg, #e3f2fd 0%, #a3c9f1 50%, #d3d9e2 100%)',
            boxShadow: "inset 0 2px 5px rgba(255,255,255,0.4), 0 4px 10px rgba(33,150,243,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s ease-in-out",
            "&:hover": {
              transform: "translateY(-3px)",
            },
            "&:hover svg": {
              transform: "translateY(-3px) scale(1.05)",
              transition: "transform 0.25s ease-in-out",
            },
          }}
        >
          {/* Ícono GammIA */}
          <img src="/GammIA.jpeg" alt="Bot" width={100} />
        </Box>
      </Box>
    </>
  );
}