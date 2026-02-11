import { Box } from "@mui/material";
import ChatBotButton from "./ChatBot/ChatBotButton";
import { Outlet } from "react-router-dom";

export default function Shell() {
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  // Aquí Shell SOLO se usa en rutas privadas, así que con token = true siempre puede mostrarse
  const showChatBot = isLoggedIn;

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
