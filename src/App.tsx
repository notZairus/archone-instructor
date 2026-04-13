import { Routes, Route } from "react-router";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import MainLayout from "./layouts/MainLayout";

// pages
import Login from "@/pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <AuthenticatedRoute>
              <MainLayout />
            </AuthenticatedRoute>
          }
        >
          <Route index element={<Dashboard />} />
        </Route>
        <Route
          path="/login"
          element={
            <UnauthenticatedRoute>
              <Login />
            </UnauthenticatedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
