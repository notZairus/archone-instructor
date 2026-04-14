import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "sonner";
import AuthProvider from "./components/AuthProvider.tsx";
import ClassroomProvider from "./components/ClassroomProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClassroomProvider>
          <App />
        </ClassroomProvider>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
