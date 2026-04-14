import { Routes, Route } from "react-router";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import MainLayout from "./layouts/MainLayout";

// pages
import Login from "@/pages/Login";
import Dashboard from "./pages/Dashboard";

import Classrooms from "./pages/classrooms/index";
import ClassroomShow from "./pages/classrooms/show";

function App() {
  return (
    <>
      <Routes>
        <Route
          element={
            <AuthenticatedRoute>
              <MainLayout />
            </AuthenticatedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/classrooms" element={<Classrooms />} />
          <Route path="/classrooms/:id" element={<ClassroomShow />} />
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
