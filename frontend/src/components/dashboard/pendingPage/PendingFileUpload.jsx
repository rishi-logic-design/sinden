// PendingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Eye, Download, ArrowLeft, Package, User, FileText } from "lucide-react";

// NOTE: change this if your API base is different
const BASE_API = "http://localhost:5000/api";

function OrderCard({ order, onClick }) {
    const meta = order.meta || {};
    const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString() : "N/A");
    return (
        <button onClick={() => onClick(order)} className="w-full text-left bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">Order #{order.order_number}</h3>
                    <p className="text-sm text-gray-500 mt-1">{fmt(order.createdAt)}</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {order.status}
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{meta.clientName || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 capitalize">{meta.serviceType || "N/A"}</span>
                </div>
            </div>
        </button>
    );
}

export default function PendingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [orderDetails, setOrderDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // attachments and signature
    const [attachments, setAttachments] = useState([]);
    const [signatureObj, setSignatureObj] = useState(null);
    const signatureCanvasRef = useRef(null);
    const signatureBlobUrlRef = useRef(null); // to revoke when not needed

    // preview modal for attachments (kept for attachments)
    const [previewModal, setPreviewModal] = useState(null);

    useEffect(() => {
        fetchPendingOrders();
        return () => {
            // cleanup any blob URL
            if (signatureBlobUrlRef.current) {
                URL.revokeObjectURL(signatureBlobUrlRef.current);
                signatureBlobUrlRef.current = null;
            }
        };
    }, []);

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_API}/orders?status=Pending`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch orders");
            const data = await res.json();
            setOrders(data || []);
        } catch (err) {
            console.error("fetchPendingOrders:", err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        setLoadingDetails(true);
        setOrderDetails(null);
        setAttachments([]);
        setSignatureObj(null);

        // clear previous canvas
        const canvas = signatureCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (signatureBlobUrlRef.current) {
            URL.revokeObjectURL(signatureBlobUrlRef.current);
            signatureBlobUrlRef.current = null;
        }

        try {
            // 1. main order
            const oResp = await fetch(`${BASE_API}/orders/${orderId}`, { credentials: "include" });
            if (!oResp.ok) throw new Error("Failed to fetch order");
            const order = await oResp.json();
            setOrderDetails(order);

            // 2. signature object (dedicated endpoint)
            try {
                const sResp = await fetch(`${BASE_API}/signatures/order/${orderId}`, { credentials: "include" });
                if (sResp.ok) {
                    const sig = await sResp.json();
                    setSignatureObj(sig || null);
                    // now fetch the binary (png) and draw to canvas — we will not expose download link
                    if (sig && sig.id) await fetchAndDrawSignature(sig.id);
                } else {
                    // fallback to order.Signatures array if present
                    if (order.Signatures && order.Signatures.length) {
                        const sig = order.Signatures[0];
                        setSignatureObj(sig);
                        if (sig && sig.id) await fetchAndDrawSignature(sig.id);
                    } else {
                        setSignatureObj(null);
                    }
                }
            } catch (esig) {
                console.warn("signature fetch error", esig);
                if (order.Signatures && order.Signatures.length) {
                    const sig = order.Signatures[0];
                    setSignatureObj(sig);
                    if (sig && sig.id) await fetchAndDrawSignature(sig.id);
                } else {
                    setSignatureObj(null);
                }
            }

            // 3. attachments (dedicated endpoint) — these will be shown in the right column
            try {
                const aResp = await fetch(`${BASE_API}/attachments/order/${orderId}`, { credentials: "include" });
                if (aResp.ok) {
                    const atts = await aResp.json();
                    setAttachments(atts || []);
                } else {
                    // fallback to included Attachments if any
                    if (order.Attachments && order.Attachments.length) setAttachments(order.Attachments);
                    else setAttachments([]);
                }
            } catch (eatt) {
                console.warn("attachments fetch failed", eatt);
                if (order.Attachments && order.Attachments.length) setAttachments(order.Attachments);
                else setAttachments([]);
            }
        } catch (err) {
            console.error("fetchOrderDetails error:", err);
            setOrderDetails(null);
            setAttachments([]);
            setSignatureObj(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Fetch binary signature and draw on canvas (no download links)
    const fetchAndDrawSignature = async (signatureId) => {
        try {
            const dlUrl = `${BASE_API}/signatures/${signatureId}/download?inline=1`;
            // fetch as blob to avoid tainting and to control drawing
            const resp = await fetch(dlUrl, { credentials: "include" });
            if (!resp.ok) {
                console.warn("signature binary fetch failed", resp.status);
                return;
            }
            const blob = await resp.blob();
            // ensure it's an image type (PNG expected)
            if (!blob.type.startsWith("image/")) {
                console.warn("signature blob is not an image:", blob.type);
                return;
            }
            // create object URL for image
            const blobUrl = URL.createObjectURL(blob);
            signatureBlobUrlRef.current = blobUrl;

            // draw into canvas
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = signatureCanvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                // fit image inside canvas with max width and height while keeping aspect
                const maxW = 560;
                const maxH = 200;
                let w = img.width;
                let h = img.height;
                const ratio = Math.min(maxW / w, maxH / h, 1);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
                canvas.width = w;
                canvas.height = h;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, w, h);
            };
            img.onerror = (e) => {
                console.warn("signature image load error", e);
            };
            img.src = blobUrl;
        } catch (err) {
            console.error("fetchAndDrawSignature error:", err);
        }
    };

    const handleOrderClick = (order) => {
        setSelectedOrder(order);
        fetchOrderDetails(order.id);
    };

    const goBack = () => {
        setSelectedOrder(null);
        setOrderDetails(null);
        setAttachments([]);
        setSignatureObj(null);
        // cleanup blob
        if (signatureBlobUrlRef.current) {
            URL.revokeObjectURL(signatureBlobUrlRef.current);
            signatureBlobUrlRef.current = null;
        }
        // clear canvas
        const canvas = signatureCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const openAttachmentPreview = (att) => {
        setPreviewModal({
            url: `${BASE_API}/attachments/${att.id}/download?inline=1`,
            name: att.original_name || att.name || "file",
            type: att.mime_type,
        });
    };

    const downloadAttachment = (att) => {
        // keep download for attachments (if you want). If you prefer no download for attachments either, remove this.
        const url = `${BASE_API}/attachments/${att.id}/download?inline=0`;
        const a = document.createElement("a");
        a.href = url;
        a.download = att.original_name || "attachment";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // UI Render
    if (!selectedOrder) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Pending Orders</h1>
                        <p className="text-gray-600 mt-2">Click an order to view details</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading pending orders...</p>
                            </div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Orders</h3>
                            <p className="text-gray-600">All orders have been processed</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {orders.map((o) => (
                                <OrderCard key={o.id} order={o} onClick={handleOrderClick} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (loadingDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (!orderDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-600">Order details not available</div>
            </div>
        );
    }

    const meta = orderDetails.meta || {};
    const items = meta.items || [];
    const pricing = meta.pricing || {};

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto p-8">
                <div className="mb-6">
                    <button onClick={goBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Pending Orders
                    </button>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Order #{orderDetails.order_number}</h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">{orderDetails.status}</span>
                                    <span className="text-sm text-gray-500">Created: {new Date(orderDetails.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid: LEFT = signature (from DB, canvas only), RIGHT = attachments */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Signature (DB) — read-only
                            </h2>

                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[120px]">
                                {signatureObj ? (
                                    <canvas ref={signatureCanvasRef} style={{ maxWidth: "100%", height: "auto" }} />
                                ) : (
                                    <p className="text-sm text-gray-500">No signature available</p>
                                )}
                            </div>

                            {signatureObj && (
                                <div className="mt-3 text-xs text-gray-500">
                                    {signatureObj.signed_at && <p>Signed: {new Date(signatureObj.signed_at).toLocaleString()}</p>}
                                    {signatureObj.signed_by_name && <p>By: {signatureObj.signed_by_name}</p>}
                                </div>
                            )}
                        </div>

                        {/* Service details, pricing items, etc. */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Service Type</label>
                                        <p className="text-base text-gray-900 mt-1 capitalize">{meta.serviceType || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Estimated Delivery</label>
                                        <p className="text-base text-gray-900 mt-1">{new Date(orderDetails.estimated_delivery_at || Date.now()).toLocaleString()}</p>
                                    </div>
                                </div>

                                {meta.serviceDetail && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Service Detail</label>
                                        <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">{meta.serviceDetail}</p>
                                    </div>
                                )}

                                {meta.observations && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Observations</label>
                                        <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">{meta.observations}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: attachments (swapped) */}
                    <div className="space-y-6">
                        {items.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Items</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Description</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Qty</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Unit</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it, i) => (
                                                <tr key={i} className="border-b border-gray-100">
                                                    <td className="py-3 px-2 text-sm text-gray-900">{it.description}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{it.quantity}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(it.unitPrice || 0)}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(it.total || 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>

                            {attachments && attachments.length > 0 ? (
                                <div className="space-y-3">
                                    {attachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{att.original_name}</p>
                                                    <p className="text-xs text-gray-500">{Math.round((att.size_bytes || 0) / 1024)} KB</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {(att.mime_type?.startsWith("image/") || att.mime_type === "application/pdf") && (
                                                    <button onClick={() => openAttachmentPreview(att)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Preview">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => downloadAttachment(att)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No attachments</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview modal for attachments */}
            {previewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="relative w-[90vw] h-[85vh] bg-white rounded-lg overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <h3 className="font-semibold text-gray-900 truncate flex-1 mr-4">{previewModal.name}</h3>
                            <button onClick={() => setPreviewModal(null)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-[calc(100%-64px)] overflow-auto bg-gray-100">
                            {previewModal.type === "application/pdf" ? (
                                <iframe src={previewModal.url} className="w-full h-full" title={previewModal.name} />
                            ) : previewModal.type?.startsWith("image/") ? (
                                <div className="flex items-center justify-center h-full p-4">
                                    <img src={previewModal.url} alt={previewModal.name} className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-600">Preview not available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
