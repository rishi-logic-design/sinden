import { useState } from "react";

function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showSuccess: (msg) => showToast(msg, "success"),
    showError: (msg) => showToast(msg, "error"),
    showWarning: (msg) => showToast(msg, "warning"),
    removeToast,
  };
}

export default useToast;
