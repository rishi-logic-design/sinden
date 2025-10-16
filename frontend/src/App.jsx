// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthContainer from "./pages/login/AuthContainer";
import Dashboard from "./pages/login/Dashboard";
import ProtectedRoute from "./context/ProtectedRoute";
import RoleBasedRoute from "./context/RoleBasedRoute";
import Admin from "../src/pages/login/Admin";
import NewOrderFullScreen from "./components/dashboard/NewOrderFullScreen";
import DraftsPage from "./components/dashboard/draft/DraftPage";
import ConfigurationPage from "./components/admin/ConfigurationPage";
import ReportsPage from "./components/admin/ReportsPage";
import AdminOrders from "./components/admin/AdminOrders";
import Operators from "./pages/login/Operators";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthContainer />} />
      <Route path="/orders/new" element={<NewOrderFullScreen />} />
      <Route path="/orders/drafts" element={<DraftsPage />} />

      {/* Protected Routes with Role-based redirection */}
      <Route element={<ProtectedRoute redirectTo="/auth" />}>
        {/* Receptionist-only */}
        <Route element={<RoleBasedRoute allowedRoles={["Receptionist"]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        {/* Operator-only */}
        <Route element={<RoleBasedRoute allowedRoles={["Operator"]} />}>
          <Route path="/operators" element={<Operators />} />
        </Route>

        {/* Admin Dashboard */}
        <Route element={<RoleBasedRoute allowedRoles={["Admin"]} />}>
          <Route path="/admin" element={<Admin />}>
            {/* Nested routes for admin pages */}
            <Route index element={<Navigate to="/admin/orders" replace />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="configuration" element={<ConfigurationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
