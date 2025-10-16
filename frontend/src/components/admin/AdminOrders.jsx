import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
} from "lucide-react";
import OrderDetailsPage from "./OrderDetailsPage";
import OrderActions from "./OrderActions";
import ApiService from "../../services/ApiService";
import UpdateStatusModal from "./UpdateStatusModal";
import EditOrderPage from "./AdminEditOrderPage";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

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

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // API state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filter state
  const [dateRange, setDateRange] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;
  const totalItems = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Navigation states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getOrders();

      console.log("Fetched orders:", response);
      const ordersData = Array.isArray(response) ? response : [];

      const transformedOrders = ordersData.map((order) => ({
        id: order.order_number,
        client: order.meta?.clientName || order.Customer?.name || "Unknown",
        currentStatus: order.status,
        registrationDate: new Date(order.createdAt)
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(",", " -"),
        estimatedDeliveryDate: order.estimated_delivery_at
          ? new Date(order.estimated_delivery_at).toLocaleDateString("en-GB")
          : "N/A",
        estimatedDeliveryTime: order.estimated_delivery_at
          ? new Date(order.estimated_delivery_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "N/A",
        notes: order.meta?.notes || "N/A",
        fullData: order,
      }));
      setOrders(transformedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Action handlers
  const handleView = (order) => setSelectedOrder(order);

  const handleEdit = (order) => {
    setEditingOrder(order);
  };

  const handleChangeStatus = (order) => {
    setOrderToUpdateStatus(order);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!orderToUpdateStatus) return;

    try {
      // Call the correct API method
      await ApiService.updateOrderStatus(
        orderToUpdateStatus.fullData.id,
        newStatus,
        "Status updated from admin panel"
      );

      // Refresh orders list
      await fetchOrders();

      // Close modal
      setShowStatusModal(false);
      setOrderToUpdateStatus(null);

      console.log("Status updated successfully to:", newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(`Failed to update status: ${error.message || "Unknown error"}`);
    }
  };

  const handleExportPdf = (order) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Order Details", 14, 20);

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Order No: ${order.id}`, 14, 35);
    doc.text(`Client: ${order.client}`, 14, 42);
    doc.text(`Status: ${order.currentStatus}`, 14, 49);
    doc.text(`Registration Date: ${order.registrationDate}`, 14, 56);
    doc.text(`Est. Delivery Date: ${order.estimatedDeliveryDate}`, 14, 63);
    doc.text(`Est. Delivery Time: ${order.estimatedDeliveryTime}`, 14, 70);

    if (order.fullData?.OrderItems?.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Order Items", 14, 85);

      const tableData = order.fullData.OrderItems.map((item, idx) => [
        idx + 1,
        item.Product?.name || item.product_name || "N/A",
        item.quantity || "N/A",
        item.price ? `$${item.price}` : "N/A",
        item.quantity && item.price ? `$${item.quantity * item.price}` : "N/A",
      ]);

      doc.autoTable({
        startY: 90,
        head: [["#", "Product", "Quantity", "Price", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [0, 0, 0] },
      });
    }

    if (order.notes && order.notes !== "N/A") {
      const finalY = doc.lastAutoTable?.finalY || 85;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Notes:", 14, finalY + 15);
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(order.notes, 14, finalY + 22, { maxWidth: 180 });
    }

    doc.save(`Order_${order.id}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      alert("No orders to export");
      return;
    }

    const data = filteredOrders.map((order) => ({
      "Order No": order.id,
      Client: order.client,
      Status: order.currentStatus,
      "Registration Date": order.registrationDate,
      "Est. Delivery Date": order.estimatedDeliveryDate,
      "Est. Delivery Time": order.estimatedDeliveryTime,
      "Total Amount": order.fullData?.total_amount || "N/A",
      "Payment Status": order.fullData?.payment_status || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Set column widths
    const colWidths = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(
      workbook,
      `Orders_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Filter handlers
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
    setCurrentPage(1);
  };

  // Pagination handlers
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Filtering logic
  const filteredOrders = orders.filter((o) => {
    const q = `${o.id} ${o.client}`.toLowerCase();
    const matchesSearch = q.includes(searchTerm.toLowerCase());

    const matchesClient = clientSearch
      ? o.client.toLowerCase().includes(clientSearch.toLowerCase())
      : true;

    const statusesSelected = Object.keys(selectedStatuses).filter(
      (s) => selectedStatuses[s]
    );
    const matchesStatus = statusesSelected.length
      ? statusesSelected.includes(o.currentStatus)
      : true;

    let matchesDate = true;
    if (dateRange) {
      const dates = dateRange.split("-").map((d) => d.trim());
      const orderDate = new Date(o.fullData?.createdAt);

      if (dates.length === 2) {
        const [startStr, endStr] = dates;
        if (startStr) {
          const [d1, m1, y1] = startStr.split("/");
          const startDate = new Date(y1, m1 - 1, d1);
          if (orderDate < startDate) matchesDate = false;
        }
        if (endStr) {
          const [d2, m2, y2] = endStr.split("/");
          const endDate = new Date(y2, m2 - 1, d2, 23, 59, 59);
          if (orderDate > endDate) matchesDate = false;
        }
      } else if (dates.length === 1 && dates[0]) {
        const [d, m, y] = dates[0].split("/");
        const targetDate = new Date(y, m - 1, d);
        const targetDateEnd = new Date(y, m - 1, d, 23, 59, 59);
        if (orderDate < targetDate || orderDate > targetDateEnd)
          matchesDate = false;
      }
    }

    return matchesSearch && matchesClient && matchesStatus && matchesDate;
  });

  const getStatusColor = (status) => {
    const colors = {
      Pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
      "In Progress": "bg-blue-100 text-blue-700 border-blue-300",
      Executed: "bg-purple-100 text-purple-700 border-purple-300",
      Finalized: "bg-green-100 text-green-700 border-green-300",
      Cancelled: "bg-red-100 text-red-700 border-red-300",
      Delivered: "bg-emerald-100 text-emerald-700 border-emerald-300",
      "Payment Pending": "bg-orange-100 text-orange-700 border-orange-300",
      Paid: "bg-teal-100 text-teal-700 border-teal-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Render conditions
  if (editingOrder) {
    return (
      <EditOrderPage
        order={editingOrder}
        onBack={() => setEditingOrder(null)}
        onRefresh={fetchOrders}
      />
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetailsPage
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onRefresh={fetchOrders}
        onEdit={handleEdit}
        onChangeStatus={handleChangeStatus}
        onExportPdf={handleExportPdf}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <h2 className="text-4xl font-bold">Orders</h2>
        <button
          className="px-4 py-2 border cursor-pointer border-gray-300 rounded-md text-lg font-medium text-gray-800 hover:bg-black hover:transition-all hover:text-white transition"
          onClick={handleExportExcel}
        >
          Export Excel
        </button>
      </div>

      <div className="px-8 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Order No"
                className="w-80 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

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
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showFilters && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-40">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Filters
                    </h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="px-4 py-3 space-y-4 max-h-[420px] overflow-auto">
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration date
                      </label>
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

                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client
                      </label>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Current status
                      </label>
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

          <div className="flex-1" />

          <div className="flex items-center gap-3 whitespace-nowrap text-sm text-gray-600">
            <div className="pr-2">
              {startItem} - {endItem} of {totalItems}
            </div>

            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className={`p-2 rounded-md transition ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md transition ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 pb-12">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ORDER NO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CLIENT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CURRENT STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  REGISTRATION DATE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  EST. DELIVERY DATE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  EST. DELIVERY TIME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {order.client}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        order.currentStatus
                      )}`}
                    >
                      {order.currentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.registrationDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.estimatedDeliveryDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.estimatedDeliveryTime}
                  </td>

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
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UpdateStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setOrderToUpdateStatus(null);
        }}
        currentStatus={orderToUpdateStatus?.currentStatus || ""}
        statuses={STATUSES}
        onUpdate={handleStatusUpdate}
      />
    </div>
  );
}
