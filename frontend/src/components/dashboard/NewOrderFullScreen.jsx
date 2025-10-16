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
import {
  useDraftManager,
  DraftStatus,
  DraftRecoveryModal,
  SubmitWarningModal,
} from "./draft/UseDraftManager";

export default function NewOrderFullScreen({
  onOrderSaved = () => {},
  initialDraft = null,
}) {
  const [formData, setFormData] = useState({
    clientName: "",
    contact: "",
    serviceType: "",
    dateEstimated: "",
    timeEstimated: "",
    serviceDetail: "",
    observations: "",
  });
  // Generate a unique order number
  function generateOrderNumber() {
    const num = Date.now().toString().slice(-6);
    return `D${num}`;
  }
  const [pricingData, setPricingData] = useState(null);
  const [files, setFiles] = useState([]);
  const [signature, setSignature] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [pricingKey, setPricingKey] = useState(0);
  const [signatureKey, setSignatureKey] = useState(0);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(null);

  const clientNameRef = useRef(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Initialize draft manager
  const {
    draftId,
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    isOnline,
    hasMinimumData,
    saveDraftManually,
    deleteDraft,
    forceSave,
    clearAutoBackup,
  } = useDraftManager(formData, files, signature, pricingData);

  // Set default date and time
  useEffect(() => {
    const today = new Date();
    const date = today.toISOString().split("T")[0];
    const estimated = new Date(today.getTime() + 2 * 60 * 60 * 1000);
    const time = estimated.toTimeString().slice(0, 5);

    setFormData((prev) => ({
      ...prev,
      dateEstimated: date,
      timeEstimated: time,
    }));
  }, []);

  // Check for existing draft on mount
  useEffect(() => {
    const checkForDraft = async () => {
      if (initialDraft) {
        loadDraftData(initialDraft);
        return;
      }

      try {
        // 1) First try server auto-save recovery
        const result = await ApiService.getLatestAutoSave();
        if (result?.success && result?.draft) {
          setRecoveredDraft(result.draft);
          setShowRecoveryModal(true);
          return;
        }
      } catch (error) {
        showError("Failed to check for drafts:", error);
        console.error("Failed to check for drafts:", error);
      }
    };

    checkForDraft();
  }, [initialDraft]);

  // Load draft data into form
  const loadDraftData = (draft) => {
    console.log("Loading draft:", draft); // Debug ke liye

    if (draft.form_data) {
      setFormData(draft.form_data);
    }
    if (draft.pricingData) {
      setPricingData(draft.pricingData);
    }

    setShowRecoveryModal(false);
    showSuccess("Draft recovered successfully");
  };

  // Handle draft recovery
  const handleRecoverDraft = () => {
    if (recoveredDraft) {
      loadDraftData(recoveredDraft);
    }
  };

  const handleDiscardDraft = async () => {
    if (recoveredDraft?.id) {
      await deleteDraft(recoveredDraft.id);
    }
    setShowRecoveryModal(false);
    setRecoveredDraft(null);
  };

  // Validation functions
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

  const handlePricingChange = useCallback((data) => {
    setPricingData(data);
  }, []);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "contact") {
      const contactError = validateContactField(value);
      setErrors((prev) => ({
        ...prev,
        contact: contactError,
      }));
    } else {
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    }
  };

  const getMissingFields = () => {
    const missing = [];
    if (!formData.clientName.trim()) missing.push("Client name");
    if (validateContactField(formData.contact))
      missing.push("Valid contact (Phone/Gmail)");
    if (!formData.serviceType) missing.push("Service type");
    if (!formData.dateEstimated) missing.push("Estimated delivery date");
    if (!formData.timeEstimated) missing.push("Estimated delivery time");
    if (files.length === 0) missing.push("At least one attachment");
    if (!signature) missing.push("Client signature");
    return missing;
  };

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

    const contactError = validateContactField(formData.contact);
    if (contactError) {
      newErrors.contact = contactError;
    }

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

  const createOrderPayload = () => {
    const estimatedDelivery =
      formData.dateEstimated && formData.timeEstimated
        ? new Date(
            `${formData.dateEstimated}T${formData.timeEstimated}`
          ).toISOString()
        : new Date().toISOString();

    return {
      order_number: generateOrderNumber(),
      customer_id: 1,
      plant_id: 1,
      estimated_delivery_at: estimatedDelivery,
      total_amount: pricingData?.pricing?.total || 0,
      status: "Pending",
      payment_status: "None",
      meta: {
        clientName: sanitizeInput(formData.clientName),
        contact: sanitizeInput(formData.contact),
        serviceType: formData.serviceType,
        serviceDetail: sanitizeInput(formData.serviceDetail),
        observations: sanitizeInput(formData.observations),
        fileCount: files.length,
        hasSignature: !!signature,
        createdAt: new Date().toISOString(),
        ...(pricingData && {
          items: pricingData.items,
          pricing: pricingData.pricing,
        }),
      },
    };
  };

  // Save draft manually
  const handleSaveDraft = async () => {
    if (!formData.clientName.trim()) {
      showError("Client name is required to save draft");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Saving draft...");

    try {
      const result = await saveDraftManually();
      showSuccess("Draft saved successfully");

      await clearAutoBackup();

      return result;
    } catch (error) {
      console.error("Save draft error:", error);
      showError(`Failed to save draft: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit order with validation
  const handleSubmitOrder = async () => {
    const missingFields = getMissingFields();

    if (missingFields.length > 0) {
      setShowSubmitWarning(true);
      return;
    }

    await submitOrder();
  };

  const handleSubmitFromWarning = () => {
    setShowSubmitWarning(false);
  };

  const handleSaveDraftFromWarning = async () => {
    setShowSubmitWarning(false);
    await handleSaveDraft();
  };

  const submitOrder = async () => {
    if (!validateForm()) return;

    // Force save before submitting if online
    if (isOnline && hasUnsavedChanges) {
      forceSave();
    }

    setIsLoading(true);
    setLoadingMessage("Submitting order...");

    try {
      const payload = createOrderPayload();
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
            showError(`Failed to upload ${fileObj.name}:`, error);
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

      showSuccess(
        `Order ${result.order_number || orderId} created successfully!`
      );

      await clearAutoBackup();

      onOrderSaved({
        mode: "submitted",
        orderId: result.id,
        orderNumber: result.order_number || payload.order_number,
        status: "Pending",
        payload,
      });

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
    setSignatureKey((k) => k + 1);

    files.forEach((f) => {
      if (f.url && f.url.startsWith("blob:")) {
        URL.revokeObjectURL(f.url);
      }
    });
    setFiles([]);
    setCurrentOrderId(null);
    setPricingKey((prev) => prev + 1);
  };

  const isFormValid = () => {
    return (
      formData.clientName.trim() &&
      formData.serviceType &&
      formData.dateEstimated &&
      formData.timeEstimated &&
      files.length > 0 &&
      signature &&
      !validateContactField(formData.contact)
    );
  };

  const canSaveDraft = () => {
    return formData.clientName.trim().length > 0;
  };

  return (
    <LoadingOverlay isLoading={isLoading} message={loadingMessage}>
      <div className="min-h-screen w-full p-8 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl mb-4 font-bold text-gray-900">New Order</h1>

            {/* Auto-save indicator */}
            {hasMinimumData && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-blue-700">
                  {isOnline
                    ? "Your progress is being auto-saved. You can safely leave and continue later."
                    : "You're offline. Changes will be saved when you're back online."}
                </span>
              </div>
            )}
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
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${
                  errors.clientName
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
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${
                  errors.contact
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                disabled={isLoading}
              />
              {errors.contact && (
                <p className="text-xs text-red-600 mt-1">{errors.contact}</p>
              )}
              {!errors.contact && formData.contact && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Valid contact information
                </p>
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
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${
                  errors.serviceType
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
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${
                  errors.dateEstimated ? "border-red-400" : "border-gray-300"
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
                className={`block w-full h-12 rounded-md px-3 py-2 text-sm border ${
                  errors.timeEstimated ? "border-red-400" : "border-gray-300"
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
              className={`block w-full rounded-md px-3 py-2 text-sm border ${
                errors.serviceDetail
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
              className={`block w-full rounded-md px-3 py-2 text-sm border ${
                errors.observations
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

          {/* Attachments */}
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
              key={signatureKey}
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
                  className={`${
                    isFormValid() ? "text-green-600" : "text-orange-600"
                  }`}
                >
                  {isFormValid()
                    ? "Ready to submit"
                    : "Missing required fields"}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {isFormValid()
                  ? "✓ All requirements met"
                  : `${getMissingFields().length} items remaining`}
              </div>
            </div>
            {!isFormValid() && (
              <div className="text-xs text-gray-500 mt-2">
                Required: Client name, Valid contact, Service type, Delivery
                date & time, At least 1 attachment, Client signature
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
              disabled={isLoading}
              className="px-6 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Draft Recovery Modal */}
        {showRecoveryModal && recoveredDraft && (
          <DraftRecoveryModal
            draft={recoveredDraft}
            onRecover={handleRecoverDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Submit Warning Modal */}
        {showSubmitWarning && (
          <SubmitWarningModal
            missingFields={getMissingFields()}
            onSaveDraft={handleSaveDraftFromWarning}
            onContinue={handleSubmitFromWarning}
            onCancel={() => setShowSubmitWarning(false)}
          />
        )}

        {/* Draft Status Indicator */}

        <DraftStatus
          lastSaved={lastSaved}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          isOnline={isOnline}
        />

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
