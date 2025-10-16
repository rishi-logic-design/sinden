import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  User,
  RefreshCw,
} from "lucide-react";
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

function HistoryItem({ item }) {
  return (
    <div className="border-l-2 border-gray-200 pl-4 pb-4">
      <div className="flex items-start justify-between mb-1">
        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
          {item.status}
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-1">{item.subtitle}</p>
      <p className="text-xs text-gray-500">{item.date}</p>
      <p className="text-xs text-gray-500">{item.user}</p>
    </div>
  );
}

function UpdateStatusModal({ isOpen, onClose, currentStatus, onUpdate }) {
  const [selected, setSelected] = useState(currentStatus || "");
  const modalRef = React.useRef(null);

  const statuses = [
    "Pending",
    "InProgress",
    "Executed",
    "Completed",
    "Cancelled",
    "Delivered",
    "PendingPayment",
    "Paid",
  ];

  useEffect(() => {
    if (isOpen) {
      setSelected(currentStatus || "");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentStatus]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-lg shadow-2xl p-6"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Update Status
          </h3>

          <div className="space-y-2 max-h-72 overflow-auto">
            {statuses.map((s) => (
              <label
                key={s}
                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-blue-50"
              >
                <input
                  type="radio"
                  name="order-status"
                  value={s}
                  checked={selected === s}
                  onChange={() => setSelected(s)}
                  className="h-4 w-4"
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
              className={`w-full px-4 py-3 rounded-md text-sm font-medium ${
                selected
                  ? "bg-black text-white hover:opacity-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Update Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminEditOrderPage({
  order,
  onBack = () => {},
  onRefresh,
}) {
  const orderId = order?.fullData?.id || order?.id;
  const [orderDetails, setOrderDetails] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${BASE_API}/orders/${orderId}`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to fetch order");
      const order = await resp.json();
      setOrderDetails(order);

      try {
        const aResp = await fetch(`${BASE_API}/attachments/order/${orderId}`, {
          credentials: "include",
        });
        if (aResp.ok) {
          const aData = await aResp.json();
          setAttachments(aData || []);
        }
      } catch (e) {
        console.error("Attachments fetch failed:", e);
      }

      try {
        const sResp = await fetch(`${BASE_API}/signatures/order/${orderId}`, {
          credentials: "include",
        });
        if (sResp.ok) {
          const sData = await sResp.json();
          if (sData?.id) {
            setSignatureUrl(
              `${BASE_API}/signatures/${sData.id}/download?inline=1`
            );
          }
        }
      } catch (e) {
        console.error("Signature fetch failed:", e);
      }

      try {
        const hResp = await fetch(`${BASE_API}/orders/${orderId}/history`, {
          credentials: "include",
        });
        if (hResp.ok) {
          const hData = await hResp.json();
          setHistory(Array.isArray(hData) ? hData : hData?.history || []);
        }
      } catch (e) {
        console.error("History fetch failed:", e);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${BASE_API}/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          meta: orderDetails.meta,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order");
      }

      const updatedOrder = await response.json();
      setOrderDetails(updatedOrder);
      showToast("✓ Order updated successfully!");

      if (onRefresh) onRefresh();
      fetchOrderDetails(); // Refresh history after saving changes
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`${BASE_API}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          to_status: newStatus,
          reason: "Status updated from order details page",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const updatedOrder = await response.json();
      setOrderDetails(updatedOrder);
      showToast(`✓ Status updated to "${newStatus}"!`);

      if (onRefresh) onRefresh();
      fetchOrderDetails();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const response = await fetch(`${BASE_API}/orders/${orderId}/export/pdf`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Order_${orderDetails.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("✓ PDF exported successfully!");
    } catch (err) {
      showToast(err.message || "Failed to export PDF", "error");
    } finally {
      setIsExportingPdf(false);
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
          <p className="mt-4 text-gray-600">Loading...</p>
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
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetails) return null;

  const meta = orderDetails.meta || {};

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {orderDetails.order_number}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {orderDetails.status} •{" "}
                      {formatDateTime(orderDetails.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setIsStatusModalOpen(true)}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 inline mr-2 ${
                        isUpdatingStatus ? "animate-spin" : ""
                      }`}
                    />
                    Update Status
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isExportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
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
                    value={meta.clientName || ""}
                    onChange={(e) =>
                      setOrderDetails({
                        ...orderDetails,
                        meta: { ...meta, clientName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Phone/Contact
                  </label>
                  <input
                    type="text"
                    value={meta.contact || ""}
                    onChange={(e) =>
                      setOrderDetails({
                        ...orderDetails,
                        meta: { ...meta, contact: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 mt-6 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Service type
                  </label>
                  <select
                    value={meta.serviceType || ""}
                    onChange={(e) =>
                      setOrderDetails({
                        ...orderDetails,
                        meta: { ...meta, serviceType: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select</option>
                    <option value="Installation">Installation</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Repair">Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Estimated delivery date (Read-only)
                  </label>
                  <input
                    type="date"
                    value={formatDate(orderDetails.estimated_delivery_at)}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Estimated delivery time (Read-only)
                  </label>
                  <input
                    type="time"
                    value={formatTime(orderDetails.estimated_delivery_at)}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md bg-gray-50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Service detail
                </label>
                <textarea
                  value={meta.serviceDetail || ""}
                  onChange={(e) =>
                    setOrderDetails({
                      ...orderDetails,
                      meta: { ...meta, serviceDetail: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md h-20 resize-none"
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Observations
                </label>
                <textarea
                  value={meta.observations || ""}
                  onChange={(e) =>
                    setOrderDetails({
                      ...orderDetails,
                      meta: { ...meta, observations: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Attached documents
                  </label>
                  {attachments.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 bg-white">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>No documents attached</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((attachment) => {
                        const previewable =
                          attachment.mime_type === "application/pdf" ||
                          attachment.mime_type?.startsWith("image/");
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-xl bg-white p-6 "
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                <img src={attachmentDocument} alt="" />
                              </div>

                              <div className="min-w-0">
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

                                <span className="block text-xs text-gray-500">
                                  {formatFileSize(attachment.size_bytes || 0)}
                                </span>
                              </div>
                            </div>

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
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Client signature
                  </label>
                  <div className="border rounded-md bg-gray-50 h-60 flex items-center justify-center">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-gray-400 text-6xl font-bold">
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

          <div className="w-80 bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Change history</h3>
            </div>
            <div className="p-4 max-h-[770px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No history available</p>
              ) : (
                history.map((item, i) => <HistoryItem key={i} item={item} />)
              )}
            </div>
          </div>
        </div>
      </div>

      <UpdateStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={orderDetails?.status}
        onUpdate={handleStatusUpdate}
      />

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

      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          } text-white`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
