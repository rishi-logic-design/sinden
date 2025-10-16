import React from "react";

export default function AdminLoadingOverlay({
  isLoading = false,
  message = "Processing...",
  children,
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
            <svg
              className="w-12 h-12 animate-spin text-blue-600"
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
            <p className="text-gray-700 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
