import { Routes, Route, Navigate } from "react-router";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import MainLayout from "./layouts/MainLayout";

// pages
import RegisterStudent from "./pages/Register-student";

import Login from "@/pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";

import Dashboard from "./pages/Dashboard";

import StudentAnalysisTest from "./pages/student-analysis/test_index";
import StudentAnalysis from "./pages/student-analysis/test_index";
import StudentAnalysisShow from "./pages/student-analysis/show";

import Classrooms from "./pages/classrooms/index";
import ClassroomShow from "./pages/classrooms/show";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route
          element={
            <AuthenticatedRoute>
              <MainLayout />
            </AuthenticatedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/student-analysis" element={<StudentAnalysis />} />

          <Route
            path="/student-analysis/:analysisId"
            element={<StudentAnalysisShow />}
          />
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

        <Route
          path="/register"
          element={
            <UnauthenticatedRoute>
              <Register />
            </UnauthenticatedRoute>
          }
        />
        <Route
          path="/register-student"
          element={
            <UnauthenticatedRoute>
              <RegisterStudent />
            </UnauthenticatedRoute>
          }
        />

        <Route path="/verify" element={<Verify />} />
      </Routes>
    </>
  );
}

export default App;
