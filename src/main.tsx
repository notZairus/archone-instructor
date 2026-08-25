import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "sonner";
import AuthProvider from "./components/AuthProvider.tsx";
import ClassroomProvider from "./components/ClassroomProvider.tsx";
import ThemeProvider from "./components/ThemeProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ClassroomProvider>
            <App />
          </ClassroomProvider>
        </AuthProvider>
      </ThemeProvider>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
