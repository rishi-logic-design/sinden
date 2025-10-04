import React, { useState, useEffect } from "react";
import ApiService from "../../services/ApiService";

export default function ConfigurationPage() {
  const [user, setUser] = useState({
    username: "",
    email: "",
    role: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({
    current: "",
    newPwd: "",
    confirm: "",
  });

  const updatePwd = (key, value) => setPwd((s) => ({ ...s, [key]: value }));

  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const userData = await ApiService.getCurrentUser();
      setUser({
        username: userData.fullName || userData.name || "",
        email: userData.email || "",
        role: userData.role || "",
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);
      console.log("Failed to load user details. Please try logging in again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e?.preventDefault();
    
    if (!pwd.current || !pwd.newPwd || !pwd.confirm) {
      console.log("Please fill in all password fields.");
      return;
    }

    if (pwd.newPwd !== pwd.confirm) {
      console.log("New password and confirmation do not match.");
      return;
    }

    if (pwd.newPwd.length < 8) {
      console.log("Password must be at least 8 characters long.");
      return;
    }

    try {
      setSaving(true);
      await ApiService.changePassword(pwd.current, pwd.newPwd);
      console.log("Password changed successfully!");
      setPwd({ current: "", newPwd: "", confirm: "" });
    } catch (error) {
      console.error("Password change failed:", error);
      console.log(error.message || "Failed to change password. Please check your current password.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    
    try {
      await ApiService.logout();
      console.log("Signed out successfully!");
      // Redirect to login page
      window.location.href = "/login"; // Adjust path as needed
    } catch (error) {
      console.error("Sign out failed:", error);
      console.log("Failed to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="w-full px-8 bg-white pb-6 border-b border-gray-200">
        <h1 className="text-3xl pt-6 font-semibold text-slate-900">Configuration</h1>
      </header>

      {/* Full-width content */}
      <main className="w-full px-8 py-12">
        <div className="max-w-5xl">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* USER DETAILS Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold text-slate-900">User Details</h2>
              <p className="mt-2 text-sm text-slate-500">
                Basic account information (name, email and role).
              </p>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    User name
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Assigned role
                  </label>
                  <input
                    type="text"
                    value={user.role}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-8" />

            {/* SECURITY Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold text-slate-900">Security</h2>
              <p className="mt-2 text-sm text-slate-500">
                Change your password when needed.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
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
                  <label className="block text-sm font-medium text-slate-600 mb-2">
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
                  <label className="block text-sm font-medium text-slate-600 mb-2">
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

              <div className="mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="inline-flex items-center px-5 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-8" />

            {/* SESSION Section */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">My session</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign out safely when you finish.
              </p>

              <div className="mt-6">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-5 py-2.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}