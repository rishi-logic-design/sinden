// ConfigurationPage.jsx
import React, { useState } from "react";

/**
 * Full-width Configuration page (English)
 * - Top blue border
 * - Light card with visible border around the content area
 * - Left title column and right form column with extra horizontal spacing (gap-12)
 * - Tailwind CSS only
 */

export default function ConfigurationPage() {
  const [user, setUser] = useState({
    username: "User name",
    email: "email@company.com",
    role: "Administrator",
  });

  const [pwd, setPwd] = useState({
    current: "",
    newPwd: "",
    confirm: "",
  });

  const updateUser = (key, value) => setUser((s) => ({ ...s, [key]: value }));
  const updatePwd = (key, value) => setPwd((s) => ({ ...s, [key]: value }));

  const handleSaveProfile = (e) => {
    e?.preventDefault();
    console.log("Save profile (UI only)", user);
  };

  const handleChangePassword = (e) => {
    e?.preventDefault();
    if (pwd.newPwd !== pwd.confirm) {
      alert("New password and confirmation do not match.");
      return;
    }
    console.log("Change password (UI only)", pwd);
  };

  const handleSignOut = () => {
    console.log("Sign out (UI only)");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Thin top blue border like screenshot */}
      <div className="border-t-4 border-blue-500" />

      {/* Page header */}
      <header className="w-full px-8 pt-6 pb-4">
        <h1 className="text-3xl font-semibold text-slate-900">Configuration</h1>
      </header>

      {/* Full-width content */}
      <main className="w-full px-8 pb-12">
        <form onSubmit={handleSaveProfile} className="w-full">
          {/* Card container with visible border and background */}
          <div className="w-full bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
            <div className="px-12 py-10">
              {/* GRID: left title (3 cols) | right form (9 cols) with larger gap */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-y-6 gap-x-12 items-start">
                {/* Left title column */}
                <div className="md:col-span-3">
                  <h2 className="text-lg font-semibold text-slate-900">User details</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Basic account information (name, email and role).
                  </p>
                </div>

                {/* Right fields column */}
                <div className="md:col-span-9">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">User name</label>
                      <input
                        type="text"
                        value={user.username}
                        onChange={(e) => updateUser("username", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        onChange={(e) => updateUser("email", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Assigned role</label>
                      <select
                        value={user.role}
                        onChange={(e) => updateUser("role", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none"
                      >
                        <option>Administrator</option>
                        <option>Receptionist</option>
                        <option>Operator</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="md:col-span-12 border-t border-gray-100 my-6" />

                {/* SECURITY row */}
                <div className="md:col-span-3">
                  <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                  <p className="mt-2 text-sm text-slate-500">Change your password when needed.</p>
                </div>

                <div className="md:col-span-9">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Current password</label>
                      <input
                        type="password"
                        value={pwd.current}
                        onChange={(e) => updatePwd("current", e.target.value)}
                        placeholder="Current password"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-2">New password</label>
                      <input
                        type="password"
                        value={pwd.newPwd}
                        onChange={(e) => updatePwd("newPwd", e.target.value)}
                        placeholder="New password"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Confirm new password</label>
                      <input
                        type="password"
                        value={pwd.confirm}
                        onChange={(e) => updatePwd("confirm", e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleChangePassword}
                      type="button"
                      className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:opacity-95"
                    >
                      Update password
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="md:col-span-12 border-t border-gray-100 my-6" />

                {/* SESSION row */}
                <div className="md:col-span-3">
                  <h2 className="text-lg font-semibold text-slate-900">My session</h2>
                  <p className="mt-2 text-sm text-slate-500">Sign out safely when you finish.</p>
                </div>

                <div className="md:col-span-9">
                  <div className="mt-2">
                    <button
                      onClick={handleSignOut}
                      type="button"
                      className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
              {/* end grid */}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
