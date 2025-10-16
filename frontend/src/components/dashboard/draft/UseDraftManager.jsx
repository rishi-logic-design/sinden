// hooks/useDraftManager.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import ApiService from "../../../services/ApiService";

export const useDraftManager = (formData, files, signature, pricingData) => {
  const [draftId, setDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isMountedRef = useRef(true);
  const saveTimerRef = useRef(null);
  const lastSaveDataRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check if form has minimum data to save
  const hasMinimumData = useCallback(() => {
    const cn = formData?.clientName?.trim?.() || "";
    const ct = formData?.contact?.trim?.() || "";
    const st = formData?.serviceType || "";
    return cn.length > 0 || ct.length > 0 || st.length > 0;
  }, [formData]);

  // Build snapshot of current form state
  const buildSnapshot = useCallback(() => {
    return {
      formData,
      files: (files || []).map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      signature: !!signature,
      pricingData: pricingData || null,
    };
  }, [formData, files, signature, pricingData]);

  // Check if data has changed since last save
  const hasDataChanged = useCallback(() => {
    if (!lastSaveDataRef.current) return true;

    const current = JSON.stringify(buildSnapshot());
    const last = JSON.stringify(lastSaveDataRef.current);
    return current !== last;
  }, [buildSnapshot]);

  // Auto-save to server
  const autoSaveToServer = useCallback(async () => {
    if (!hasMinimumData() || isSaving || !isOnline) return;
    if (!hasDataChanged()) return;

    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      const snapshot = buildSnapshot();
      const result = await ApiService.autoSaveDraft(draftId, snapshot);

      if (result?.success && result?.draftId && isMountedRef.current) {
        setDraftId(result.draftId);
        setLastSaved(new Date());
        lastSaveDataRef.current = snapshot;
      }
    } catch (error) {
      console.warn("Auto-save failed:", error.message);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    draftId,
    hasMinimumData,
    isSaving,
    isOnline,
    buildSnapshot,
    hasDataChanged,
  ]);

  // Debounced auto-save (12 seconds after changes)
  useEffect(() => {
    if (!hasMinimumData() || !isOnline) return;

    setHasUnsavedChanges(true);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      autoSaveToServer();
    }, 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    formData,
    files,
    signature,
    pricingData,
    hasMinimumData,
    isOnline,
    autoSaveToServer,
  ]);

  // Safety net: Save every 40 seconds if unsaved changes
  useEffect(() => {
    if (!hasMinimumData() || !isOnline) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        autoSaveToServer();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [hasMinimumData, isOnline, hasUnsavedChanges, isSaving, autoSaveToServer]);

  // Manual save (returns draft ID for navigation)
 const saveDraftManually = useCallback(async () => {
    if (!hasMinimumData()) {
        throw new Error('Client name is required to save draft');
    }

    setIsSaving(true);

    try {
        const snapshot = buildSnapshot();
        const result = await ApiService.saveDraft(snapshot);

        if (result?.success && isMountedRef.current) {
            const newDraftId = result.draftId || result.draft?.id;
            setDraftId(newDraftId);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            lastSaveDataRef.current = snapshot;
            return result;
        }

        throw new Error(result?.error || 'Failed to save draft');
    } catch (error) {
        console.error('Save draft failed:', error);
        throw error;
    } finally {
        if (isMountedRef.current) {
            setIsSaving(false);
        }
    }
}, [hasMinimumData, buildSnapshot]);

  // Delete draft
  const deleteDraft = useCallback(
    async (idOverride) => {
      const id = idOverride ?? draftId;
      if (!id) return;

      try {
        await ApiService.deleteDraft(id);
      } catch (error) {
        console.error("Failed to delete draft:", error);
      }

      if (isMountedRef.current) {
        setDraftId(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        lastSaveDataRef.current = null;
      }
    },
    [draftId]
  );

  // Force immediate save
  const forceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    autoSaveToServer();
  }, [autoSaveToServer]);

  // Clear all auto-backups (call after order submission)
  const clearAutoBackup = useCallback(async () => {
    try {
      if (draftId) {
        await ApiService.deleteDraft(draftId);
      }
      await ApiService.deleteAllAutoSaves();

      if (isMountedRef.current) {
        setDraftId(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        lastSaveDataRef.current = null;
      }
    } catch (error) {
      console.error("Failed to clear auto-backup:", error);
    }
  }, [draftId]);

  return {
    draftId,
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    isOnline,
    hasMinimumData: hasMinimumData(),
    saveDraftManually,
    deleteDraft,
    forceSave,
    clearAutoBackup,
  };
};

// Draft Status Indicator Component
export const DraftStatus = ({
  lastSaved,
  isSaving,
  hasUnsavedChanges,
  isOnline,
}) => {
  if (!lastSaved && !isSaving && !hasUnsavedChanges) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 z-50">
      {!isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">
            Offline - Changes saved locally
          </span>
        </>
      ) : isSaving ? (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm text-gray-600">Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">
            Saved {new Date(lastSaved).toLocaleTimeString()}
          </span>
        </>
      ) : hasUnsavedChanges ? (
        <>
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm text-gray-600">Unsaved changes</span>
        </>
      ) : null}
    </div>
  );
};

// Draft Recovery Modal Component
export const DraftRecoveryModal = ({ draft, onRecover, onDiscard }) => {
    if (!draft) return null;

    const formData = draft.form_data || {};
    const filesMeta = draft.files_meta || [];
    const pricingData = draft.pricingData;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Recover Draft?</h2>
                        <p className="text-sm text-gray-500">
                            Last saved: {new Date(draft.last_modified || draft.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>

                <p className="text-gray-600 mb-4">
                    We found an unsaved draft from your previous session. Would you like to continue where you left off?
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Draft contains:</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        {formData.clientName && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Client: {formData.clientName}</span>
                            </li>
                        )}
                        {formData.contact && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Contact: {formData.contact}</span>
                            </li>
                        )}
                        {formData.serviceType && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Service: {formData.serviceType}</span>
                            </li>
                        )}
                        {filesMeta.length > 0 && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Attachments: {filesMeta.length} file(s)</span>
                            </li>
                        )}
                        {draft.has_signature && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Signature included</span>
                            </li>
                        )}
                        {pricingData?.pricing?.total > 0 && (
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>Pricing: ${pricingData.pricing.total.toFixed(2)}</span>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onRecover(draft)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Recover Draft
                    </button>
                    <button
                        onClick={onDiscard}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                        Start Fresh
                    </button>
                </div>
            </div>
        </div>
    );
};

// Submit Warning Modal Component
export const SubmitWarningModal = ({
  missingFields,
  onSaveDraft,
  onContinue,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Incomplete Form</h2>
        </div>

        <p className="text-gray-600 mb-4">
          The following required information is missing:
        </p>

        <div className="bg-orange-50 rounded-lg p-4 mb-6">
          <ul className="text-sm text-gray-700 space-y-1">
            {missingFields.map((field, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>{field}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          You can save this as a draft and complete it later, or fill in the
          missing information now.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveDraft}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={onContinue}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Fill Missing Information
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
