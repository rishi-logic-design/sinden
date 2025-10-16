import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  User,
  RefreshCw,
} from "lucide-react";
import Toast from "../dashboard/Toast";
import useToast from "../../hooks/UseToast";
import attachmentDocument from "../../assets/img/document.png";

const BASE_API = "http://localhost:5000/api";

function formatFileSize(bytes) {
  return Math.round(bytes / 1024) + " KB";
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date
    .toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", " -");
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toISOString().split("T")[0];
}

function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toTimeString().slice(0, 5);
}

export default function OrderDetailsPage({ order, onBack = () => {} }) {
  const orderId = order?.fullData?.id || order?.id;
  const [orderDetails, setOrderDetails] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [signatureObj, setSignatureObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setOrderDetails(null);
    setAttachments([]);
    setSignatureObj(null);
    setSignatureUrl(null);
    setError(null);

    try {
      const resp = await fetch(`${BASE_API}/orders/${orderId}`, {
        credentials: "include",
      });
      if (!resp.ok) throw new showError("Failed to fetch order details");
      const order = await resp.json();
      setOrderDetails(order);

      try {
        const aResp = await fetch(`${BASE_API}/attachments/order/${orderId}`, {
          credentials: "include",
        });
        if (aResp.ok) {
          const aData = await aResp.json();
          setAttachments(aData || []);
        } else if (order.Attachments && order.Attachments.length > 0) {
          setAttachments(order.Attachments);
        }
      } catch (e) {
        showError("Failed to fetch attachments:", e);
        if (order.Attachments && order.Attachments.length > 0) {
          setAttachments(order.Attachments);
        }
      }

      try {
        const sResp = await fetch(`${BASE_API}/signatures/order/${orderId}`, {
          credentials: "include",
        });
        if (sResp.ok) {
          const sData = await sResp.json();
          setSignatureObj(sData || null);
          if (sData?.id) {
            setSignatureUrl(
              `${BASE_API}/signatures/${sData.id}/download?inline=1`
            );
          }
        } else if (order.Signatures && order.Signatures.length > 0) {
          const s = order.Signatures[0];
          setSignatureObj(s);
          if (s?.id) {
            setSignatureUrl(`${BASE_API}/signatures/${s.id}/download?inline=1`);
          }
        }
      } catch (e) {
        showError("Failed to fetch signature:", e);
        if (order.Signatures && order.Signatures.length > 0) {
          const s = order.Signatures[0];
          setSignatureObj(s);
          if (s?.id) {
            setSignatureUrl(`${BASE_API}/signatures/${s.id}/download?inline=1`);
          }
        }
      }
    } catch (err) {
      showError(err.message || "Failed to load order details");
      showError("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  const openPreview = (attachment) => {
    const url = `${BASE_API}/attachments/${attachment.id}/download?inline=1`;
    setPreviewModal({
      url,
      name: attachment.original_name,
      type: attachment.mime_type,
    });
  };

  const downloadFile = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No order data found</p>
      </div>
    );
  }

  const meta = orderDetails.meta || {};

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onBack}
                    className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {orderDetails.order_number}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 bg-white ">
                      {orderDetails.status} •{" "}
                      {formatDateTime(orderDetails.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Client name
                  </label>
                  <input
                    type="text"
                    value={meta.clientName || "N/A"}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Phone/Contact
                  </label>
                  <input
                    type="text"
                    value={meta.contact || "N/A"}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3 mt-6 gap-6">
                <div className="w-full">
                  <label className="block text-sm text-gray-600 mb-2">
                    Service type
                  </label>
                  <select
                    value={meta.serviceType || ""}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  >
                    <option value={meta.serviceType || ""}>
                      {meta.serviceType || "N/A"}
                    </option>
                  </select>
                </div>

                <div className="w-full">
                  <label className="block text-sm text-gray-600 mb-2">
                    Estimated delivery date
                  </label>
                  <input
                    type="date"
                    value={formatDate(orderDetails.estimated_delivery_at)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm text-gray-600 mb-2">
                    Estimated delivery time
                  </label>
                  <input
                    type="time"
                    value={formatTime(orderDetails.estimated_delivery_at)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Service detail
                </label>
                <textarea
                  value={meta.serviceDetail || "N/A"}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 h-20 resize-none"
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Observations
                </label>
                <textarea
                  value={meta.observations || "N/A"}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Attached documents
                  </label>
                  <div className="space-y-2">
                    {attachments.map((attachment) => {
                      const previewable =
                        attachment.mime_type === "application/pdf" ||
                        attachment.mime_type?.startsWith("image/");
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between rounded-xl bg-white p-6"
                        >
                          {/* Left: Icon + meta */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 flex items-center justify-center shrink-0">
                              <img src={attachmentDocument} alt="" />
                            </div>

                            <div className="min-w-0">
                              {/* File name */}
                              {previewable ? (
                                <button
                                  type="button"
                                  onClick={() => openPreview(attachment)}
                                  title="Preview"
                                  className="block text-sm font-medium text-sky-500 hover:underline truncate text-left"
                                >
                                  {attachment.original_name}
                                </button>
                              ) : (
                                <span className="block text-sm font-medium text-gray-800 truncate">
                                  {attachment.original_name}
                                </span>
                              )}

                              {/* Size */}
                              <span className="block text-xs text-gray-500">
                                {formatFileSize(attachment.size_bytes || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Right: actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {previewable && (
                              <button
                                type="button"
                                onClick={() => openPreview(attachment)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4 text-gray-700" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                downloadFile(
                                  `${BASE_API}/attachments/${attachment.id}/download?inline=0`,
                                  attachment.original_name
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Client signature
                  </label>
                  <div className="border border-gray-300 rounded-md bg-gray-50 w-full h-60 flex items-center justify-center relative">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Client Signature"
                        className="absolute inset-0 w-full h-full object-contain p-2"
                        onError={(e) => {
                          console.warn("Signature image failed:", signatureUrl);
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 italic text-6xl font-bold pointer-events-none">
                        {meta.clientName
                          ? meta.clientName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "NA"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewModal && (
        <div
          className="fixed inset-0  bg-black/30  transition-opacity flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{previewModal.name}</h3>
              <button
                onClick={() => setPreviewModal(null)}
                className="cursor-pointer text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {previewModal.type === "application/pdf" ? (
                <iframe
                  src={previewModal.url}
                  className="w-full h-[70vh]"
                  title="PDF Preview"
                />
              ) : previewModal.type?.startsWith("image/") ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.name}
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              ) : (
                <p className="text-gray-600 text-center">
                  Preview not available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
