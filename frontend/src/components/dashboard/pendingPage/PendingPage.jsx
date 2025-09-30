import React from "react";
import LoadingOverlay from "../LoadingOverlay";

export default function PendingPage({ onBack = () => { } }) {
    return (
        <LoadingOverlay>
        <div className="min-h-screen w-full p-8 bg-gray-50">
            <div className="max-w-[1200px] mx-auto h-[80vh] flex flex-col  gap-6">

                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                    Back to Create Order
                </button>
            </div>
        </div>
        </LoadingOverlay>
    );
}
