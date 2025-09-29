import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  AlertTriangle,
  Info,
  FileText,
  Eye,
  Trash2,
  Download,
  CloudUpload,
  ArrowLeft,
} from "lucide-react";
import UpdateStatusModal from "../admin/UpdateStatusModal";

// Toast Component
function Toast({ message, type = "info", onClose }) {
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

// Loading Overlay Component
function LoadingOverlay({
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

// File Upload Component
function FileUpload({
  files = [],
  onFilesChange,
  onPreview,
  onError = () => {},
  onSuccess = () => {},
  disabled = false,
}) {
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (file.size > maxSize) return "File size must be less than 10MB";
    if (!allowedTypes.includes(file.type))
      return "Only JPEG, PNG, and PDF files are allowed";
    return null;
  };

  const addFiles = (fileList) => {
    if (!fileList.length || disabled) return;
    const validFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      onError(errors.join(", "));
      return;
    }

    const newFiles = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "ready",
    }));

    onFilesChange([...files, ...newFiles]);
    onSuccess(`${validFiles.length} file(s) added successfully`);
  };

  const removeFile = (fileObj) => {
    if (fileObj.url && fileObj.url.startsWith("blob:")) {
      URL.revokeObjectURL(fileObj.url);
    }
    onFilesChange(files.filter((f) => f.id !== fileObj.id));
  };

  const openPreview = (fileObj) => {
    if (!fileObj) return;
    let previewUrl = fileObj.url;
    if (fileObj.type === "application/pdf" && !previewUrl && fileObj.file) {
      previewUrl = URL.createObjectURL(fileObj.file);
    }
    if (previewUrl) {
      onPreview({ url: previewUrl, name: fileObj.name, type: fileObj.type });
    }
  };

  const handleInputFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">
        Attached documents
      </label>
      <div className="space-y-2">
        {files.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className={`rounded border-2 border-dashed p-4 transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <CloudUpload className="w-5 h-5" />
              <span>Drag & drop files here, or</span>
              <label className="text-blue-600 underline cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleInputFiles}
                  disabled={disabled}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                />
                + Add document
              </label>
            </div>
          </div>
        )}

        {files.map((fileObj) => (
          <div
            key={fileObj.id}
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-md border border-blue-200"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">
                {fileObj.name}
              </p>
              <p className="text-xs text-blue-500">
                {Math.round((fileObj.size || 0) / 1024)} KB
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(fileObj.type === "application/pdf" || fileObj.url) && (
                <button
                  onClick={() => openPreview(fileObj)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <Download className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800" />
              <button
                onClick={() => removeFile(fileObj)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {files.length > 0 && (
          <label className="text-blue-600 underline cursor-pointer text-sm">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleInputFiles}
              disabled={disabled}
              accept="image/jpeg,image/png,image/jpg,application/pdf"
            />
            + Add more documents
          </label>
        )}
      </div>
    </div>
  );
}

// Signature Canvas Component
function SignatureCanvas({ onSignatureChange, disabled = false }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctxRef.current = ctx;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getEventPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    setIsDrawing(true);
    const pos = getEventPos(e);
    lastPoint.current = pos;
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    const pos = getEventPos(e);
    const ctx = ctxRef.current;

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPoint.current = pos;
      setHasSignature(true);
      const dataUrl = canvasRef.current?.toDataURL("image/png");
      onSignatureChange(dataUrl);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSignatureChange(null);
    }
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">
        Client signature
      </label>
      <div className="border border-gray-300 rounded-md bg-gray-50 h-32 flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
        />
        {!hasSignature && (
          <div className="text-gray-400 italic text-6xl font-bold pointer-events-none">
            JP
          </div>
        )}
      </div>
    </div>
  );
}

// History Item Component
function HistoryItem({ item }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
        <span
          className={`px-2 py-1 rounded-md text-xs border ${getStatusColor(
            item.status
          )}`}
        >
          {item.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{item.subtitle}</p>
      <p className="text-xs text-gray-500">{item.date}</p>
      <p className="text-xs text-gray-700 flex items-center gap-1 mt-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
        {item.user}
      </p>
    </div>
  );
}

// Main AdminNewOrder Component
export default function AdminNewOrder({ onBack = () => {} }) {
  // Form state
  const [formData, setFormData] = useState({
    orderId: "E150291",
    clientName: "Juan Pérez",
    contact: "601 3198300",
    serviceType: "Metal sheet cutting",
    dateEstimated: "29/08/2025",
    timeEstimated: "16:00",
    serviceDetail:
      "Cutting of 20 metal sheets of 2x1.5m in personalized measurements according to attached file.",
    observations:
      "Client requests special packaging to avoid scratches in transport.",
  });

  // UI state
  const [files, setFiles] = useState([
    {
      id: 1,
      name: "Document example.pdf",
      size: 94000,
      type: "application/pdf",
    },
    {
      id: 2,
      name: "Document example.pdf",
      size: 94000,
      type: "application/pdf",
    },
  ]);
  const [signature, setSignature] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [status, setStatus] = useState("Draft"); // initialize to whatever fits your data
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // History data
  const historyItems = [
    {
      title: "Detail edit",
      subtitle: "Change in field 'Service detail'",
      date: "21/08/2025 - 15:35 hrs",
      user: "Username (Administrative)",
      status: "Draft",
    },
    {
      title: "PDF export (order)",
      subtitle: "Export of specific order",
      date: "21/08/2025 - 15:35 hrs",
      user: "Username (Administrative)",
      status: "Draft",
    },
    {
      title: "Observations edit",
      subtitle: "Change in field 'Observations'",
      date: "21/08/2025 - 15:35 hrs",
      user: "Username (Administrative)",
      status: "Draft",
    },
    {
      title: "Automatic retry",
      subtitle: "Order synchronized after reconnection",
      date: "21/08/2025 - 15:35 hrs",
      user: "(System)",
      status: "Pending",
    },
    {
      title: "Saved as draft",
      subtitle: "Incomplete order saved",
      date: "21/08/2025 - 15:35 hrs",
      user: "Username (Receptionist)",
      status: "Draft",
    },
    {
      title: "New order registration",
      subtitle: "Order created with complete data",
      date: "21/08/2025 - 15:35 hrs",
      user: "Username (User type)",
      status: "Pending",
    },
  ];

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleUpdateStatus = () => {
    showToast("Status updated successfully", "success");
  };

  const handleExportPDF = () => {
    showToast("PDF exported successfully", "success");
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <LoadingOverlay isLoading={isLoading} message="Processing...">
      <div className="min-h-screen ">
        <div className=" mx-auto p-6">
          <div className="flex gap-6">
            {/* Main Content - Left Side */}
            <div className="flex-1  rounded-lg ">
              {/* Header */}
              <div className=" p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={onBack}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        {formData.orderId}
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {status} • 21/08/2025 - 15:35 hrs
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsStatusOpen(true)}
                      className="px-4 py-2  cursor-pointer bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Update status
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="px-4  cursor-pointer py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Name */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Client name
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) =>
                        updateFormData("clientName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  {/* Phone/Contact */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Phone/Contact
                    </label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) =>
                        updateFormData("contact", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  {/* Service Type */}
                </div>
                {/* === Three fields in one row — full width === */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 mt-6 gap-6">
                  {/* Service Type */}
                  <div className="w-full">
                    <label className="block text-sm text-gray-600 mb-2">
                      Service type
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) =>
                        updateFormData("serviceType", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    >
                      <option value="Metal sheet cutting">
                        Metal sheet cutting
                      </option>
                      <option value="Welding">Welding</option>
                      <option value="Assembly">Assembly</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  {/* Delivery Date */}
                  <div className="w-full">
                    <label className="block text-sm text-gray-600 mb-2">
                      Estimated delivery date
                    </label>
                    <input
                      type="date"
                      value={formData.dateEstimated}
                      onChange={(e) =>
                        updateFormData("dateEstimated", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>

                  {/* Delivery Time */}
                  <div className="w-full">
                    <label className="block text-sm text-gray-600 mb-2">
                      Estimated delivery time
                    </label>
                    <input
                      type="time"
                      value={formData.timeEstimated}
                      onChange={(e) =>
                        updateFormData("timeEstimated", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                {/* Service Detail */}
                <div className="mt-6">
                  <label className="block text-sm text-gray-600 mb-2">
                    Service detail
                  </label>
                  <textarea
                    value={formData.serviceDetail}
                    onChange={(e) =>
                      updateFormData("serviceDetail", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 h-20 resize-none"
                  />
                </div>

                {/* Observations */}
                <div className="mt-6">
                  <label className="block text-sm text-gray-600 mb-2">
                    Observations
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) =>
                      updateFormData("observations", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 h-16 resize-none"
                  />
                </div>

                {/* Documents and Signature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Documents */}
                  <div>
                    <FileUpload
                      files={files}
                      onFilesChange={setFiles}
                      onPreview={setPreview}
                      onError={(msg) => showToast(msg, "error")}
                      onSuccess={(msg) => showToast(msg, "success")}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Signature */}
                  <div>
                    <SignatureCanvas
                      onSignatureChange={setSignature}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - History */}
            <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Change history
                </h3>
              </div>

              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  {historyItems.map((item, index) => (
                    <HistoryItem key={index} item={item} />
                  ))}
                </div>
              </div>

              {/* Chat Icon */}
              <div className="fixed bottom-6 right-6">
                <button className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <UpdateStatusModal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          currentStatus={status}
          // optional: you can pass custom status list here
          statuses={[
            "Pending",
            "In Progress",
            "Executed",
            "Any status",
            "Finalized",
            "Delivered",
            "Payment Pending",
            "Paid",
          ]}
          onUpdate={(newStatus) => {
            // UI-only update: update page state and show success toast
            setStatus(newStatus);
            showToast("Status updated successfully", "success");
            // If/when you add API, call it here to persist the change.
          }}
        />
        {/* Toast Messages */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </LoadingOverlay>
  );
}
