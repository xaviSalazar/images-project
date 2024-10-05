import React from "react";
import ReactDOM from "react-dom/client";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Router from "./routes.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import "@/languages/index.tsx";
import { RefProvider } from "@/components/workspace/RefCanvas.tsx";
import { HashRouter } from 'react-router-dom'

// const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* <QueryClientProvider client={queryClient}> */}
      <ThemeProvider defaultTheme="dark" disableTransitionOnChange>
      <HashRouter>
        <TooltipProvider>
          <RefProvider>
            <Router />
          </RefProvider>
        </TooltipProvider>
      </HashRouter>
      </ThemeProvider>
    {/* </QueryClientProvider> */}
  </React.StrictMode>,
);
