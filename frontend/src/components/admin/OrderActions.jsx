// OrderActions.jsx
import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export default function OrderActions({
  order,
  onView = () => {},
  onEdit = () => {},
  onChangeStatus = () => {},
  onExportPdf = () => {},
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // close on outside click
  
  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // stop background scroll when open? (not necessary for small dropdown)

  const handleOpen = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleAction = (fn) => (e) => {
    e.stopPropagation();
    fn(order);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* 3-dot button */}
      <button
        onClick={handleOpen}
        onMouseDown={(e) => e.stopPropagation()}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1 rounded-md hover:bg-gray-100 transition text-gray-600"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {/* Dropdown */}
      <div
        className={`origin-top-right absolute right-0 mt-2 z-50 transform transition-all duration-150 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
        role="menu"
        aria-hidden={!open}
      >
        <div className="min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-100 py-2">
          <ul className="text-sm text-gray-800">
            <li
              onClick={handleAction(onView)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              role="menuitem"
            >
              View Details
            </li>
            <li
              onClick={handleAction(onEdit)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              role="menuitem"
            >
              Edit
            </li>
            <li
              onClick={handleAction(onChangeStatus)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              role="menuitem"
            >
              Change Status
            </li>
            <li
              onClick={handleAction(onExportPdf)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              role="menuitem"
            >
              Export PDF
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
