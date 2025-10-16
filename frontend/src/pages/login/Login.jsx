import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ApiService from "../../services/ApiService";
import logoImg from "../../assets/img/login/logo.png";

const Login = ({ onSwitchToRegister }) => {
  const { login, user, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const redirectRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectRef.current) clearTimeout(redirectRef.current);
    };
  }, []);

  // Role-based redirection
  useEffect(() => {
    if (isAuthenticated && isInitialized && user) {
      const role = String(user.role || "")
        .trim()
        .toLowerCase();
      console.log("User role detected (normalized):", role);
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "operator") {
        navigate("/operators", { replace: true });
      } else if (role === "receptionist") {
        navigate("/dashboard", { replace: true });
      } else {
        console.warn("Unknown role:", user.role);
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, user, showSuccessPopup, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setError(""); // Clear error when user starts typing
  };

  const validate = () => {
    const email = (formData.email || "").trim();
    const pwd = formData.password || "";

    if (!email) {
      setError("Email is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!pwd) {
      setError("Password is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await ApiService.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      // console.log("Login successful:", response);

      // Use the login function from AuthContext
      await login(response.token, null, response.user);
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 sm:p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        </div>
      </div>
      <div className="relative bg-white/80 backdrop-blur-xl p-12 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-white/30">
        <div className="flex mb-6">
          <img
            src={logoImg}
            alt="SINDEN"
            className="h-12 w-auto drop-shadow-sm"
          />
        </div>
        <div className="text-left mb-8">
          <h1 className="text-4xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            LOGIN
          </h1>
          <p className="text-gray-500 text-base sm:text-sm leading-relaxed">
            Welcome to SINDEN, enter your details and log in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 text-red-700 px-4 py-3 rounded-xl text-sm font-medium"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@example.com"
              required
              disabled={loading || showSuccessPopup}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base bg-white/70 backdrop-blur-sm transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none hover:border-blue-300 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={loading || showSuccessPopup}
                className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 rounded-xl text-base bg-white/70 backdrop-blur-sm transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none hover:border-blue-300 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowPassword((s) => !s)}
                disabled={loading || showSuccessPopup}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none relative overflow-hidden"
            disabled={loading || showSuccessPopup}
          >
            {loading ? (
              <>
                <span className="opacity-0">Sign In</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="text-center mt-7 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-all duration-200 disabled:opacity-50"
              onClick={onSwitchToRegister}
              disabled={loading || showSuccessPopup}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Login Successful!
            </h3>
            <p className="text-sm text-gray-500">
              {user?.role === "Admin"
                ? "Redirecting to admin panel..."
                : "Redirecting to dashboard..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
