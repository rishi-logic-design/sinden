import React, { useState, useEffect, useRef } from "react";
import Toast from "./Toast";
import LoadingOverlay from "./LoadingOverlay";
import FileUpload from "./FileUpload";
import SignatureCanvas from "./SignatureCanvas";
import FilePreviewModal from "./FilePreviewModal";
import PricingSection from "./PriceSection";
import ApiService from "../../services/ApiService";
import useToast from "../../hooks/UseToast";
import { validateOrderForm, sanitizeInput } from "../../utils/validation";
import { useCallback } from "react";

export default function NewOrderFullScreen({ onOrderSaved = () => { } }) {
  // Form state
  const [formData, setFormData] = useState({
    clientName: "",
    contact: "",
    serviceType: "",
    dateEstimated: "",
    timeEstimated: "",
    serviceDetail: "",
    observations: "",
  });

  // Pricing data (optional for future integration)
  const [pricingData, setPricingData] = useState(null);

  // UI state
  const [files, setFiles] = useState([]);
  const [signature, setSignature] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [pricingKey, setPricingKey] = useState(0); // For force reset

  // Ref for first input to focus after reset
  const clientNameRef = useRef(null);

  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Set default date to today
  useEffect(() => {
    const today = new Date();

    // auto set today's date
    const date = today.toISOString().split("T")[0];

    // auto set time = current time + 2 hours
    const estimated = new Date(today.getTime() + 2 * 60 * 60 * 1000);
    const time = estimated.toTimeString().slice(0, 5); // "HH:mm"

    setFormData((prev) => ({
      ...prev,
      dateEstimated: date,
      timeEstimated: time,
    }));
  }, []);

  // Real-time validation functions
  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    if (!phone) return "Phone number is required";
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
      return "Phone number must be exactly 10 digits";
    }
    return null;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const gmailRegex = /^[^\s@]+@gmail\.com$/;

    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (!gmailRegex.test(email)) return "Please enter a valid Gmail address";
    return null;
  };

  const validateContactField = (contact) => {
    if (!contact) return "Contact information is required";

    // Check if it's a phone number (contains only digits, spaces, dashes, parentheses)
    const phonePattern = /^[\d\s\-\(\)]+$/;
    const emailPattern = /@/;

    if (emailPattern.test(contact)) {
      return validateEmail(contact);
    } else if (phonePattern.test(contact)) {
      return validatePhone(contact);
    } else {
      return "Please enter either a valid phone number (10 digits) or Gmail address";
    }
  };

  // Handle pricing data changes (for future integration)
  const handlePricingChange = useCallback((data) => {
    setPricingData(data);
  }, []);

  // Reset pricing data when form resets
  const resetPricingData = () => {
    setPricingData(null);
  };

  // Update form data with real-time validation
  const updateFormData = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Real-time validation for contact field
    if (field === "contact") {
      const contactError = validateContactField(value);
      setErrors((prev) => ({
        ...prev,
        contact: contactError,
      }));
    } else {
      // Clear error for this field if it exists
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const sanitizedData = {
      ...formData,
      clientName: sanitizeInput(formData.clientName),
      contact: sanitizeInput(formData.contact),
      serviceDetail: sanitizeInput(formData.serviceDetail),
      observations: sanitizeInput(formData.observations),
    };

    const validation = validateOrderForm(sanitizedData);
    const newErrors = { ...validation.errors };

    // Enhanced contact validation
    const contactError = validateContactField(formData.contact);
    if (contactError) {
      newErrors.contact = contactError;
    }

    // Additional validations for files and signature
    if (files.length === 0) {
      newErrors.files = "At least one attachment is required";
    }

    if (!signature) {
      newErrors.signature = "Client signature is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showError("Please fix the highlighted errors before submitting");
      return false;
    }

    return true;
  };

  // Create order payload
  const createOrderPayload = (isDraft = false) => {
    const estimatedDelivery =
      formData.dateEstimated && formData.timeEstimated
        ? new Date(
          `${formData.dateEstimated}T${formData.timeEstimated}`
        ).toISOString()
        : new Date().toISOString();

    return {
      order_number: `ORD-${Date.now()}`,
      customer_id: 1,
      plant_id: 1,
      estimated_delivery_at: estimatedDelivery,
      total_amount: pricingData?.pricing?.total || 0,
      // ALWAYS set to "Pending" when order is created (not draft)
      status: isDraft ? undefined : "Pending",
      payment_status: isDraft ? "draft" : "None",
      meta: {
        clientName: sanitizeInput(formData.clientName),
        contact: sanitizeInput(formData.contact),
        serviceType: formData.serviceType,
        serviceDetail: sanitizeInput(formData.serviceDetail),
        observations: sanitizeInput(formData.observations),
        draft: isDraft,
        fileCount: files.length,
        hasSignature: !!signature,
        createdAt: new Date().toISOString(),
        // Add pricing data if available
        ...(pricingData && {
          items: pricingData.items,
          pricing: pricingData.pricing
        })
      },
    };
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!formData.clientName.trim()) {
      showError("Client name is required to save draft");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Saving draft...");

    try {
      const payload = createOrderPayload(true);
      const result = await ApiService.saveDraft(payload);

      setCurrentOrderId(result.id);
      showSuccess("Draft saved successfully");

      // Notify parent component
      onOrderSaved({
        mode: "draft",
        orderId: result.id,
        orderNumber: payload.order_number,
      });
    } catch (error) {
      console.error("Save draft error:", error);
      showError(`Failed to save draft: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setLoadingMessage("Submitting order...");

    try {
      // Create order first - it will automatically be set to "Pending" status
      const payload = createOrderPayload(false);
      const result = await ApiService.createOrder(payload);
      const orderId = result.id;

      setCurrentOrderId(orderId);
      setLoadingMessage("Uploading attachments...");

      // Upload files
      const uploadPromises = files
        .filter((file) => file.file)
        .map(async (fileObj) => {
          try {
            await ApiService.uploadAttachment(orderId, fileObj.file);
            return { success: true, filename: fileObj.name };
          } catch (error) {
            console.error(`Failed to upload ${fileObj.name}:`, error);
            return {
              success: false,
              filename: fileObj.name,
              error: error.message,
            };
          }
        });

      const uploadResults = await Promise.all(uploadPromises);
      const failedUploads = uploadResults.filter((r) => !r.success);

      if (failedUploads.length > 0) {
        showError(
          `Some files failed to upload: ${failedUploads
            .map((f) => f.filename)
            .join(", ")}`
        );
      }

      // Upload signature
      if (signature) {
        setLoadingMessage("Uploading signature...");
        try {
          await ApiService.uploadSignature(orderId, signature);
        } catch (error) {
          console.error("Failed to upload signature:", error);
          showError("Failed to upload signature, but order was created");
        }
      }

      // Success
      showSuccess(
        `Order ${result.order_number || orderId} created successfully with Pending status!`
      );

      // Notify parent component with status
      onOrderSaved({
        mode: "submitted",
        orderId: result.id,
        orderNumber: result.order_number || payload.order_number,
        status: "Pending",
        payload,
      });

      // Reset form immediately and focus on first input
      setTimeout(() => {
        resetForm();
        if (clientNameRef.current) {
          clientNameRef.current.focus();
        }
      }, 1000);
    } catch (error) {
      console.error("Submit failed:", error);
      showError(`Failed to submit order: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      clientName: "",
      contact: "",
      serviceType: "",
      dateEstimated: new Date().toISOString().split("T")[0],
      timeEstimated: "",
      serviceDetail: "",
      observations: "",
    });

    setPricingData(null);
    setErrors({});
    setSignature(null);

    // Clean up file URLs
    files.forEach((f) => {
      if (f.url && f.url.startsWith("blob:")) {
        URL.revokeObjectURL(f.url);
      }
    });
    setFiles([]);
    setCurrentOrderId(null);

    // Reset pricing section by using key prop
    setPricingKey(prev => prev + 1);
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      formData.clientName.trim() &&
      formData.serviceType &&
      formData.dateEstimated &&
      formData.timeEstimated &&
      files.length > 0 &&
      signature &&
      !validateContactField(formData.contact) // No contact validation error
    );
  };

  // Check if draft can be saved
  const canSaveDraft = () => {
    return formData.clientName.trim().length > 0;
  };

  return (
    <LoadingOverlay isLoading={isLoading} message={loadingMessage}>
      <div className="min-h-screen w-full p-8 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl mb-10 font-bold text-gray-900">New Order</h1>
          </div>

          {/* Client & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Client name
              </label>
              <input
                ref={clientNameRef}
                value={formData.clientName}
                onChange={(e) => updateFormData("clientName", e.target.value)}
                placeholder="Enter client name"
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${errors.clientName
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                disabled={isLoading}
              />
              {errors.clientName && (
                <p className="text-xs text-red-600 mt-1">{errors.clientName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Contact (Phone/Gmail)
              </label>
              <input
                value={formData.contact}
                onChange={(e) => updateFormData("contact", e.target.value)}
                placeholder="10-digit phone or Gmail address"
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${errors.contact
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                disabled={isLoading}
              />
              {errors.contact && (
                <p className="text-xs text-red-600 mt-1">{errors.contact}</p>
              )}
              {!errors.contact && formData.contact && (
                <p className="text-xs text-green-600 mt-1">✓ Valid contact information</p>
              )}
            </div>
          </div>

          {/* Service, Date, Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Service type
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => updateFormData("serviceType", e.target.value)}
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${errors.serviceType
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                disabled={isLoading}
              >
                <option value="">Select service</option>
                <option value="cleaning">Cleaning</option>
                <option value="repair">Repair</option>
                <option value="maintenance">Maintenance</option>
                <option value="consultation">Consultation</option>
                <option value="installation">Installation</option>
              </select>
              {errors.serviceType && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.serviceType}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Estimated delivery date
              </label>
              <input
                type="date"
                value={formData.dateEstimated}
                readOnly
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${errors.dateEstimated
                  ? "border-red-400"
                  : "border-gray-300"
                  } bg-gray-100 cursor-not-allowed`}
              />
              {errors.dateEstimated && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.dateEstimated}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Estimated delivery time
              </label>
              <input
                type="time"
                value={formData.timeEstimated}
                readOnly
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${errors.timeEstimated
                  ? "border-red-400"
                  : "border-gray-300"
                  } bg-gray-100 cursor-not-allowed`}
              />
              {errors.timeEstimated && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.timeEstimated}
                </p>
              )}
            </div>

          </div>

          {/* Service Details */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Service details
            </label>
            <textarea
              value={formData.serviceDetail}
              onChange={(e) => updateFormData("serviceDetail", e.target.value)}
              placeholder="Describe the service details"
              rows={2}
              className={`block w-full rounded-md px-3 py-2 text-sm border ${errors.serviceDetail
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-vertical`}
              disabled={isLoading}
            />
            {errors.serviceDetail && (
              <p className="text-xs text-red-600 mt-1">
                {errors.serviceDetail}
              </p>
            )}
          </div>

          {/* Observations */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Observations
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => updateFormData("observations", e.target.value)}
              rows={3}
              className={`block w-full rounded-md px-3 py-2 text-sm border ${errors.observations
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 resize-vertical`}
              placeholder="Additional observations or notes"
              disabled={isLoading}
            />
            {errors.observations && (
              <p className="text-xs text-red-600 mt-1">{errors.observations}</p>
            )}
          </div>

          {/* Attachments - Full Width */}
          <div className="mb-6">
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              onPreview={setPreview}
              onError={showError}
              onSuccess={showSuccess}
              disabled={isLoading}
            />
            {errors.files && (
              <p className="text-xs text-red-600 mt-1">{errors.files}</p>
            )}
          </div>

          {/* Pricing Section */}
          <div className="mb-6">
            <PricingSection
              key={pricingKey}
              onPricingChange={handlePricingChange}
              disabled={isLoading}
            />
          </div>

          {/* Signature Section */}
          <div className="mb-6">
            <SignatureCanvas
              onSignatureChange={setSignature}
              disabled={isLoading}
            />
            {errors.signature && (
              <p className="text-xs text-red-600 mt-1">{errors.signature}</p>
            )}
          </div>

          {/* Form Status Indicator */}
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Form Status: </span>
                <span
                  className={`${isFormValid() ? "text-green-600" : "text-orange-600"
                    }`}
                >
                  {isFormValid()
                    ? "Ready to submit (will be created as Pending)"
                    : "Missing required fields"}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {isFormValid()
                  ? "✓ All requirements met"
                  : `${6 -
                  [
                    formData.clientName.trim(),
                    !validateContactField(formData.contact),
                    formData.serviceType,
                    formData.dateEstimated,
                    formData.timeEstimated,
                    files.length > 0 && signature,
                  ].filter(Boolean).length
                  } items remaining`}
              </div>
            </div>
            {!isFormValid() && (
              <div className="text-xs text-gray-500 mt-2">
                Required: Client name, Valid contact (10-digit phone/Gmail), Service type, Delivery date & time, At least 1 attachment, Client signature
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isLoading || !canSaveDraft()}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isLoading || !isFormValid()}
              className="px-6 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Order
            </button>
          </div>

          {/* Current Order ID Display */}
          {currentOrderId && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Order ID:</strong> {currentOrderId}
              </p>
            </div>
          )}
        </div>

        {/* File Preview Modal */}
        {preview && (
          <FilePreviewModal
            preview={preview}
            onClose={() => setPreview(null)}
          />
        )}

        {/* Toast Messages */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </LoadingOverlay>
  );
}