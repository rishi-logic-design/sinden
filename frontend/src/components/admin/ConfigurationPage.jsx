import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import useToast from "../../hooks/UseToast";
import ApiService from "../../services/ApiService";
import Toast from "../dashboard/Toast";

export default function ConfigurationPage() {
  // ✅ Get user data from AuthContext
  const { user, logout: authLogout, isInitialized } = useAuth();

  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });

  const updatePwd = (key, value) => setPwd((s) => ({ ...s, [key]: value }));
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // ---- Change password (uses /auth/change-password)
  const handleChangePassword = async (e) => {
    e?.preventDefault();

    if (!pwd.current || !pwd.newPwd || !pwd.confirm) {
      showError("Please fill in all password fields.");
      return;
    }
    if (pwd.newPwd !== pwd.confirm) {
      showError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      await ApiService.changePassword(pwd.current, pwd.newPwd);
      showSuccess("Password changed successfully.");
      setPwd({ current: "", newPwd: "", confirm: "" });
    } catch (err) {
      console.error("Password change failed:", err);
      showError(
        err?.message ||
          "Failed to change password. Check your current password."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- Logout (uses AuthContext logout)
  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    try {
      await authLogout();
      showSuccess("Signed out successfully.");
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out failed:", err);
      showError("Failed to sign out. Please try again.");
    }
  };

  // ✅ Show loading while AuthContext is initializing or user not available
  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="w-full px-8 bg-white pb-6 border-b border-gray-200">
        <h1 className="text-3xl pt-6 font-semibold text-slate-900">
          Configuration
        </h1>
      </header>

      {/* Full-width content */}
      <main className="w-full px-8 py-12">
        {/* USER INFO */}
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                User Information
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Basic account information (name, email, and role).
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    User name
                  </label>
                  <input
                    type="text"
                    value={user?.fullName}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm text-slate-600 mb-2">
                    Assigned role
                  </label>
                  <input
                    type="text"
                    value={user.role || ""}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200 my-8" />

        {/* SECURITY */}
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                Security
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Change your password when needed.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={pwd.current}
                    onChange={(e) => updatePwd("current", e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    New password
                  </label>
                  <input
                    type="password"
                    value={pwd.newPwd}
                    onChange={(e) => updatePwd("newPwd", e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={pwd.confirm}
                    onChange={(e) => updatePwd("confirm", e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="inline-flex items-center px-5 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200 my-8" />

        {/* SESSION */}
        <div className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                My Session
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign out safely when you finish.
              </p>
            </div>

            <div className="md:col-span-2 flex items-center">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-5 py-2.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </main>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
