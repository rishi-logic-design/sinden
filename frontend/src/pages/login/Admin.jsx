import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";

const Admin = () => {
  return (
    <div>
      <AdminSidebar>
        <Outlet />
      </AdminSidebar>
    </div>
  );
};

export default Admin;