import React, { useMemo, useState, useEffect } from "react";
import ApiService from "../../services/ApiService";

function parseDeliveryDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function formatCOP(n) {
  if (!n) return "0.00";
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function getStatusConfig(status) {
  const configs = {
    Completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Finalized: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Pending: { bg: "bg-amber-100", text: "text-amber-700" },
    "In Progress": { bg: "bg-blue-100", text: "text-blue-700" },
    Cancelled: { bg: "bg-red-100", text: "text-red-700" },
    Draft: { bg: "bg-gray-100", text: "text-gray-700" },
  };
  return configs[status] || { bg: "bg-gray-100", text: "text-gray-700" };
}

function exportToExcel(data, totalAmount) {
  const now = new Date().toLocaleString("es-CO");
  // Build an HTML table — Excel opens .xls with this perfectly
  const rows = data
    .map(
      (r) => `
    <tr>
      <td>${r.order_number || ""}</td>
      <td>${formatDate(r.estimated_delivery_at) || ""}</td>
      <td>${(r.clientName || "").toString().replace(/"/g, '""')}</td>
      <td style="mso-number-format:'\\#\\,\\#\\#0.00'; text-align:right;">${Number(
        r.total_amount || 0
      ).toFixed(2)}</td>
      <td>${r.status || ""}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml>
        <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
          <x:Name>Credit Report</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
      </xml><![endif]-->
      <meta charset="UTF-8" />
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
        th { background:#f1f5f9; text-align:left; }
        tfoot td { font-weight:700; }
      </style>
      <title>Credit Report</title>
    </head>
    <body>
      <h3>Finalized Reports with Credit</h3>
      <div>Generated: ${now} | Total Records: ${data.length}</div>
      <table>
        <thead>
          <tr>
            <th>ORDER NO</th>
            <th>DELIVERY DATE</th>
            <th>CLIENT</th>
            <th>AMOUNT (COP)</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">TOTAL</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0.00'; text-align:right;">${Number(
              totalAmount
            ).toFixed(2)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `credit_report_${Date.now()}.xls`; // opens directly in Excel
  link.click();
}

function exportToPDF(data, totalAmount) {
  const now = new Date().toLocaleString("es-CO");
  const bodyRows = data
    .map(
      (r) => `
    <tr>
      <td><strong>${r.order_number || ""}</strong></td>
      <td>${formatDate(r.estimated_delivery_at) || ""}</td>
      <td>${r.clientName || ""}</td>
      <td style="text-align:right;">$${formatCOP(
        Number(r.total_amount || 0)
      )}</td>
      <td>${r.status || ""}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Credit Report</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { font-family: Arial, sans-serif; }
          h1 { font-size: 20px; margin: 0 0 8px; color:#0f172a; }
          .meta { color:#64748b; font-size:12px; margin-bottom:14px; }
          table { width:100%; border-collapse:collapse; }
          th, td { border:1px solid #e2e8f0; padding:8px; font-size:12px; }
          th { background:#f1f5f9; color:#475569; }
          tfoot td { font-weight:700; }
          .total { margin-top:14px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; }
          .tamount { font-size:22px; font-weight:800; }
          @media print { .noprint { display:none } }
        </style>
      </head>
      <body>
        <div class="noprint" style="text-align:right; margin-bottom:8px;">
          <button onclick="window.print()">Print / Save as PDF</button>
        </div>
        <h1>Finalized Reports with Credit</h1>
        <div class="meta">Generated: ${now} — Total Records: ${
    data.length
  }</div>
        <table>
          <thead>
            <tr>
              <th>ORDER NO</th>
              <th>DELIVERY DATE</th>
              <th>CLIENT</th>
              <th style="text-align:right;">AMOUNT (COP)</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTAL</td>
              <td style="text-align:right;">$${formatCOP(
                Number(totalAmount || 0)
              )}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div class="total">
          <div>Total accumulated pending COP:</div>
          <div class="tamount">$${formatCOP(Number(totalAmount || 0))}</div>
        </div>
        <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
      </body>
    </html>
  `;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function ReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [tmpStart, setTmpStart] = useState("");
  const [tmpEnd, setTmpEnd] = useState("");
  const [tmpClient, setTmpClient] = useState("");
  const [tmpStatus, setTmpStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedClient, setAppliedClient] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getOrders();
      const ordersData = Array.isArray(response)
        ? response
        : response.orders || [];

      // Process orders to extract client name from meta
      const processedOrders = ordersData.map((order) => ({
        ...order,
        clientName: order.meta?.clientName || order.customer_name || "",
      }));

      setOrders(processedOrders);
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return orders.filter((r) => {
      // Exclude cancelled orders (RF-006 requirement)
      if (r.status === "Cancelled") return false;

      // Search filter
      if (q && !`${r.order_number} ${r.clientName}`.toLowerCase().includes(q))
        return false;

      // Client filter
      if (
        appliedClient &&
        !r.clientName.toLowerCase().includes(appliedClient.toLowerCase())
      )
        return false;

      // Status filter (default to Completed)
      if (appliedStatus && r.status !== appliedStatus) return false;

      // Date range filter
      if (start || end) {
        const rDate = parseDeliveryDate(r.estimated_delivery_at);
        if (!rDate) return false;
        const rTime = new Date(
          rDate.getFullYear(),
          rDate.getMonth(),
          rDate.getDate()
        ).getTime();
        if (start) {
          const sTime = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
          ).getTime();
          if (rTime < sTime) return false;
        }
        if (end) {
          const eTime = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
          ).getTime();
          if (rTime > eTime) return false;
        }
      }
      return true;
    });
  }, [query, appliedClient, appliedStatus, startDate, endDate, orders]);

  const totalItems = filtered.length;
  const totalAmount = filtered.reduce(
    (s, r) => s + Number(r.total_amount || 0),
    0
  );
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  if (page > totalPages && totalPages > 0) setPage(totalPages);

  const activeFilterPills = [];
  if (appliedClient)
    activeFilterPills.push({ id: "client", label: `Client: ${appliedClient}` });
  if (appliedStatus)
    activeFilterPills.push({ id: "status", label: `Status: ${appliedStatus}` });
  if (startDate || endDate) {
    const label = `${startDate || "—"} → ${endDate || "—"}`;
    activeFilterPills.push({ id: "dates", label: `Delivery: ${label}` });
  }

  const openFilters = () => {
    setTmpStart(startDate);
    setTmpEnd(endDate);
    setTmpClient(appliedClient);
    setTmpStatus(appliedStatus);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setStartDate(tmpStart);
    setEndDate(tmpEnd);
    setAppliedClient(tmpClient.trim());
    setAppliedStatus(tmpStatus);
    setShowFilters(false);
    setPage(1);
  };

  const clearAllFilters = () => {
    setTmpStart("");
    setTmpEnd("");
    setTmpClient("");
    setTmpStatus("");
    setStartDate("");
    setEndDate("");
    setAppliedClient("");
    setAppliedStatus("");
    setQuery("");
    setShowFilters(false);
    setPage(1);
  };

  const removePill = (id) => {
    if (id === "client") setAppliedClient("");
    if (id === "status") setAppliedStatus("");
    if (id === "dates") {
      setStartDate("");
      setEndDate("");
    }
    setPage(1);
  };

  const handleGenerateReport = async () => {
    await fetchOrders();
  };

  const handleExportExcel = () => {
    exportToExcel(filtered, totalAmount);
  };

  const handleExportPDF = () => {
    exportToPDF(filtered, totalAmount);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-[1500px] mx-auto py-8 pb-24">
        <div className="flex items-start gap-6 mt-4 mb-10">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">
              Finalized Reports with Credit
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-3 border rounded-lg bg-white text-sm font-semibold shadow-sm hover:translate-y-[-2px] transition disabled:opacity-50"
            >
              <svg
                className="w-4 h-4 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate Report
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="px-4 py-3 border rounded-lg bg-white text-sm font-semibold shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
            >
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              className="px-4 py-3 rounded-lg bg-slate-900 text-white text-sm font-semibold shadow hover:opacity-95 transition disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 bg-gray-50 px-8">
          <div className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2 shadow-sm min-w-[260px]">
            <svg
              className="w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="11"
                cy="11"
                r="6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              className="outline-none text-sm text-slate-700 flex-1"
              placeholder="Search order no or client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() =>
                showFilters ? setShowFilters(false) : openFilters()
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition"
            >
              Filters
              <svg
                className={`w-3 h-3 transform ${
                  showFilters ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              className={`absolute left-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 transform transition-all duration-150 ${
                showFilters
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Filters
                </h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-teal-600 hover:underline"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3 max-h-60 pr-1">
                <div>
                  <label className="text-xs text-slate-500">
                    Delivery date
                  </label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="date"
                      className="w-1/2 px-3 py-2 bg-slate-50 border rounded-md text-sm"
                      value={tmpStart}
                      onChange={(e) => setTmpStart(e.target.value)}
                    />
                    <input
                      type="date"
                      className="w-1/2 px-3 py-2 bg-slate-50 border rounded-md text-sm"
                      value={tmpEnd}
                      onChange={(e) => setTmpEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Client with credit
                  </label>
                  <div className="mt-2 flex items-center gap-2 bg-white border rounded-md px-3 py-2">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M21 21l-4.35-4.35"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="11"
                        cy="11"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      className="w-full text-sm outline-none"
                      placeholder="Search"
                      value={tmpClient}
                      onChange={(e) => setTmpClient(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={applyFilters}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white font-semibold hover:opacity-95"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3 flex-wrap">
            {activeFilterPills.map((p) => (
              <div
                key={p.id}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-full text-sm shadow-sm"
              >
                <span className="text-slate-700">{p.label}</span>
                <button
                  onClick={() => removePill(p.id)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            ))}
            {activeFilterPills.length === 0 && (
              <div className="text-sm text-slate-400 ml-2">
                No filters applied
              </div>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="min-w-[140px] text-right">
              {totalItems === 0
                ? "0 - 0 of 0"
                : `${startItem} - ${endItem} of ${totalItems}`}
            </div>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`w-10 h-10 rounded-lg ${
                page === 1
                  ? "text-slate-300 cursor-not-allowed"
                  : "hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`w-10 h-10 rounded-lg ${
                page === totalPages
                  ? "text-slate-300 cursor-not-allowed"
                  : "hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm overflow-hidden mt-4">
          {loading ? (
            <div className="px-6 py-20 text-center text-sm text-slate-400">
              Loading orders...
            </div>
          ) : error ? (
            <div className="px-6 py-20 text-center text-sm text-red-500">
              Error: {error}
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">
                    ORDER NO
                  </th>
                  <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">
                    DELIVERY DATE
                  </th>
                  <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">
                    CLIENT
                  </th>
                  <th className="text-right text-xs text-slate-500 font-semibold px-6 py-4">
                    AMOUNT (COP)
                  </th>
                  <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">
                    CURRENT STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-20 text-center text-sm text-slate-400"
                    >
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  filtered
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((r, i) => {
                      const statusConfig = getStatusConfig(r.status);
                      return (
                        <tr
                          key={r.id || i}
                          className={`transition hover:bg-slate-50 ${
                            i % 2 === 0 ? "" : "bg-white"
                          }`}
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {r.order_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(r.estimated_delivery_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {r.clientName || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-semibold text-right tabular-nums">
                            ${formatCOP(r.total_amount || 0)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-400 shadow-md">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-end gap-6">
            <div className="text-sm text-slate-500">
              Total accumulated pending COP :
            </div>
            <div className="px-4 py-2 bg-white text-3xl font-extrabold tabular-nums">
              ${formatCOP(totalAmount)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
