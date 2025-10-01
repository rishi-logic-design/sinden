import React, { useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PendingFilePreviewModal({ preview, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    if (!preview) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-60 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-[90vw] h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-900 truncate flex-1 mr-4">
                        {preview.name}
                    </h3>

                    <div className="flex items-center gap-2">
                        {preview.url && (
                            <a
                                href={preview.url}
                                download={preview.name}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                                title="Download"
                            >
                                <Download className="w-5 h-5" />
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 h-full overflow-auto bg-gray-100">
                    {preview.type === "application/pdf" ? (
                        <div className="w-full h-full">
                            <object
                                data={preview.url}
                                type="application/pdf"
                                className="w-full h-full"
                            >
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center p-6">
                                        <p className="text-gray-600 mb-4">
                                            PDF preview not available in this browser.
                                        </p>
                                        {preview.url && (
                                            <a
                                                href={preview.url}
                                                download={preview.name}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </object>
                        </div>
                    ) : preview.type?.startsWith("image/") ? (
                        <div className="flex items-center justify-center h-full p-4">
                            <img
                                src={preview.url}
                                alt={preview.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "block";
                                }}
                            />
                            <div
                                className="text-center text-gray-600"
                                style={{ display: "none" }}
                            >
                                <p>Unable to load image</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center p-6">
                                <p className="text-gray-600 mb-4">
                                    Preview not available for this file type.
                                </p>
                                {preview.url && (
                                    <a
                                        href={preview.url}
                                        download={preview.name}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download File
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
