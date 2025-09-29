import React, { useState, useEffect } from "react";

export default function PricingSection({
  onPricingChange = () => {},
  disabled = false,
  initialItems = [
    { id: 1, description: "", quantity: 0, unitPrice: 0, total: 0 },
  ],
}) {
  // Items state
  const [items, setItems] = useState(initialItems);

  // Totals state
  const [totals, setTotals] = useState({
    subtotal: 0,
    iva: 0,
    total: 0,
    deposit: 0,
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const iva = subtotal * 0.16; // 16% IVA
    const total = subtotal + iva;

    setTotals((prev) => ({
      ...prev,
      subtotal,
      iva,
      total,
    }));
  }, [items]);

  // Notify parent of changes
  useEffect(() => {
    onPricingChange({
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      pricing: {
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        deposit: totals.deposit,
      },
    });
  }, [items, totals, onPricingChange]);

  // Update item
  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Add new item
  const addItem = () => {
    const newId = Math.max(...items.map((item) => item.id)) + 1;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        description: "",
        quantity: 0,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  // Remove item
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Update deposit
  const updateDeposit = (value) => {
    setTotals((prev) => ({ ...prev, deposit: parseFloat(value) || 0 }));
  };

  return (
    <div className=" p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Service Items & Pricing
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 w-12">
                ID
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                Description
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 w-20">
                Quantity
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 w-24">
                Unit Price
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 w-24">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 px-2">
                  <span className="text-sm text-gray-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <select
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={disabled}
                  >
                    <option value="">Select description</option>
                    <option value="basic-service">Basic Service</option>
                    <option value="premium-service">Premium Service</option>
                    <option value="consultation">Consultation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="installation">Installation</option>
                  </select>
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={disabled}
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={item.total.toFixed(2)}
                      readOnly
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right bg-gray-50"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        disabled={disabled}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addItem}
        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
        disabled={disabled}
      >
        + Add Item
      </button>

      {/* Totals Section */}
      <div className="mt-6">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                SUBTOTAL
              </span>
              <span className="text-sm font-medium text-gray-900">
                ${totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                IVA (16%)
              </span>
              <span className="text-sm font-medium text-gray-900">
                ${totals.iva.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-900">TOTAL</span>
              <span className="text-sm font-bold text-gray-900">
                ${totals.total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">DEPOSIT</span>
              <input
                type="number"
                value={totals.deposit}
                onChange={(e) => updateDeposit(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
