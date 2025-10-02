import { useState, useEffect, useCallback } from 'react';

// Draft Manager Hook - Auto-saves form data with offline support
export const useDraftManager = (formData, files, signature) => {
    const [draftId, setDraftId] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Check if form has minimum data for draft
    const hasMinimumData = useCallback(() => {
        return formData.clientName?.trim().length > 0 ||
            formData.contact?.trim().length > 0 ||
            formData.serviceType?.length > 0;
    }, [formData]);

    // Save draft to localStorage (offline backup)
    const saveToLocalStorage = useCallback((data) => {
        try {
            const draftData = {
                formData: data.formData,
                files: data.files.map(f => ({ name: f.name, size: f.size, type: f.type })),
                hasSignature: !!data.signature,
                timestamp: new Date().toISOString(),
                draftId: data.draftId
            };
            localStorage.setItem('order_draft_backup', JSON.stringify(draftData));
            return true;
        } catch (error) {
            console.error('Failed to save draft to localStorage:', error);
            return false;
        }
    }, []);

    // Load draft from localStorage
    const loadFromLocalStorage = useCallback(() => {
        try {
            const saved = localStorage.getItem('order_draft_backup');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load draft from localStorage:', error);
        }
        return null;
    }, []);

    // Auto-save draft
    const autoSaveDraft = useCallback(async () => {
        if (!hasMinimumData() || isSaving) return;

        setIsSaving(true);
        setHasUnsavedChanges(false);

        const draftData = {
            formData,
            files,
            signature,
            draftId
        };

        // Always save to localStorage first (offline backup)
        saveToLocalStorage(draftData);

        // Try to save to backend if online
        try {
            const response = await fetch('/api/drafts/auto-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: draftId,
                    data: draftData
                })
            });

            if (response.ok) {
                const result = await response.json();
                setDraftId(result.draftId);
                setLastSaved(new Date());
            }
        } catch (error) {
            console.log('Offline mode: Draft saved locally');
        } finally {
            setIsSaving(false);
        }
    }, [formData, files, signature, draftId, hasMinimumData, isSaving, saveToLocalStorage]);

    // Delete draft
    const deleteDraft = useCallback(async () => {
        localStorage.removeItem('order_draft_backup');
        if (draftId) {
            try {
                await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' });
            } catch (error) {
                console.error('Failed to delete draft from server:', error);
            }
        }
        setDraftId(null);
        setLastSaved(null);
    }, [draftId]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (hasMinimumData()) {
            const timer = setTimeout(() => {
                autoSaveDraft();
            }, 30000);

            return () => clearTimeout(timer);
        }
    }, [formData, files, signature, autoSaveDraft, hasMinimumData]);

    // Mark as having unsaved changes
    useEffect(() => {
        if (hasMinimumData()) {
            setHasUnsavedChanges(true);
        }
    }, [formData, files, signature, hasMinimumData]);

    // Save before unload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasMinimumData() && hasUnsavedChanges) {
                autoSaveDraft();
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasMinimumData, hasUnsavedChanges, autoSaveDraft]);

    return {
        draftId,
        lastSaved,
        isSaving,
        hasUnsavedChanges,
        loadFromLocalStorage,
        autoSaveDraft,
        deleteDraft,
        hasMinimumData: hasMinimumData()
    };
};

// Draft Status Indicator Component
export const DraftStatus = ({ lastSaved, isSaving, hasUnsavedChanges }) => {
    if (!lastSaved && !isSaving && !hasUnsavedChanges) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
            {isSaving && (
                <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Saving draft...</span>
                </>
            )}
            {!isSaving && lastSaved && (
                <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                        Saved {new Date(lastSaved).toLocaleTimeString()}
                    </span>
                </>
            )}
            {!isSaving && hasUnsavedChanges && !lastSaved && (
                <>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Unsaved changes</span>
                </>
            )}
        </div>
    );
};

// Draft Recovery Modal
export const DraftRecoveryModal = ({ draftData, onRecover, onDiscard }) => {
    if (!draftData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Recover Draft Order?
                </h2>
                <p className="text-gray-600 mb-4">
                    We found an unsaved draft from{' '}
                    {new Date(draftData.timestamp).toLocaleString()}
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Draft contains:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        {draftData.formData?.clientName && (
                            <li>• Client: {draftData.formData.clientName}</li>
                        )}
                        {draftData.formData?.contact && (
                            <li>• Contact: {draftData.formData.contact}</li>
                        )}
                        {draftData.formData?.serviceType && (
                            <li>• Service: {draftData.formData.serviceType}</li>
                        )}
                        {draftData.files?.length > 0 && (
                            <li>• Attachments: {draftData.files.length} file(s)</li>
                        )}
                        {draftData.hasSignature && <li>• Signature included</li>}
                    </ul>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Start Fresh
                    </button>
                    <button
                        onClick={onRecover}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Recover Draft
                    </button>
                </div>
            </div>
        </div>
    );
};

// Submit Warning Modal
export const SubmitWarningModal = ({ missingFields, onSaveDraft, onContinue, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Incomplete Form</h2>
                </div>

                <p className="text-gray-600 mb-4">
                    The form is missing required information:
                </p>

                <div className="bg-orange-50 rounded-lg p-4 mb-6">
                    <ul className="text-sm text-gray-700 space-y-1">
                        {missingFields.map((field, index) => (
                            <li key={index}>• {field}</li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Would you like to save this as a draft and complete it later, or fill in the missing information now?
                </p>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={onSaveDraft}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Save as Draft
                    </button>
                    <button
                        onClick={onContinue}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Fill Missing Information
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default {
    useDraftManager,
    DraftStatus,
    DraftRecoveryModal,
    SubmitWarningModal
};