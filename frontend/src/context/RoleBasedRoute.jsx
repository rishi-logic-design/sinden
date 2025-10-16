// src/context/RoleBasedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleBasedRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isInitialized } = useAuth();

  // Wait for authentication to be initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-4 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, this should be handled by ProtectedRoute
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user's role is allowed - case insensitive comparison
  const userRole = String(user.role || "")
    .trim()
    .toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
  const hasPermission = normalizedAllowedRoles.includes(userRole);

  if (!hasPermission) {
    // Redirect based on user role to their appropriate dashboard
    if (userRole === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (userRole === "operator") {
      return <Navigate to="/operators" replace />;
    } else if (userRole === "receptionist") {
      return <Navigate to="/dashboard" replace />;
    } else {
      // Fallback for unknown roles
      return <Navigate to="/auth" replace />;
    }
  }

  // If user has permission, render children or outlet
  return children ? children : <Outlet />;
};

export default RoleBasedRoute;
