import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import "@/languages/index.tsx";
import { RefProvider } from "@/components/RefCanvas";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" disableTransitionOnChange>
        <TooltipProvider>
          <RefProvider>
            <App />
          </RefProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
