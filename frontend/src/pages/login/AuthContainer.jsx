// src/pages/login/AuthContainer.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Login from "./Login";
import Register from "./Register";

const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  // Role-based redirection after login
  useEffect(() => {
    if (isAuthenticated && isInitialized && user) {
      console.log("User role detected:", user.role);

      // Auto redirect based on user role
      if (user.role === "Admin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "Receptionist" || user.role === "Operator") {
        navigate("/dashboard", { replace: true });
      } else {
        // Fallback for unknown roles
        console.warn("Unknown role:", user.role);
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, user, navigate]);

  return (
    <>
      {isLogin ? (
        <Login onSwitchToRegister={switchToRegister} />
      ) : (
        <Register onSwitchToLogin={switchToLogin} />
      )}
    </>
  );
};

export default AuthContainer;
