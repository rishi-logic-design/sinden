// src/components/Sidebar.jsx
"use client";
import logoImage from "../../assets/img/dashboard/logo1.png";

import React, { useRef, useState, useEffect } from "react";
import { Menu, Plus, LogOut, User, ChevronDown, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext"; // keep your path
import NewOrder from "./NewOrder";
import NewOrderFullScreen from "./NewOrderFullScreen";

const sampleOrders = [
  { id: "E150291", date: "21/08/2025 - 15:35 hrs", status: "Draft" },
  { id: "E150292", date: "21/08/2025 - 15:35 hrs", status: "Pending" },
  { id: "E150293", date: "21/08/2025 - 15:35 hrs", status: "Finished" },
  { id: "E150294", date: "21/08/2025 - 15:35 hrs", status: "In progress" },
  { id: "E150295", date: "21/08/2025 - 15:35 hrs", status: "Delivered" },
];

const statusClasses = (status) => {
  switch (status?.toLowerCase()) {
    case "draft":
      return "bg-gray-200 text-gray-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "finished":
      return "bg-emerald-100 text-emerald-800";
    case "in progress":
      return "bg-sky-100 text-sky-800";
    case "delivered":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/** Clickable Order row: calls onOpen(order) when clicked */
function OrderRow({ order, active, onOpen, isCollapsed }) {
  return (
    <button
      onClick={() => onOpen && onOpen(order)}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
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

/**
 * Sidebar + Right Details Panel (slide-in)
 *
 * - Click an order to open the panel on the right of the sidebar
 * - Panel contains a simple "Add details" form (demo local save)
 */
export default function Sidebar({ onNewOrder }) {
  const { logout } = useAuth();
  // router logic omitted for brevity – keep your redirect logic if needed
  const user = { name: "John Doe", email: "name@company.com" };

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // states for logout reveal / confirm (kept minimal here)
  const [showLogoutReveal, setShowLogoutReveal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // NEW: details panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelData, setPanelData] = useState(null); // selected order or null
  const [detailsText, setDetailsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState({}); // store saved details keyed by order.id

  const profileRef = useRef(null);
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

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
      // close panel if click outside the panel and outside sidebar (optional)
      if (
        panelOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        // don't auto-close if click inside sidebar; only close if click far away
        // here we choose: close only when clicking outside both sidebar and panel
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

  // Close logout reveal when sidebar collapses
  useEffect(() => {
    if (isCollapsed) {
      setShowLogoutReveal(false);
      setShowConfirm(false);
      setError("");
    }
  }, [isCollapsed]);

  const handleNewOrder = () => {
    if (typeof onNewOrder === "function") return onNewOrder();
    alert("New Order clicked!");
  };

  // when an order is clicked – open panel and load saved notes if any
  function openDetails(order) {
    setPanelData(order);
    setDetailsText(savedNotes[order.id] || "");
    setPanelOpen(true);
  }

  // demo save (you'll replace with API call)
  async function handleSaveDetails() {
    if (!panelData) return;
    setSaving(true);
    // simulate save latency
    await new Promise((r) => setTimeout(r, 800));
    setSavedNotes((prev) => ({ ...prev, [panelData.id]: detailsText }));
    setSaving(false);
    // optionally give user feedback
    // keep panel open
  }

  const sidebarWidth = isCollapsed ? "w-20" : "w-80";
  const contentMargin = isCollapsed ? "ml-20" : "ml-80";

  return (
    <div className="flex h-screen">
      {/* Sidebar itself */}
      <aside
        data-sidebar="main"
        className={`${sidebarWidth} fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out z-40`}
      >
        {/* Top */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div
            className={`transition-all duration-300 ${
              isCollapsed ? "w-12 h-12" : "w-16 h-16"
            }`}
          >
            <img
              src={logoImage}
              alt="logo"
              className="w-full h-full object-contain"
            />
          </div>
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

        {/* Orders header */}
        {!isCollapsed && (
          <div className="px-4 pb-2">
            <h6 className="text-sm text-gray-400">Order History</h6>
          </div>
        )}

        {/* Orders list */}
        <div className="px-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="flex flex-col gap-2">
            {sampleOrders.map((o, idx) => (
              <OrderRow
                key={o.id + idx}
                order={o}
                active={idx === 0}
                onOpen={openDetails}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </div>

        {/* Footer (profile + logout reveal) */}
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
                  className="w-full bg-white border border-red-100 text-red-500 rounded-lg py-3 flex items-center gap-2 justify-center shadow-sm cursor-pointer"
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
              title={isCollapsed ? user.name : ""}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-sm text-left min-w-0">
                    <div className="font-medium truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email}
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

            {/* confirm box kept minimal */}
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
                    className="flex-1 px-3 py-2 rounded-md text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setProcessing(true);
                      await new Promise((r) => setTimeout(r, 3000));
                      try {
                        await logout();
                        window.location.href = "/login";
                      } catch (e) {
                        setError("Logout failed");
                        setProcessing(false);
                      }
                    }}
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

      {/* ===== Right-side Content Area (scrollable) ===== */}
      <div
        className={`${contentMargin} flex-1 h-screen overflow-y-auto transition-all duration-300 ease-in-out bg-gray-50`}
      >
        <div className="h-full">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 mt-10 w-5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <NewOrderFullScreen />
        </div>
      </div>
    </div>
  );
}
