// AdminSidebar.jsx
"use client";
import React, { useRef, useState, useEffect } from "react";

import {
  Menu,
  LogOut,
  User,
  ChevronDown,
  FileText,
  BarChart3,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import logoImage from "../../assets/img/dashboard/logo1.png";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";

const LogoComponent = ({ className }) => (
  <div
    className={`bg-green-500 rounded-lg flex items-center justify-center ${className}`}
  >
    <span className="text-white font-bold text-xl">S</span>
  </div>
);

export default function AdminSidebar({ children }) {
  const { user, logout: authLogout, isAuthenticated } = useAuth();

  // Use user from AuthContext, fallback to default
  const currentUser = user || {
    name: "John Doe",
    email: "name@company.com",
  };
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = () => {
    const p = location.pathname || "";
    if (p.includes("/admin/reports")) return "reports";
    if (p.includes("/admin/configuration")) return "configuration";
    if (p.includes("/admin/orders")) return "orders";
    return "orders";
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState(getActiveFromPath());
  const [showToggleOnHover, setShowToggleOnHover] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const [showLogoutReveal, setShowLogoutReveal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [panelOpen, setPanelOpen] = useState(false);
  const profileRef = useRef(null);
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  const menuItems = [
    { id: "orders", label: "Orders", icon: FileText },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "configuration", label: "Configuration", icon: Settings },
  ];

  useEffect(() => {
    const onKey = (e) => {
      // Ignore if typing in input/textarea/select or with modifiers
      const tag = e.target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (e.key.toLowerCase() === "k") {
        setIsCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      // close profile / confirm when clicking outside
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowLogoutReveal(false);
        setShowConfirm(false);
        setError("");
      }
      // close panel when clicking outside
      if (
        panelOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        const sidebarNode = document.querySelector(
          'aside[data-sidebar="main"]'
        );
        if (sidebarNode && !sidebarNode.contains(e.target)) {
          setPanelOpen(false);
        }
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setShowLogoutReveal(false);
        setShowConfirm(false);
        setError("");
        setPanelOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (isCollapsed) {
      setShowLogoutReveal(false);
      setShowConfirm(false);
      setError("");
    }
  }, [isCollapsed]);

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    navigate(`/admin/${menuId}`);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      setShowToggleOnHover(false);
    }
  };

  const handleLogout = async () => {
    setProcessing(true);
    setError("");
    try {
      await authLogout();
      Navigate("/login", { replace: true });
    } catch (e) {
      setError("Logout failed. Please try again.");
      setProcessing(false);
    }
  };

  const sidebarWidth = isCollapsed ? "w-16" : "w-80";
  const contentMargin = isCollapsed ? "ml-16" : "ml-80";

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        data-sidebar="main"
        className={`${sidebarWidth} fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-40`}
      >
        {/* Logo / top with toggle */}
        <div className="flex items-center justify-between px-4 py-4  relative">
          <div
            className={`transition-all cursor-pointer duration-300 relative ${
              isCollapsed ? "w-8 h-8" : "w-12 h-12"
            }`}
            onMouseEnter={() => {
              if (isCollapsed) setIsLogoHovered(true);
            }}
            onMouseLeave={() => {
              if (isCollapsed) setIsLogoHovered(false);
            }}
          >
            {/* LOGO layer */}
            <div
              className={`absolute inset-0 transition-all duration-200 ease-out ${
                isCollapsed
                  ? isLogoHovered
                    ? "opacity-0 scale-95"
                    : "opacity-100 scale-100"
                  : "opacity-100 scale-100"
              }`}
            >
              {logoImage ? (
                <img
                  src={logoImage}
                  alt="logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <LogoComponent className="w-full cursor-pointer h-full" />
              )}
            </div>

            {/* TOGGLE overlay - appears only on hover when collapsed */}
            {isCollapsed && (
              <button
                onClick={() => {
                  toggleSidebar();
                  setIsLogoHovered(false);
                }}
                title="Open sidebar"
                aria-label="Open sidebar"
                className={`absolute cursor-pointer inset-0 m-0 flex items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm transition-all duration-200 ease-out ${
                  isLogoHovered
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                <PanelLeftOpen className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Toggle button when expanded */}
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors duration-200"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Menu */}
        <div className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: profile + logout */}
        <div className="px-4 py-4 border-t border-gray-200 mt-auto">
          <div className="relative" ref={profileRef}>
            {!isCollapsed && (
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  showLogoutReveal
                    ? "max-h-20 opacity-100 mb-3"
                    : "max-h-0 opacity-0"
                }`}
              >
                <button
                  onClick={() => setShowConfirm((v) => !v)}
                  className="w-full bg-white border border-red-200 text-red-600 rounded-lg py-3 flex items-center gap-2 justify-center shadow-sm hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Log out</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (!isCollapsed) {
                  setShowLogoutReveal((v) => !v);
                  if (showLogoutReveal) {
                    setShowConfirm(false);
                    setError("");
                  }
                }
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-300 ${
                isCollapsed ? "justify-center" : ""
              }`}
              title={
                isCollapsed ? currentUser.name || currentUser.fullName : ""
              }
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex-1 text-sm text-left min-w-0">
                    <div className="font-medium truncate text-gray-900">
                      {currentUser.name || currentUser.fullName || "User"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {currentUser.email || "user@company.com"}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                      showLogoutReveal ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

            {showConfirm && !isCollapsed && (
              <div
                ref={confirmRef}
                className="absolute left-0 bottom-full mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all duration-200 ease-out"
              >
                <div className="p-4">
                  <div className="text-sm font-medium text-gray-900">
                    Confirm logout
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Are you sure you want to log out?
                  </div>
                </div>
                {error && (
                  <div className="px-4 pb-2 text-xs text-red-600">{error}</div>
                )}
                <div className="border-t border-gray-200 flex items-center gap-2 p-4">
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      setError("");
                    }}
                    disabled={processing}
                    className="flex-1 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>
                      {processing ? "Logging out..." : "Yes, log out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
      {/* Content area */}
      <div
        className={`${contentMargin} flex-1 h-screen overflow-y-auto transition-all duration-300 ease-in-out bg-gray-50`}
      >
        {children} {/* Render children prop instead of renderContent() */}
      </div>
    </div>
  );
}
