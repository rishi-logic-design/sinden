// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ redirectTo = "/auth", children }) => {
  const { isAuthenticated, isRefreshing, isInitialized } = useAuth();
  const location = useLocation();

  // Show loading spinner while initializing or refreshing token
  if (!isInitialized || isRefreshing) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4 p-4"
        role="status"
        aria-live="polite"
      >
        <div
          className="w-10 h-10 border-4 border-gray-200 border-t-4 border-t-blue-600 rounded-full animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-gray-700">
          {!isInitialized ? "Loading..." : "Verifying authentication..."}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If authenticated, render children or outlet
  return children ? children : <Outlet />;
};

export default ProtectedRoute;