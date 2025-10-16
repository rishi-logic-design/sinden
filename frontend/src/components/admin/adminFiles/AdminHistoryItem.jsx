import React from "react";

export default function HistoryItem({ item }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "In Progress":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "Executed":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "Finalized":
        return "bg-green-100 text-green-700 border-green-300";
      case "Delivered":
        return "bg-teal-100 text-teal-700 border-teal-300";
      case "Payment Pending":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
        <span
          className={`px-2 py-1 rounded-md text-xs border ${getStatusColor(
            item.status
          )}`}
        >
          {item.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{item.subtitle}</p>
      <p className="text-xs text-gray-500">{item.date}</p>
      <p className="text-xs text-gray-700 flex items-center gap-1 mt-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
        {item.user}
      </p>
    </div>
  );
}
