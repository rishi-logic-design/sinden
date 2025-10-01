// ReportsFullTailwindImproved.jsx
import React, { useMemo, useState } from "react";

const sampleData = [
  { id: "E150291", completed: "01/09/2025 - 13:32", client: "Juan Pérez", amount: 10000000, status: "Finalized" },
  { id: "E150292", completed: "01/09/2025 - 10:05", client: "Industrias Ríos", amount: 10000000, status: "Finalized" },
  // add more rows to test pagination/visuals
];

function parseCompletionDate(dateStr) {
  if (!dateStr) return null;
  const [datePart] = dateStr.split(" - ");
  const [dd, mm, yyyy] = datePart.split("/");
  if (!dd || !mm || !yyyy) return null;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}
function formatCOP(n) {
  return n.toLocaleString("en-US");
}

export default function ReportsPage() {
  // top quick search
  const [query, setQuery] = useState("");
  // filters panel
  const [showFilters, setShowFilters] = useState(false);
  // panel temp values
  const [tmpStart, setTmpStart] = useState("");
  const [tmpEnd, setTmpEnd] = useState("");
  const [tmpClient, setTmpClient] = useState("");
  const [tmpStatus, setTmpStatus] = useState("");
  // applied filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedClient, setAppliedClient] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 24;

  // compute filtered dataset
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return sampleData.filter((r) => {
      if (q && !(`${r.id} ${r.client}`.toLowerCase().includes(q))) return false;
      if (appliedClient && !r.client.toLowerCase().includes(appliedClient.toLowerCase())) return false;
      if (appliedStatus && r.status !== appliedStatus) return false;

      if (start || end) {
        const rDate = parseCompletionDate(r.completed);
        if (!rDate) return false;
        const rTime = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()).getTime();
        if (start) {
          const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
          if (rTime < sTime) return false;
        }
        if (end) {
          const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
          if (rTime > eTime) return false;
        }
      }
      return true;
    });
  }, [query, appliedClient, appliedStatus, startDate, endDate]);

  const totalItems = filtered.length;
  const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  if (page > totalPages) setPage(totalPages);

  const activeFilterPills = [];
  if (appliedClient) activeFilterPills.push({ id: "client", label: `Client: ${appliedClient}` });
  if (appliedStatus) activeFilterPills.push({ id: "status", label: `Status: ${appliedStatus}` });
  if (startDate || endDate) {
    const label = `${startDate ? startDate : "—"} → ${endDate ? endDate : "—"}`;
    activeFilterPills.push({ id: "dates", label: `Completion: ${label}` });
  }

  // handlers
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
    setTmpStart(""); setTmpEnd(""); setTmpClient(""); setTmpStatus("");
    setStartDate(""); setEndDate(""); setAppliedClient(""); setAppliedStatus("");
    setQuery("");
    setShowFilters(false);
    setPage(1);
  };
  const removePill = (id) => {
    if (id === "client") setAppliedClient("");
    if (id === "status") setAppliedStatus("");
    if (id === "dates") { setStartDate(""); setEndDate(""); }
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* page container */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* header */}
        <div className="flex items-start gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Finalized Reports with Credit</h1>
            <p className="text-sm text-slate-500 mt-1">Last updated: <span className="font-medium">Today</span></p>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg bg-white text-sm font-semibold shadow-sm hover:translate-y-[-2px] transition">
              {/* Generate icon */}
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Generate Report
            </button>
            <button className="px-4 py-2 border rounded-lg bg-white text-sm font-semibold shadow-sm hover:bg-slate-50 transition">
              Export Excel
            </button>
            <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold shadow hover:opacity-95 transition">
              Export PDF
            </button>
          </div>
        </div>

        {/* controls: search, filters, pills, pagination */}
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm min-w-[260px]">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <input className="outline-none text-sm text-slate-700" placeholder="Search order no or client" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {/* Filters button */}
          <div className="relative">
            <button onClick={() => (showFilters ? setShowFilters(false) : openFilters())} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">
              Filters
              <svg className={`w-3 h-3 transform ${showFilters ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* filters panel */}
            <div className={`absolute left-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 transform transition-all duration-150 ${showFilters ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                <button onClick={clearAllFilters} className="text-sm text-teal-600 hover:underline">Clear</button>
              </div>

              <div className="space-y-3 max-h-60 overflow-auto pr-1">
                <div>
                  <label className="text-xs text-slate-500">Completion date</label>
                  <div className="flex gap-2 mt-2">
                    <input type="date" className="w-1/2 px-3 py-2 bg-slate-50 border rounded-md text-sm" value={tmpStart} onChange={(e) => setTmpStart(e.target.value)} />
                    <input type="date" className="w-1/2 px-3 py-2 bg-slate-50 border rounded-md text-sm" value={tmpEnd} onChange={(e) => setTmpEnd(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">Client with credit</label>
                  <div className="mt-2 flex items-center gap-2 bg-white border rounded-md px-3 py-2">
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <input className="w-full text-sm outline-none" placeholder="Search" value={tmpClient} onChange={(e) => setTmpClient(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">Current status</label>
                  <select className="mt-2 w-full px-3 py-2 bg-slate-50 border rounded-md text-sm" value={tmpStatus} onChange={(e) => setTmpStatus(e.target.value)}>
                    <option value="">Any</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Finalized</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <button onClick={applyFilters} className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white font-semibold hover:opacity-95">Apply Filters</button>
              </div>
            </div>
          </div>

          {/* active filter pills */}
          <div className="flex items-center gap-2 ml-3 flex-wrap">
            {activeFilterPills.map((p) => (
              <div key={p.id} className="inline-flex items-center gap-2 bg-white border border-gray-200 px-3 py-1 rounded-full text-sm shadow-sm">
                <span className="text-slate-700">{p.label}</span>
                <button onClick={() => removePill(p.id)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ))}
            {activeFilterPills.length === 0 && <div className="text-sm text-slate-400 ml-2">No filters applied</div>}
          </div>

          <div className="flex-1" />

          {/* pagination */}
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="min-w-[140px] text-right">{totalItems === 0 ? "0 - 0 of 0" : `${startItem} - ${endItem} of ${totalItems}`}</div>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`w-10 h-10 rounded-lg  ${page===1 ? "text-slate-300 cursor-not-allowed" : "hover:bg-slate-50"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`w-10 h-10 rounded-lg  ${page===totalPages ? "text-slate-300 cursor-not-allowed" : "hover:bg-slate-50"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
          <table className="min-w-full">
            <thead className="bg-white sticky top-0 z-10">
              <tr>
                <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">ORDER NO</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">COMPLETION DATE</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">CLIENT</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">AMOUNT (COP)</th>
                <th className="text-left text-xs text-slate-500 font-semibold px-6 py-4">CURRENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-400">No reports found.</td></tr>
              ) : (
                filtered.slice((page-1)*pageSize, page*pageSize).map((r, i) => (
                  <tr key={r.id} className={`transition hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-white"}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{r.completed}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{r.client}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">${formatCOP(r.amount)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* footer / totals */}
        <div className="mt-6 flex items-center justify-end gap-6">
          <div className="text-sm text-slate-500">Total accumulated pending COP:</div>
          <div className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-xl font-extrabold">${formatCOP(totalAmount)}</div>
        </div>
      </div>
    </div>
  );
}
