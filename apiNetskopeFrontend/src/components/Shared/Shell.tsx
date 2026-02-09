// shell.tsx
import { Box } from "@mui/material";
import type { PropsWithChildren } from "react";
import ChatBotButton from "./ChatBot/ChatBotButton"; 
import { useLocation } from "react-router-dom";

type ShellProps = PropsWithChildren<{}>;

export default function Shell({ children }: ShellProps) {
  const location = useLocation();

  // ✅ Detecta si hay token (usuario logueado)
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  // ✅ Solo mostrar ChatBot si el usuario está logueado y NO está en login
  const showChatBot = isLoggedIn && location.pathname !== "/login";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative", 
      }}
    >
      {/* MAIN */}
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      {/* ChatBot flotante */}
      {showChatBot && <ChatBotButton />}
    </Box>
  );
}
