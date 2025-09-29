// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthContainer from "./pages/login/AuthContainer";
import Dashboard from "./pages/login/Dashboard";
import ProtectedRoute from "./context/ProtectedRoute";
import RoleBasedRoute from "./context/RoleBasedRoute";
import Admin from "../src/pages/login/Admin";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthContainer />} />
      
      {/* Protected Routes with Role-based redirection */}
      <Route element={<ProtectedRoute redirectTo="/auth" />}>
        {/* Receptionist and Operator Dashboard */}
        <Route element={<RoleBasedRoute allowedRoles={["Receptionist", "Operator"]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        
        {/* Admin Dashboard */}
        <Route element={<RoleBasedRoute allowedRoles={["Admin"]} />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;