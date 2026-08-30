import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import AuthProvider from "./components/AuthProvider.tsx";
import ClassroomProvider from "./components/ClassroomProvider.tsx";
import ThemeProvider from "./components/ThemeProvider.tsx";
import ToastProvider from "./components/ToastProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ClassroomProvider>
              <App />
            </ClassroomProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
