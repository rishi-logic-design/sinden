import React, { useState, useEffect } from "react";
import { X, Download, Eye, FileText, Calendar, User, Phone, Mail, Package, ChevronLeft } from "lucide-react";

export default function PendingOrderViewer({ orderId, onClose }) {
    const [order, setOrder] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previewModal, setPreviewModal] = useState(null);

    useEffect(() => {
        if (!orderId) return;
        fetchOrderDetails();
    }, [orderId]);

    // Replace your fetchAttachments/signature logic with this function in PendingPage.jsx
    const safeParseJson = async (res) => {
        try {
            return await res.json();
        } catch (e) {
            console.error('Failed to parse JSON', e);
            return null;
        }
    };

    const toArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'object') {
            // try common wrapper shapes
            if (Array.isArray(value.data)) return value.data;
            if (Array.isArray(value.items)) return value.items;
            // single object -> array
            return [value];
        }
        return [];
    };

    const isFileKind = (att) => {
        const k = (att.kind || att.type || '').toString().toLowerCase();
        return k === 'file' || k === 'attachment' || k === 'image' || k === 'document';
    };

    const buildFileUrl = (storageKey) => {
        if (!storageKey) return null;
        // if already a full url
        if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) return storageKey;
        // If backend returned a path like "/uploads/xxxx" or "uploads/xxxx", normalize
        const maybe = storageKey.replace(/^\/+/, '');
        // If storageKey already contains uploads/ keep it; else try last segment
        if (maybe.includes('uploads')) {
            return `http://localhost:5001/${maybe}`;
        }
        const filename = maybe.split('/').pop();
        return `http://localhost:5001/uploads/${filename}`;
    };

    const fetchOrderDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            const orderResponse = await fetch(`http://localhost:5001/api/orders/${orderId}`, {
                credentials: "include",
            });

            if (!orderResponse.ok) {
                const text = await orderResponse.text();
                throw new Error(`Failed to fetch order details (status ${orderResponse.status}): ${text}`);
            }

            const orderData = await safeParseJson(orderResponse);
            console.log('Order data', orderData);
            setOrder(orderData);

            // Attachments
            try {
                const attachmentsResponse = await fetch(
                    `http://localhost:5001/api/attachments/order/${orderId}`,
                    { credentials: "include" }
                );

                if (!attachmentsResponse.ok) {
                    const t = await attachmentsResponse.text();
                    console.warn('Attachments endpoint returned non-ok', attachmentsResponse.status, t);
                    setAttachments([]); // explicitly set empty
                } else {
                    const rawAttachments = await safeParseJson(attachmentsResponse);
                    console.log('Raw attachments response', rawAttachments);
                    const arr = toArray(rawAttachments);
                    const fileAttachments = arr.filter(isFileKind).map(att => ({
                        ...att,
                        // normalize fields
                        mime_type: att.mime_type || att.mimeType || att.type || '',
                        original_name: att.original_name || att.filename || att.name || 'file',
                        storage_key: att.storage_key || att.path || att.url || '',
                        size_bytes: att.size_bytes || att.size || 0,
                        id: att.id || att._id || `${att.original_name}-${Math.random().toString(36).slice(2, 9)}`,
                    })).map(att => ({
                        ...att,
                        url: buildFileUrl(att.storage_key),
                    }));
                    setAttachments(fileAttachments);
                }
            } catch (err) {
                console.error("Failed to fetch attachments:", err);
                setAttachments([]);
            }

            // Signature
            try {
                const signatureResponse = await fetch(
                    `http://localhost:5001/api/signatures/order/${orderId}`,
                    { credentials: "include" }
                );

                if (!signatureResponse.ok) {
                    const t = await signatureResponse.text();
                    console.warn('Signature endpoint returned non-ok', signatureResponse.status, t);
                    setSignature(null);
                } else {
                    const rawSig = await safeParseJson(signatureResponse);
                    console.log('Raw signature response', rawSig);
                    const sigArr = toArray(rawSig);
                    const sig = sigArr.length > 0 ? sigArr[0] : (rawSig && rawSig.signature ? rawSig.signature : null);

                    if (sig) {
                        const normalized = {
                            ...sig,
                            storage_key: sig.storage_key || sig.path || sig.url || '',
                            mime_type: sig.mime_type || sig.mimeType || 'image/png',
                            signed_at: sig.signed_at || sig.createdAt || sig.signedAt || null,
                            signed_by_name: sig.signed_by_name || sig.signedBy || sig.by || null,
                            url: buildFileUrl(sig.storage_key),
                        };
                        setSignature(normalized);
                    } else {
                        setSignature(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch signature:", err);
                setSignature(null);
            }

        } catch (err) {
            console.error("Failed to fetch order:", err);
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
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

    const getFileUrl = (storageKey) => {
        // Extract filename from storage_key path
        const filename = storageKey.split('/').pop();
        return `http://localhost:5001/uploads/${filename}`;
    };

    const openPreview = (attachment) => {
        setPreviewModal({
            url: getFileUrl(attachment.storage_key),
            name: attachment.original_name,
            type: attachment.mime_type,
        });
    };

    const downloadFile = (attachment) => {
        const url = getFileUrl(attachment.storage_key);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
                    <div className="text-red-600 text-center mb-4">
                        <p className="font-semibold">Error loading order</p>
                        <p className="text-sm mt-2">{error}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-600">Order not found</div>
            </div>
        );
    }

    const meta = order.meta || {};
    const pricing = meta.pricing || {};
    const items = meta.items || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto p-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Back to orders"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Order #{order.order_number}
                                </h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${order.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                        order.status === "InProgress" ? "bg-blue-100 text-blue-800" :
                                            order.status === "Completed" ? "bg-green-100 text-green-800" :
                                                order.status === "Cancelled" ? "bg-red-100 text-red-800" :
                                                    "bg-gray-100 text-gray-800"
                                        }`}>
                                        {order.status}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Created: {formatDate(order.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Client & Service Info */}
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
                                        <p className="text-base text-gray-900 mt-1 capitalize">
                                            {meta.serviceType || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Estimated Delivery</label>
                                        <p className="text-base text-gray-900 mt-1">
                                            {formatDate(order.estimated_delivery_at)}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Service Detail</label>
                                    <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">
                                        {meta.serviceDetail || "No details provided"}
                                    </p>
                                </div>

                                {meta.observations && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Observations</label>
                                        <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">
                                            {meta.observations}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Items */}
                        {items.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Service Items
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                                                    Description
                                                </th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">
                                                    Quantity
                                                </th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">
                                                    Unit Price
                                                </th>
                                                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-3 px-2 text-sm text-gray-900 capitalize">
                                                        {item.description.replace(/-/g, " ")}
                                                    </td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">
                                                        {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className="py-3 px-2 text-sm text-gray-900 text-right">
                                                        {formatCurrency(item.total)}
                                                    </td>
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
                            {attachments.length > 0 ? (
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
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {attachment.original_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {Math.round(attachment.size_bytes / 1024)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {(attachment.mime_type?.startsWith("image/") ||
                                                    attachment.mime_type === "application/pdf") && (
                                                        <button
                                                            onClick={() => openPreview(attachment)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Preview"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                <button
                                                    onClick={() => downloadFile(attachment)}
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

                    {/* Right Column - Pricing & Signature */}
                    <div className="space-y-6">
                        {/* Pricing Summary */}
                        {pricing.total > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Pricing Summary
                                </h2>
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
                                        <span className="text-base font-semibold text-gray-900">Total</span>
                                        <span className="text-base font-bold text-gray-900">
                                            {formatCurrency(pricing.total)}
                                        </span>
                                    </div>
                                    {pricing.deposit > 0 && (
                                        <>
                                            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                                                <span className="text-gray-600">Deposit (Abono)</span>
                                                <span className="font-medium">{formatCurrency(pricing.deposit)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-base font-semibold text-gray-900">Remaining</span>
                                                <span className="text-base font-bold text-green-600">
                                                    {formatCurrency(pricing.total - pricing.deposit)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Signature */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Client Signature
                            </h2>
                            {signature ? (
                                <div className="space-y-4">
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <img
                                            src={signature?.url || getFileUrl(signature?.storage_key || '')}
                                            alt="Client Signature"
                                            className="w-full h-auto"
                                            style={{ maxHeight: "200px", objectFit: "contain" }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        <p>Signed: {formatDate(signature.signed_at)}</p>
                                        {signature.signed_by_name && (
                                            <p>By: {signature.signed_by_name}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const url = getFileUrl(signature.storage_key);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = "signature.png";
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Signature
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No signature available</p>
                            )}
                        </div>

                        {/* Payment Status */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Payment Status
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Status</span>
                                    <span className="font-medium capitalize">{order.payment_status}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Amount</span>
                                    <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="relative w-[90vw] h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <h3 className="font-semibold text-gray-900 truncate flex-1 mr-4">
                                {previewModal.name}
                            </h3>
                            <button
                                onClick={() => setPreviewModal(null)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 h-full overflow-auto bg-gray-100">
                            {previewModal.type === "application/pdf" ? (
                                <iframe
                                    src={previewModal.url}
                                    className="w-full h-full"
                                    title={previewModal.name}
                                />
                            ) : previewModal.type?.startsWith("image/") ? (
                                <div className="flex items-center justify-center h-full p-4">
                                    <img
                                        src={previewModal.url}
                                        alt={previewModal.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
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