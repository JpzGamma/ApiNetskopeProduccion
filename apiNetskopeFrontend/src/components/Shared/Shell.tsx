// src/components/Shared/Shell.tsx
import { Box } from "@mui/material";
import ChatBotButton from "./ChatBot/ChatBotButton";
import { Outlet, useLocation } from "react-router-dom";

export default function Shell() {
  const location = useLocation();

  const accessToken = localStorage.getItem("access_token");
  const pending2fa = localStorage.getItem("pending_2fa_token");

  const isLoggedIn = Boolean(accessToken);

  // Ocultar chatbot en pantallas públicas/OTP
  const hideOnRoutes = [
    "/login",
    "/register",
    "/verify",
    "/forgot",
    "/reset-password",
    "/verify-2fa",
    "/welcome",
  ];

  const showChatBot =
    isLoggedIn && !pending2fa && !hideOnRoutes.includes(location.pathname);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {showChatBot && <ChatBotButton />}
    </Box>
  );
}
