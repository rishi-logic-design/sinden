// UpdateStatusModal.jsx
import React, { useEffect, useRef, useState } from "react";

export default function UpdateStatusModal({
  isOpen,
  onClose,
  currentStatus = "",
  statuses = [
    "Pending",
    "In Progress",
    "Executed",
    "Any status",
    "Finalized",
    "Delivered",
    "Payment Pending",
    "Paid",
  ],
  onUpdate = () => {},
}) {
  const [selected, setSelected] = useState(currentStatus || "");
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(currentStatus || "");
      // lock background scroll while modal open
      document.body.style.overflow = "hidden";
      // focus first radio after short delay
      setTimeout(() => {
        const el = modalRef.current?.querySelector("input[type='radio']");
        if (el) el.focus();
      }, 10);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentStatus]);

  // close on ESC, Enter confirms if selected
  useEffect(() => {
    const onKey = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && selected) {
        onUpdate(selected);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, selected, onClose, onUpdate]);

  if (!isOpen) return null;

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        aria-hidden="true"
      />

      {/* modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-status-title"
      >
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-100 p-6 relative transform transition-all duration-200 ease-out"
          style={{ animation: "modalIn 160ms ease-out" }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 p-1 rounded-md"
          >
            ✕
          </button>

          <h3 id="update-status-title" className="text-lg font-semibold text-gray-900 mb-4">
            Update Status
          </h3>

          <div className="space-y-2  cursor-pointer max-h-72 overflow-auto pr-1">
            {statuses.map((s) => (
              <label
                key={s}
                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-blue-50 transition"
              >
                <input
                  type="radio"
                  name="order-status"
                  value={s}
                  checked={selected === s}
                  onChange={() => setSelected(s)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-800">{s}</span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                if (!selected) return;
                onUpdate(selected);
                onClose();
              }}
              disabled={!selected}
              className={`w-full px-4 py-3 rounded-md text-sm font-medium transition ${
                selected ? "bg-black text-white hover:opacity-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Update Changes
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(6px) scale(.995); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
