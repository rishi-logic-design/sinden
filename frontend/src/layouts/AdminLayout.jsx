// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar"; // path adjust karo

export default function AdminLayout() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-gray-50 ml-16 md:ml-80 transition-all duration-300 ease-in-out">
        <div className="min-h-full p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
