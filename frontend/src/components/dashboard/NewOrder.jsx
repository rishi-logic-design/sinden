// src/components/NewOrderFullScreen.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Check,
  Eye,
  Trash2,
  Download,
  CloudUpload,
} from "lucide-react";
import gsap from "gsap";

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg
      className={`${className} animate-spin`}
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
  );
}

export default function NewOrderFullScreen({ onSaved }) {
  const [clientName, setClientName] = useState("");
  const [contact, setContact] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [dateEstimated, setDateEstimated] = useState("");
  const [timeEstimated, setTimeEstimated] = useState("");
  const [serviceDetail, setServiceDetail] = useState("");
  const [observations, setObservations] = useState("");

  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null); // { url, name, type }
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const rootRef = useRef(null);

  useEffect(() => {
    if (rootRef.current) {
      try {
        gsap.from(rootRef.current, {
          x: 20,
          opacity: 100,
          duration: 0.45,
          ease: "power3.out",
        });
      } catch (e) {}
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.5;
      ctxRef.current = ctx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      // revoke all object URLs
      files.forEach((f) => {
        if (f.url && f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signature handlers
  function startSignature(e) {
    drawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    last.current = { x, y };
  }
  function moveSignature(e) {
    if (!drawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
  }
  function endSignature() {
    drawing.current = false;
  }
  function clearSignature() {
    const c = canvasRef.current,
      ctx = ctxRef.current;
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }
  function exportSignatureDataUrl() {
    const c = canvasRef.current;
    if (!c) return null;
    return c.toDataURL("image/png");
  }

  // Files handlers
  function handleInputFiles(e) {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = null;
  }
  function handleDrop(e) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  }
  function addFiles(list) {
    if (!list.length) return;
    const mapped = list.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      status: "uploading",
    }));
    setFiles((p) => [...p, ...mapped]);
    // simulate upload completion per file
    mapped.forEach((m) => simulateUpload(m));
  }
  function simulateUpload(item) {
    let prog = 0;
    const iv = setInterval(() => {
      prog += 20 + Math.random() * 20;
      if (prog >= 100) {
        prog = 100;
        clearInterval(iv);
        setFiles((prev) =>
          prev.map((f) =>
            f === item ? { ...f, status: "done", progress: 100 } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f === item ? { ...f, progress: Math.round(prog) } : f
          )
        );
      }
    }, 180 + Math.random() * 200);
  }
  function removeFile(idx) {
    setFiles((p) => {
      const copy = [...p];
      const removed = copy.splice(idx, 1)[0];
      if (removed?.url && removed.url.startsWith("blob:"))
        URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  function openPreviewFile(f) {
    if (!f) return;
    // for local PDF without url, create objectURL
    if (f.type === "application/pdf" && !f.url && f.file) {
      const url = URL.createObjectURL(f.file);
      // update file
      setFiles((prev) => prev.map((x) => (x === f ? { ...x, url } : x)));
      setPreview({ url, name: f.name, type: f.type });
      return;
    }
    setPreview({
      url: f.url || (f.file ? URL.createObjectURL(f.file) : null),
      name: f.name,
      type: f.type,
    });
  }

  // Validation
  function validate() {
    const e = {};
    if (!clientName.trim()) e.clientName = "Client name required";
    if (!serviceType) e.serviceType = "Select a service";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Save draft
  async function saveDraft() {
    if (!validate()) {
      setToast("Please fill required fields");
      return;
    }
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setToast("Saved as draft");
      try {
        gsap.fromTo(
          ".submit-success",
          { scale: 0.98, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45 }
        );
      } catch {}
      if (typeof onSaved === "function") onSaved({ mode: "draft" });
    } finally {
      setProcessing(false);
    }
  }

  // Submit (3s)
  async function submitOrder() {
    if (!validate()) {
      setToast("Please fill required fields");
      return;
    }
    setProcessing(true);
    try {
      // gather payload
      const signature = exportSignatureDataUrl();
      const payload = {
        clientName,
        contact,
        serviceType,
        dateEstimated,
        timeEstimated,
        serviceDetail,
        observations,
        files: files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          status: f.status,
        })),
        signature,
        createdAt: new Date().toISOString(),
      };
      // simulated network delay
      await new Promise((r) => setTimeout(r, 3000));
      setToast("Order submitted");
      try {
        gsap.fromTo(
          ".submit-success",
          { scale: 0.98, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45 }
        );
      } catch {}
      if (typeof onSaved === "function")
        onSaved({ mode: "submitted", payload });
      // keep form or reset as you prefer — here's a gentle reset:
      setClientName("");
      setContact("");
      setServiceType("");
      setDateEstimated("");
      setTimeEstimated("");
      setServiceDetail("");
      setObservations("");
      // revoke urls and clear files
      files.forEach((f) => {
        if (f.url && f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
      });
      setFiles([]);
      clearSignature();
    } catch (err) {
      console.error(err);
      setToast("Submit failed");
    } finally {
      setProcessing(false);
    }
  }

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div ref={rootRef} className="min-h-screen w-full p-8 ">
      <div className="max-w-[1200px] mx-auto ">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-6">New Order</h1>

        {/* Row 1: client & contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client name
            </label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.clientName ? "border-blue-400" : "border-blue-200"
              } bg-blue`}
              disabled={processing}
            />
            {errors.clientName && (
              <p className="text-xs text-red-600 mt-1">{errors.clientName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact / Phone
            </label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact or phone"
              className="mt-1 block w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-white"
              disabled={processing}
            />
          </div>
        </div>

        {/* Row 2: service, date, time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Service type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.serviceType ? "border-red-400" : "border-gray-200"
              } bg-white`}
              disabled={processing}
            >
              <option value="">Select service</option>
              <option value="cleaning">Cleaning</option>
              <option value="repair">Repair</option>
              <option value="maintenance">Maintenance</option>
            </select>
            {errors.serviceType && (
              <p className="text-xs text-red-600 mt-1">{errors.serviceType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated delivery date
            </label>
            <input
              type="date"
              value={dateEstimated}
              onChange={(e) => setDateEstimated(e.target.value)}
              className="mt-1 block w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-white"
              disabled={processing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated delivery time
            </label>
            <input
              type="time"
              value={timeEstimated}
              onChange={(e) => setTimeEstimated(e.target.value)}
              className="mt-1 block w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-white"
              disabled={processing}
            />
          </div>
        </div>

        {/* Row 3: service details */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Service details
          </label>
          <input
            value={serviceDetail}
            onChange={(e) => setServiceDetail(e.target.value)}
            placeholder="Service details"
            className="mt-1 block w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-white"
            disabled={processing}
          />
        </div>

        {/* Row 4: observations */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Observations
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-white"
            placeholder="Observations"
            disabled={processing}
          />
        </div>

        {/* Row 5: attachments & signature side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="rounded border border-dashed border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <CloudUpload className="w-5 h-5" />
                <span>Drag & drop files here, or</span>
                <label className="text-cyan-600 underline cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleInputFiles}
                    disabled={processing}
                  />
                  + Add document
                </label>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                JPEG, PNG, PDF up to 10MB
              </div>
            </div>

            {/* file list styled like the screenshot */}
            <div className="mt-4 space-y-3">
              {files.length === 0 && (
                <div className="text-sm text-gray-500">No attachments</div>
              )}
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center text-gray-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-sm">
                      <div className="text-cyan-700 font-medium">{f.name}</div>
                      <div className="text-xs text-gray-400">
                        {Math.round((f.size || 0) / 1024)} KB of{" "}
                        {Math.round((f.size || 0) / 1024)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {f.status === "done" ? (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Uploaded
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                        </svg>{" "}
                        Uploading...
                      </div>
                    )}

                    {(f.type === "application/pdf" || f.url) && (
                      <button
                        onClick={() => openPreviewFile(f)}
                        className="text-cyan-600 text-sm hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    )}

                    <a
                      href={f.url || "#"}
                      download={f.name}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client signature
            </label>
            <div className="border rounded bg-gray-50 overflow-hidden">
              <div
                style={{ height: 160 }}
                className="w-full"
                onMouseDown={startSignature}
                onMouseMove={moveSignature}
                onMouseUp={endSignature}
                onMouseLeave={endSignature}
                onTouchStart={startSignature}
                onTouchMove={moveSignature}
                onTouchEnd={endSignature}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block"
                  style={{ touchAction: "none" }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={clearSignature}
                className="px-3 py-2 border rounded text-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const data = exportSignatureDataUrl();
                  if (!data) {
                    setToast("No signature");
                    return;
                  }
                  const link = document.createElement("a");
                  link.href = data;
                  link.download = "signature.png";
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
                className="px-3 py-2 border rounded text-sm"
              >
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Actions (bottom-right) */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={saveDraft}
            disabled={processing}
            className="px-4 py-2 border rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={submitOrder}
            disabled={processing}
            className="px-5 py-2 rounded bg-black text-white text-sm hover:opacity-95 disabled:opacity-60"
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="w-4 h-4" /> Processing...
              </span>
            ) : (
              "Submit Order"
            )}
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreview(null)}
          />
          <div className="relative w-[90vw] h-[85vh] bg-white rounded shadow-lg overflow-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-medium">{preview.name}</div>
              <div className="flex items-center gap-2 px-2">
                <a
                  download={preview.name}
                  href={preview.url}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="px-2 py-1 rounded hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="w-full h-full">
              {preview.type === "application/pdf" ? (
                <object
                  data={preview.url}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <p className="p-6">
                    PDF preview not supported.{" "}
                    <a href={preview.url}>Download</a>
                  </p>
                </object>
              ) : (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="w-full h-full object-contain bg-gray-100"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* success micro indicator */}
      <div className="submit-success fixed left-6 top-6 opacity-0 pointer-events-none">
        <div className="bg-emerald-600 text-white px-3 py-2 rounded flex items-center gap-2 shadow">
          <Check className="w-4 h-4" />
          <span>Done</span>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
