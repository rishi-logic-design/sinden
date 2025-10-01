import React, { useRef, useEffect, useState } from "react";

export default function PendingSignatureCanva({
    onSignatureChange,
    disabled = false,
    strokeWidth = 2.5,      // CSS px
    strokeColor = "#111827",
    exportScale = 2,        // for sharper PNGs
}) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    // keep vector paths so we can redraw/export at any resolution
    const strokesRef = useRef([]);
    const currentPathRef = useRef(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const cssSizeRef = useRef({ w: 0, h: 0 });

    const getDPR = () => window.devicePixelRatio || 1;

    const setCanvasSize = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = getDPR();

        cssSizeRef.current = { w: rect.width, h: rect.height };

        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctxRef.current = ctx;

        // reset then apply DPR scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cssSizeRef.current.w, cssSizeRef.current.h);

        redraw();
    };

    const getEventPos = (nativeEvent) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: nativeEvent.clientX - rect.left,
            y: nativeEvent.clientY - rect.top,
        };
    };

    const drawSmoothPath = (ctx, pts) => {
        if (!pts || pts.length === 0) return;

        if (pts.length === 1) {
            const p = pts[0];
            ctx.beginPath();
            ctx.arc(p.x, p.y, strokeWidth / 2, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
    };

    const redraw = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cssSizeRef.current.w, cssSizeRef.current.h);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        for (const path of strokesRef.current) {
            drawSmoothPath(ctx, path);
        }
        if (currentPathRef.current) {
            drawSmoothPath(ctx, currentPathRef.current);
        }
    };

    // rAF throttle
    const needsFrame = useRef(false);
    const requestRedraw = () => {
        if (needsFrame.current) return;
        needsFrame.current = true;
        requestAnimationFrame(() => {
            redraw();
            needsFrame.current = false;
            if (onSignatureChange) onSignatureChange(getSignatureDataUrl());
        });
    };

    useEffect(() => {
        setCanvasSize();

        const ro = new ResizeObserver(() => setCanvasSize());
        if (canvasRef.current) ro.observe(canvasRef.current);

        const handleResize = () => setCanvasSize();
        window.addEventListener("resize", handleResize);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onPointerDown = (e) => {
        if (disabled) return;
        e.target.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        const pos = getEventPos(e.nativeEvent);
        currentPathRef.current = [pos];
        setHasSignature(true);
        requestRedraw();
    };

    const onPointerMove = (e) => {
        if (!isDrawing || disabled) return;
        const pos = getEventPos(e.nativeEvent);
        currentPathRef.current.push(pos);
        requestRedraw();
    };

    const onPointerUp = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        e.target.releasePointerCapture(e.pointerId);
        if (currentPathRef.current && currentPathRef.current.length) {
            strokesRef.current.push(currentPathRef.current);
        }
        currentPathRef.current = null;
        requestRedraw();
    };

    const clearSignature = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        strokesRef.current = [];
        currentPathRef.current = null;

        // full reset + repaint
        setHasSignature(false);
        setCanvasSize();
        onSignatureChange && onSignatureChange(null);
    };

    const getSignatureDataUrl = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL("image/png");
    };

    const downloadSignature = () => {
        if (!hasSignature) return;

        const { w, h } = cssSizeRef.current;
        const dpr = getDPR();
        const scale = Math.max(1, exportScale) * dpr;

        const off = document.createElement("canvas");
        off.width = Math.floor(w * scale);
        off.height = Math.floor(h * scale);

        const octx = off.getContext("2d");
        octx.scale(scale, scale);

        octx.fillStyle = "white";
        octx.fillRect(0, 0, w, h);

        octx.lineCap = "round";
        octx.lineJoin = "round";
        octx.strokeStyle = strokeColor;
        octx.lineWidth = strokeWidth;

        for (const path of strokesRef.current) drawSmoothPath(octx, path);

        const url = off.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "signature.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
                Signature
            </h3>

            <div className={`border rounded bg-gray-50 overflow-hidden ${disabled ? "opacity-50" : ""}`}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-80 block"
                    style={{ touchAction: "none", cursor: disabled ? "not-allowed" : "crosshair" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                />
            </div>

            <div className="mt-3 flex justify-end items-center gap-3 flex-wrap">
                <button
                    type="button"
                    onClick={clearSignature}
                    disabled={!hasSignature || disabled}
                    className="cursor-pointer px-10 py-4 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear
                </button>

                <button
                    type="button"
                    onClick={downloadSignature}
                    disabled={!hasSignature || disabled}
                    className="cursor-pointer px-10 py-4 rounded-md text-sm text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Download
                </button>
            </div>


            {!hasSignature && (
                <p className="text-xs text-gray-500 mt-2">Draw your signature in the box above</p>
            )}
        </div>
    );
}
