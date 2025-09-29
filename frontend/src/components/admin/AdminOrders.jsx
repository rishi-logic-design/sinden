import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import OrderDetailsPage from "./OrderDetailsPage";
import OrderActions from "./OrderActions";

const STATUSES = [
  "Pending",
  "In Progress",
  "Executed",
  "Finalized",
  "Cancelled",
  "Delivered",
  "Payment Pending",
  "Paid",
];

const sampleOrders = [
  {
    id: "E150291",
    client: "Juan Pérez",
    currentStatus: "Draft",
    registrationDate: "01/09/2025 - 13:32",
    estimatedDeliveryDate: "02/09/2025",
    estimatedDeliveryTime: "16:00",
    notes: "Handle with care.",
  },
  {
    id: "E150292",
    client: "Industrias Ríos",
    currentStatus: "Pending",
    registrationDate: "01/09/2025 10:05",
    estimatedDeliveryDate: "03/09/2025",
    estimatedDeliveryTime: "11:00",
    notes: "Customer will pick up at noon.",
  },
  {
    id: "E150293",
    client: "Maria González",
    currentStatus: "In Progress",
    registrationDate: "02/09/2025 - 09:15",
    estimatedDeliveryDate: "04/09/2025",
    estimatedDeliveryTime: "14:30",
    notes: "Urgent delivery required.",
  },
  // ...more sample orders
];

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // filter state
  const [dateRange, setDateRange] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;
  const totalItems = sampleOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // details - this is the key state for showing order details
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const handleDocClick = () => setShowFilters(false);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const stopClose = (e) => e.stopPropagation();

  const toggleStatus = (status) => {
    setSelectedStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const clearFilters = (e) => {
    if (e) e.stopPropagation();
    setDateRange("");
    setClientSearch("");
    setSelectedStatuses({});
  };

  const applyFilters = (e) => {
    if (e) e.stopPropagation();
    setShowFilters(false);
    // Implement actual filter logic (API call or client-side) if needed
    const applied = {
      dateRange,
      clientSearch,
      statuses: Object.keys(selectedStatuses).filter((s) => selectedStatuses[s]),
    };
    console.log("Applying filters:", applied);
  };

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const handleView = (order) => setSelectedOrder(order);
  const handleEdit = (order) => console.log("Edit", order);
  const handleChangeStatus = (order) => console.log("Change status", order);
  const handleExportPdf = (order) => console.log("Export PDF", order);

  // apply basic search + client filter + status filter client-side for preview
  const filteredOrders = sampleOrders.filter((o) => {
    const q = `${o.id} ${o.client}`.toLowerCase();
    const matchesSearch = q.includes(searchTerm.toLowerCase());
    const matchesClient = clientSearch ? (`${o.client}`.toLowerCase().includes(clientSearch.toLowerCase())) : true;
    const statusesSelected = Object.keys(selectedStatuses).filter((s) => selectedStatuses[s]);
    const matchesStatus = statusesSelected.length ? statusesSelected.includes(o.currentStatus) : true;
    // dateRange parsing not implemented – left as placeholder
    return matchesSearch && matchesClient && matchesStatus;
  });

  // If an order is selected, show only the order details page
  if (selectedOrder) {
    return (
      <OrderDetailsPage
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onEdit={handleEdit}
        onChangeStatus={handleChangeStatus}
        onExportPdf={handleExportPdf}
      />
    );
  }

  // Otherwise show the orders list with search, filters, and table
  return (
    <div className="w-full min-h-screen ">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <h2 className="text-4xl font-bold">Orders</h2>
        <button
          className="px-4 py-2 border cursor-pointer border-gray-300 rounded-md text-lg font-medium text-gray-800 hover:bg-black hover:transition-all hover:text-white transition"
          onClick={() => console.log("Export Excel")}
        >
          Export Excel
        </button>
      </div>

      {/* Controls row: Search | Filters | spacer | Pagination */}
      <div className="px-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Search + Filters group */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Order No"
                className="w-80 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Filters button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  stopClose(e);
                  setShowFilters((s) => !s);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 transition hover:bg-blue-50 hover:text-blue-600"
                aria-expanded={showFilters}
                aria-haspopup="true"
              >
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>

              {/* Filters panel */}
              {showFilters && (
                <div
                  onClick={stopClose}
                  className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-40"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                    <button onClick={clearFilters} className="text-sm text-blue-500 hover:underline">
                      Clear
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-3 space-y-4 max-h-[420px] overflow-auto">
                    {/* Date range */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration date</label>
                      <div className="relative hover:bg-blue-50 rounded-md">
                        <Calendar className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value)}
                          placeholder="dd/mm/yyyy - dd/mm/yyyy"
                          className="w-full pl-3 pr-10 py-3 bg-white border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Client */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                      <div className="relative hover:bg-blue-50 rounded-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search"
                          className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Current status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Current status</label>
                      <div className="space-y-2">
                        {STATUSES.map((s) => (
                          <label
                            key={s}
                            className="flex items-center gap-2 text-sm hover:bg-blue-50 rounded-md px-2 py-1 transition"
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedStatuses[s]}
                              onChange={() => toggleStatus(s)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t">
                    <button
                      onClick={applyFilters}
                      className="w-full px-4 py-3 bg-black text-white rounded-md text-sm font-medium hover:opacity-95 transition"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* spacer */}
          <div className="flex-1" />

          {/* Pagination */}
          <div className="flex items-center gap-3 whitespace-nowrap text-sm text-gray-600">
            <div className="pr-2">{startItem} - {endItem} of {totalItems}</div>

            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className={`p-2 rounded-md transition ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md transition ${currentPage === totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-900 hover:bg-gray-100"}`}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content area - Orders Table */}
      <div className="px-2 pb-12">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ORDER NO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CLIENT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CURRENT STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">REGISTRATION DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EST. DELIVERY DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EST. DELIVERY TIME</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.client}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {order.currentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.registrationDate}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.estimatedDeliveryDate}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.estimatedDeliveryTime}</td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex items-center justify-end">
                      <OrderActions
                        order={order}
                        onView={handleView}
                        onEdit={handleEdit}
                        onChangeStatus={handleChangeStatus}
                        onExportPdf={handleExportPdf}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}