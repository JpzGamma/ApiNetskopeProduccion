import { Box } from "@mui/material"; 
import type { PropsWithChildren } from "react";

type ShellProps = PropsWithChildren<{}>;

export default function Shell({ children }: ShellProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MAIN: ocupa todo el alto restante */}
      <Box
        component="main"
        sx={{
          
        }}
      >
        {children}
      </Box>
    </Box>
  );
}