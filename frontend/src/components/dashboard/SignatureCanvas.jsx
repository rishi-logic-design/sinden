import React, { useRef, useEffect, useState } from "react";

export default function SignatureCanvas({
  onSignatureChange,
  disabled = false,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size with high DPI support
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

    // Clear canvas with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getEventPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
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

      // Notify parent of signature change
      const dataUrl = getSignatureDataUrl();
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

  const getSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const downloadSignature = () => {
    if (!hasSignature) return;

    const dataUrl = getSignatureDataUrl();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "signature.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Client signature *
      </label>

      <div
        className={`border rounded bg-gray-50 overflow-hidden ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-40 block cursor-crosshair"
          style={{
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
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
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={clearSignature}
          disabled={!hasSignature || disabled}
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={downloadSignature}
          disabled={!hasSignature || disabled}
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>

      {!hasSignature && (
        <p className="text-xs text-gray-500 mt-2">
          Draw your signature in the box above
        </p>
      )}
    </div>
  );
}
