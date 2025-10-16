import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ApiService from "../../services/ApiService";

const Register = ({ onSwitchToLogin }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const redirectRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    return () => {
      if (redirectRef.current) clearTimeout(redirectRef.current);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setError(""); // Clear error when user starts typing
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      setError("Full name is required.");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await ApiService.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      console.log("Registration successful:", response);

      // Auto-login after successful registration
      await login(response.token, null, response.user);
      setShowSuccessPopup(true);

      // Redirect to dashboard (new users get Receptionist role by default)
      redirectRef.current = setTimeout(() => {
        setShowSuccessPopup(false);
        navigate("/dashboard", { replace: true });
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 sm:p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
        <div className="absolute top-0 left-0 w-full h-full opacity-40">
          <div className="absolute top-20 left-20 w-80 h-80 bg-purple-300/25 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-pink-300/25 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-8 left-40 w-80 h-80 bg-blue-300/25 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        </div>
      </div>

      <div className="relative bg-white/85 backdrop-blur-xl p-10 sm:p-7 rounded-3xl shadow-2xl w-full max-w-2xl border border-purple-100/50">
        <div className="text-left mb-7">
          <h1 className="text-4xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-gray-500 text-base sm:text-sm leading-relaxed">
            Join our platform and get started today
          </p>
          
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-xs text-purple-700">
            <strong>Note:</strong> New accounts are created with Receptionist access by default.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 text-red-700 px-4 py-3 rounded-xl text-sm font-medium" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
                disabled={loading || showSuccessPopup}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-gray-50/80 backdrop-blur-sm transition-all duration-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none hover:border-purple-300 placeholder-gray-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-gray-50/80 backdrop-blur-sm transition-all duration-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none hover:border-purple-300 placeholder-gray-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create password"
                  required
                  disabled={loading || showSuccessPopup}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl text-base bg-gray-50/80 backdrop-blur-sm transition-all duration-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none hover:border-purple-300 placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={loading || showSuccessPopup}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm password"
                  required
                  disabled={loading || showSuccessPopup}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl text-base bg-gray-50/80 backdrop-blur-sm transition-all duration-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none hover:border-purple-300 placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  disabled={loading || showSuccessPopup}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none relative overflow-hidden"
            disabled={loading || showSuccessPopup}
          >
            {loading ? (
              <>
                <span className="opacity-0">Create Account</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-purple-100/50">
          <p className="text-gray-500 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              className="text-purple-600 font-semibold hover:text-blue-600 hover:underline transition-all duration-200 disabled:opacity-50"
              onClick={onSwitchToLogin}
              disabled={loading || showSuccessPopup}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Registration Successful!</h3>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
