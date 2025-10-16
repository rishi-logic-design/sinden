// src/components/LoginRedirect.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginRedirect = () => {
  const { user, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && isInitialized && user) {
      // Redirect based on user role
      const role = String(user.role || "")
        .trim()
        .toLowerCase();

      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "operator") {
        navigate("/operators", { replace: true });
      } else if (role === "receptionist") {
        navigate("/dashboard", { replace: true });
      } else {
        console.warn("Unknown user role:", user.role);
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, user, navigate]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-4 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginRedirect;
