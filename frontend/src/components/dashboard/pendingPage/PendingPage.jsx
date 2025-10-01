// PendingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Download, Eye, FileText, ArrowLeft, Package, User, Calendar, DollarSign } from "lucide-react";

/**
 * PendingPage.jsx
 * - Fetches orders list
 * - On click: fetches order details (GET /api/orders/:id)
 * - Additionally always fetches attachments list (GET /api/attachments/order/:orderId)
 *   and signature object (GET /api/signatures/order/:orderId) to ensure we show them.
 * - Signature is drawn into a <canvas> for display. If draw fails, we show a fallback image / download link.
 *
 * NOTE: Adjust BASE_API if your server base differs.
 */
const BASE_API = "http://localhost:5001/api";

function OrderCard({ order, onClick }) {
    const formatDate = (iso) => {
        if (!iso) return "N/A";
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const meta = order.meta || {};

    return (
        <button
            onClick={() => onClick(order)}
            className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">Order #{order.order_number}</h3>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {order.status}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{meta.clientName || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 capitalize">{meta.serviceType || "N/A"}</span>
                </div>
                {order.total_amount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 font-medium">${Number(order.total_amount).toFixed(2)}</span>
                    </div>
                )}
            </div>
        </button>
    );
}

export default function PendingOrdersPage({ onBack }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [previewModal, setPreviewModal] = useState(null);

    // attachments + signature state (always fetched separately to guarantee display)
    const [attachments, setAttachments] = useState([]);
    const [signatureObj, setSignatureObj] = useState(null); // signature DB row
    const [signatureUrl, setSignatureUrl] = useState(null); // URL to download/inline
    const signatureCanvasRef = useRef(null);

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_API}/orders?status=Pending`, { credentials: "include" });
            if (!response.ok) throw new Error("Failed to fetch orders");
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error("Failed to fetch pending orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId) => {
        setLoadingDetails(true);
        setOrderDetails(null);
        setAttachments([]);
        setSignatureObj(null);
        setSignatureUrl(null);

        try {
            // 1) main order (may already include attachments/signatures)
            const resp = await fetch(`${BASE_API}/orders/${orderId}`, { credentials: "include" });
            if (!resp.ok) throw new Error("Failed to fetch order details");
            const order = await resp.json();
            setOrderDetails(order);

            // 2) attachments list (call dedicated endpoint to guarantee items)
            try {
                const aResp = await fetch(`${BASE_API}/attachments/order/${orderId}`, { credentials: "include" });
                if (aResp.ok) {
                    const aData = await aResp.json();
                    setAttachments(aData || []);
                } else {
                    console.warn("Attachments list returned", aResp.status);
                    // fallback to included attachments if present
                    if (order.Attachments && order.Attachments.length > 0) setAttachments(order.Attachments);
                }
            } catch (e) {
                console.warn("Failed to fetch attachments list:", e);
                if (order.Attachments && order.Attachments.length > 0) setAttachments(order.Attachments);
            }

            // 3) signature object - dedicated endpoint ensures we get it if exists
            try {
                const sResp = await fetch(`${BASE_API}/signatures/order/${orderId}`, { credentials: "include" });
                if (sResp.ok) {
                    const sData = await sResp.json();
                    setSignatureObj(sData);
                    // build download/inline url for canvas
                    setSignatureUrl(`${BASE_API}/signatures/${sData.id}/download?inline=1`);
                } else {
                    // fallback to included signature in orderDetails
                    if (order.Signatures && order.Signatures.length > 0) {
                        const s = order.Signatures[0];
                        setSignatureObj(s);
                        setSignatureUrl(`${BASE_API}/signatures/${s.id}/download?inline=1`);
                    } else {
                        setSignatureObj(null);
                        setSignatureUrl(null);
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch signature:", e);
                if (order.Signatures && order.Signatures.length > 0) {
                    const s = order.Signatures[0];
                    setSignatureObj(s);
                    setSignatureUrl(`${BASE_API}/signatures/${s.id}/download?inline=1`);
                } else {
                    setSignatureObj(null);
                    setSignatureUrl(null);
                }
            }
        } catch (err) {
            console.error("Failed to fetch order details:", err);
            setOrderDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    // draw signature into canvas whenever signatureUrl changes
    useEffect(() => {
        if (!signatureUrl || !signatureCanvasRef.current) return;
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.crossOrigin = "anonymous"; // try to avoid tainting
        img.onload = () => {
            // clear and fit image while preserving aspect
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
            console.warn("Signature image load failed:", e);
            // leave canvas empty; UI will show fallback
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        img.src = signatureUrl;
    }, [signatureUrl]);

    const handleOrderClick = (order) => {
        setSelectedOrder(order);
        fetchOrderDetails(order.id);
    };

    const handleBackToList = () => {
        setSelectedOrder(null);
        setOrderDetails(null);
        setAttachments([]);
        setSignatureObj(null);
        setSignatureUrl(null);
    };

    const formatDate = (iso) => {
        if (!iso) return "N/A";
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount || 0);
    };

    const openPreview = (attachment) => {
        // prefer API download path (inline)
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

    // List view
    if (!selectedOrder) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Pending Orders</h1>
                        <p className="text-gray-600 mt-2">View all orders with pending status</p>
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
                            {orders.map((order) => (
                                <OrderCard key={order.id} order={order} onClick={handleOrderClick} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Detail loading
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
    const pricing = meta.pricing || {};
    const items = meta.items || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto p-8">
                {/* Back Button & Header */}
                <div className="mb-6">
                    <button onClick={handleBackToList} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Pending Orders
                    </button>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Order #{orderDetails.order_number}</h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                        {orderDetails.status}
                                    </span>
                                    <span className="text-sm text-gray-500">Created: {formatDate(orderDetails.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Client Information */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Client Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Client Name</label>
                                    <p className="text-base text-gray-900 mt-1">{meta.clientName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Contact</label>
                                    <p className="text-base text-gray-900 mt-1">{meta.contact || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Service Details */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Service Details
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Service Type</label>
                                        <p className="text-base text-gray-900 mt-1 capitalize">{meta.serviceType || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Estimated Delivery</label>
                                        <p className="text-base text-gray-900 mt-1">{formatDate(orderDetails.estimated_delivery_at)}</p>
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

                        {/* Pricing Items */}
                        {items.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Items</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Description</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Qty</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Unit Price</th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-3 px-2 text-sm text-gray-900 capitalize">{(item.description || "").replace(/-/g, " ")}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">{formatCurrency(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Attachments */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Attachments ({attachments.length})
                            </h2>

                            {attachments && attachments.length > 0 ? (
                                <div className="space-y-3">
                                    {attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.original_name}</p>
                                                    <p className="text-xs text-gray-500">{Math.round((attachment.size_bytes || 0) / 1024)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {(attachment.mime_type?.startsWith("image/") || attachment.mime_type === "application/pdf") && (
                                                    <button
                                                        onClick={() => openPreview(attachment)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Preview"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => downloadFile(`${BASE_API}/attachments/${attachment.id}/download?inline=0`, attachment.original_name)}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Download"
                                                >
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

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Pricing Summary */}
                        {pricing.total > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Summary</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium">{formatCurrency(pricing.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">IVA (16%)</span>
                                        <span className="font-medium">{formatCurrency(pricing.iva)}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3 flex justify-between">
                                        <span className="text-base font-semibold">Total</span>
                                        <span className="text-base font-bold">{formatCurrency(pricing.total)}</span>
                                    </div>
                                    {pricing.deposit > 0 && (
                                        <>
                                            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                                                <span className="text-gray-600">Deposit</span>
                                                <span className="font-medium">{formatCurrency(pricing.deposit)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-base font-semibold">Remaining</span>
                                                <span className="text-base font-bold text-green-600">{formatCurrency(pricing.total - pricing.deposit)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Signature */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Signature</h2>

                            {signatureUrl ? (
                                <div className="space-y-4">
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                                        {/* Canvas where we draw the signature */}
                                        <canvas ref={signatureCanvasRef} style={{ maxWidth: "100%", height: "auto" }} />
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        {signatureObj?.signed_at && <p>Signed: {formatDate(signatureObj.signed_at)}</p>}
                                        {signatureObj?.signed_by_name && <p>By: {signatureObj.signed_by_name}</p>}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => downloadFile(signatureUrl.replace("inline=1", "inline=0"), "signature.png")}
                                            className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Signature
                                        </button>

                                        <a
                                            href={signatureUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Open Raw
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-500">No signature available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="relative w-[90vw] h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden">
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
