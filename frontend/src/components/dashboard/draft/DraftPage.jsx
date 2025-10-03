import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../../services/ApiService';
import useToast from '../../../hooks/UseToast';
import Toast from '../Toast';
import LoadingOverlay from '../LoadingOverlay';

export default function DraftsPage() {
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDrafts, setSelectedDrafts] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'auto', 'draft'
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState(null);

    const navigate = useNavigate();
    const { toasts, showSuccess, showError, removeToast } = useToast();

    useEffect(() => {
        loadDrafts();
    }, [filterStatus]);

    const loadDrafts = async () => {
        setIsLoading(true);
        try {
            const status = filterStatus === 'all' ? null : filterStatus;
            const result = await ApiService.getDrafts(status);

            if (result?.success) {
                setDrafts(result.drafts || []);
            } else {
                setDrafts([]);
            }
        } catch (error) {
            console.error('Failed to load drafts:', error);
            showError('Failed to load drafts');
            setDrafts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            loadDrafts();
            return;
        }

        setIsLoading(true);
        try {
            const result = await ApiService.searchDrafts(searchTerm);
            if (result?.success) {
                setDrafts(result.drafts || []);
            }
        } catch (error) {
            showError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueDraft = (draft) => {
        navigate('/orders/new', { state: { draft } });
    };

    const handleDeleteDraft = async (draftId) => {
        try {
            await ApiService.deleteDraft(draftId);
            showSuccess('Draft deleted successfully');
            loadDrafts();
            setShowDeleteModal(false);
            setDraftToDelete(null);
        } catch (error) {
            showError('Failed to delete draft');
        }
    };

    const handleDeleteMultiple = async () => {
        if (selectedDrafts.length === 0) return;

        setIsLoading(true);
        try {
            await Promise.all(
                selectedDrafts.map(id => ApiService.deleteDraft(id))
            );
            showSuccess(`${selectedDrafts.length} drafts deleted`);
            setSelectedDrafts([]);
            loadDrafts();
        } catch (error) {
            showError('Failed to delete some drafts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDraft = (draftId) => {
        setSelectedDrafts(prev => {
            if (prev.includes(draftId)) {
                return prev.filter(id => id !== draftId);
            } else {
                return [...prev, draftId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedDrafts.length === drafts.length) {
            setSelectedDrafts([]);
        } else {
            setSelectedDrafts(drafts.map(d => d.id));
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    const getDraftInfo = (draft) => {
        const formData = draft.form_data || {};
        const filesMeta = draft.files_meta || [];

        return {
            clientName: formData.clientName || 'Unnamed',
            contact: formData.contact || 'No contact',
            serviceType: formData.serviceType || 'No service',
            filesCount: filesMeta.length,
            hasSignature: draft.has_signature,
            isAutoSave: draft.status === 'auto',
        };
    };

    return (
        <LoadingOverlay isLoading={isLoading}>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Drafts</h1>
                        <p className="text-gray-600">
                            Manage your saved and auto-saved order drafts
                        </p>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {/* Search */}
                            <div className="flex-1 w-full md:max-w-md">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search by client name or contact..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <svg
                                        className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Filter */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterStatus('draft')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'draft'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Manual Saves
                                </button>
                                <button
                                    onClick={() => setFilterStatus('auto')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'auto'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Auto-Saved
                                </button>
                            </div>

                            {/* Bulk Actions */}
                            {selectedDrafts.length > 0 && (
                                <button
                                    onClick={handleDeleteMultiple}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                                >
                                    Delete ({selectedDrafts.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Drafts List */}
                    {drafts.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                            <svg
                                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts found</h3>
                            <p className="text-gray-600 mb-6">
                                Start creating an order and it will be auto-saved here
                            </p>
                            <button
                                onClick={() => navigate('/orders/new')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                Create New Order
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Select All */}
                            <div className="flex items-center gap-2 px-4">
                                <input
                                    type="checkbox"
                                    checked={selectedDrafts.length === drafts.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-600">Select all</span>
                            </div>

                            {/* Draft Cards */}
                            {drafts.map((draft) => {
                                const info = getDraftInfo(draft);
                                return (
                                    <div
                                        key={draft.id}
                                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedDrafts.includes(draft.id)}
                                                onChange={() => handleSelectDraft(draft.id)}
                                                className="w-5 h-5 mt-1 rounded border-gray-300"
                                            />

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                            {info.clientName}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">{info.contact}</p>
                                                    </div>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${info.isAutoSave
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                            }`}
                                                    >
                                                        {info.isAutoSave ? 'Auto-saved' : 'Manual save'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>{info.serviceType}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                        <span>{info.filesCount} file(s)</span>
                                                    </div>
                                                    {info.hasSignature && (
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            <span>Signature</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(draft.last_modified)}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleContinueDraft(draft)}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                                                        >
                                                            Continue
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDraftToDelete(draft);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && draftToDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Delete Draft?</h2>
                            </div>

                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this draft? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDraftToDelete(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteDraft(draftToDelete.id)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
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