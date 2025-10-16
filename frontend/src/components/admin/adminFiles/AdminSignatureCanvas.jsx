import React, { useEffect, useRef, useState } from "react";

export default function AdminSignatureCanvas({ onSignatureChange, disabled = false }) {
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

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">Client signature</label>
      <div className="border border-gray-300 rounded-md bg-gray-50 h-32 flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
          onTouchMove={(e) => { e.preventDefault(); draw(e); }}
          onTouchEnd={(e) => { e.preventDefault(); stopDrawing(); }}
        />
        {!hasSignature && (
          <div className="text-gray-400 italic text-6xl font-bold pointer-events-none">JP</div>
        )}
      </div>
    </div>
  );
}