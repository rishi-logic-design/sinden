"use client";
import logoImage from "../../assets/img/dashboard/logo1.png";

import React, { useRef, useState, useEffect } from "react";
import {
  Menu,
  Plus,
  LogOut,
  User,
  ChevronDown,
  X,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ApiService from "../../services/ApiService";
import PendingPage from "../dashboard/pendingPage/PendingPage";

const statusClasses = (status) => {
  switch (status?.toLowerCase()) {
    case "draft":
      return "bg-gray-200 text-gray-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "finished":
      return "bg-emerald-100 text-emerald-800";
    case "in progress":
    case "inprogress":
      return "bg-sky-100 text-sky-800";
    case "delivered":
      return "bg-indigo-100 text-indigo-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const LogoComponent = ({ className }) => (
  <div
    className={`bg-green-500 rounded-lg flex items-center justify-center ${className}`}
  >
    <span className="text-white font-bold text-xl">S</span>
  </div>
);

function OrderRow({ order, active, onOpen, isCollapsed }) {
  return (
    <button
      onClick={() => onOpen && onOpen(order)}
      className={`w-full text-left cursor-pointer flex items-start gap-3 p-3 rounded-lg transition-colors ${
        active ? "bg-gray-100" : "hover:bg-slate-50"
      }`}
      type="button"
      title={isCollapsed ? `${order.id} - ${order.status}` : ""}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-sm font-medium truncate ${
              isCollapsed ? "text-center w-full" : ""
            }`}
          >
            {isCollapsed ? order.id.slice(-4) : order.id}
          </div>
          {!isCollapsed && (
            <div
              className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${statusClasses(
                order.status
              )}`}
            >
              {order.status}
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            {order.date}
          </div>
        )}
      </div>
    </button>
  );
}

export default function OperatorSidebar({ onNewOrder }) {
  const { user, logout: authLogout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const [showLogoutReveal, setShowLogoutReveal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [detailsText, setDetailsText] = useState("");

  const profileRef = useRef(null);
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeView, setActiveView] = useState("new");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const currentUser = user || { name: "User", email: "user@company.com" };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} - ${hh}:${min} hrs`;
  };

  function handleOrderClick(order) {
    // Open order viewer for all orders
    setSelectedOrderId(order._dbId);
    setActiveView("orderViewer");
    setPanelOpen(false);
    setPanelData(null);
  }

  // Fetch orders from database
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await ApiService.getOrders();

      const rows = (data || []).map((o) => ({
        id: o.order_number || `ORD-${o.id}`,
        date: formatDate(o.createdAt || o.updatedAt),
        status: o.status || "Pending",
        _dbId: o.id,
        _fullData: o,
      }));

      setOrders(rows);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target) &&
        confirmRef.current &&
        !confirmRef.current.contains(e.target)
      ) {
        setShowLogoutReveal(false);
        setShowConfirm(false);
        setError("");
      }
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
          setPanelData(null);
          setDetailsText("");
        }
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setShowLogoutReveal(false);
        setShowConfirm(false);
        setError("");
        setPanelOpen(false);
        setPanelData(null);
        setDetailsText("");
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

  const handleNewOrder = () => {
    setActiveView("new");
    setSelectedOrderId(null);
    if (typeof onNewOrder === "function") return onNewOrder();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      setIsLogoHovered(false);
    }
  };

  const handleLogout = async () => {
    setProcessing(true);
    setError("");

    try {
      await authLogout();
      console.log("Logout successful");
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout error:", e);
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
        className={`${sidebarWidth} fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out z-40`}
      >
        {/* Logo / top with toggle */}
        <div className="flex items-center justify-between px-4 py-3  relative">
          <div
            className={`transition-all cursor-pointer duration-300 relative ${
              isCollapsed ? "w-8 h-8" : "w-16 h-16"
            }`}
            onMouseEnter={() => {
              if (isCollapsed) setIsLogoHovered(true);
            }}
            onMouseLeave={() => {
              if (isCollapsed) setIsLogoHovered(false);
            }}
          >
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

        {/* New Order */}
        <div className="px-4 py-3">
          <button
            onClick={handleNewOrder}
            className={`w-full flex items-center justify-center gap-2 bg-black text-white rounded-lg py-3 shadow-sm hover:opacity-95 cursor-pointer transition-all duration-300 ${
              isCollapsed ? "px-2" : "px-4"
            }`}
            title={isCollapsed ? "New Order" : ""}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">New Order</span>}
          </button>
        </div>
        {/* <button
          className={`w-full flex items-center justify-center gap-2 bg-black text-white rounded-lg py-3 shadow-sm hover:opacity-95 cursor-pointer transition-all duration-300 ${
            isCollapsed ? "px-2" : "px-4"
          }`}
          disabled
        >
          <Link to="/orders/drafts">Drafts</Link>
        </button> */}

        {/* Orders header */}
        {!isCollapsed && (
          <div className="px-4 pb-2">
            <h6 className="text-sm text-gray-400">Order History</h6>
          </div>
        )}

        {/* Orders list */}
        <div className="px-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-400">Loading orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-400">No orders yet</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map((o, idx) => (
                <OrderRow
                  key={o._dbId || o.id}
                  order={o}
                  active={selectedOrderId === o._dbId}
                  onOpen={handleOrderClick}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer: profile + logout */}
        <div className="px-4 py-4 border-t border-gray-100">
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
                  className="w-full bg-white border border-red-100 text-red-500 rounded-lg py-3 flex items-center gap-2 justify-center shadow-sm cursor-pointer hover:bg-red-50 transition-colors"
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
              className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-all duration-300 ${
                isCollapsed ? "justify-center" : ""
              }`}
              title={
                isCollapsed ? currentUser.name || currentUser.fullName : ""
              }
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-sm text-left min-w-0">
                    <div className="font-medium truncate">
                      {currentUser.name || currentUser.fullName || "User"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {currentUser.email || "user@company.com"}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                      showLogoutReveal ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

            {showConfirm && !isCollapsed && (
              <div
                ref={confirmRef}
                className="absolute left-0 bottom-full mb-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg z-50 transition-all duration-200 ease-out"
              >
                <div className="p-3">
                  <div className="text-sm font-medium">Confirm logout</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Are you sure you want to log out?
                  </div>
                </div>
                {error && (
                  <div className="px-3 pb-2 text-xs text-red-600">{error}</div>
                )}
                <div className="border-t border-gray-100 flex items-center gap-2 p-3">
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      setError("");
                    }}
                    disabled={processing}
                    className="flex-1 px-3 py-2 rounded-md text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={processing}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {processing ? (
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
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

      {/* Content Area */}
      <div
        className={`${contentMargin} flex-1 h-screen overflow-y-auto transition-all duration-300 ease-in-out bg-gray-50`}
      >
        <div className="h-full">
          <div className="h-full">
            {activeView === "orderViewer" && selectedOrderId ? (
              <PendingPage
                orderId={selectedOrderId}
                onClose={() => {
                  setActiveView("new");
                  setSelectedOrderId(null);
                }}
              />
            ) : (
              //   <NewOrderFullScreen onOrderSaved={handleOrderSavedFromForm} />
              ""
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
