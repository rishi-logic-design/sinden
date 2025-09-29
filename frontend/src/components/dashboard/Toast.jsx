import React, { useEffect, useState } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";

export default function Toast({ message, type = "info", onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    const base =
      "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[300px]";
    switch (type) {
      case "success":
        return `${base} bg-green-500`;
      case "error":
        return `${base} bg-red-500`;
      case "warning":
        return `${base} bg-orange-500`;
      default:
        return `${base} bg-blue-500`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Check className="w-5 h-5" />;
      case "error":
        return <X className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`fixed top-6 right-6 z-50 transition-all duration-300 transform ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className={getStyles()}>
        {getIcon()}
        <span className="flex-1">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
