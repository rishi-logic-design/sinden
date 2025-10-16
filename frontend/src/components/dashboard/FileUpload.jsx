import React, { useState } from "react";
import {
  FileText,
  Check,
  Eye,
  Trash2,
  Download,
  CloudUpload,
} from "lucide-react";

export default function FileUpload({
  files = [],
  onFilesChange,
  onPreview,
  onError = () => { },
  onSuccess = () => { },
  disabled = false,
}) {
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }

    if (!allowedTypes.includes(file.type)) {
      return "Only JPEG, PNG, and PDF files are allowed";
    }

    return null;
  };

  const addFiles = (fileList) => {
    if (!fileList.length || disabled) return;

    const validFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      onError(errors.join(", "));
      return;
    }

    const newFiles = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "ready",
    }));

    onFilesChange([...files, ...newFiles]);
    onSuccess(`${validFiles.length} file(s) added successfully`);
  };

  const removeFile = (fileObj) => {
    // Revoke object URL if it exists to prevent memory leaks
    if (fileObj.url && fileObj.url.startsWith("blob:")) {
      URL.revokeObjectURL(fileObj.url);
    }
    onFilesChange(files.filter((f) => f.id !== fileObj.id));
  };

  const openPreview = (fileObj) => {
    if (!fileObj) return;

    let previewUrl = fileObj.url;

    // For PDF without preview URL, create one
    if (fileObj.type === "application/pdf" && !previewUrl && fileObj.file) {
      previewUrl = URL.createObjectURL(fileObj.file);
    }

    if (previewUrl) {
      onPreview({
        url: previewUrl,
        name: fileObj.name,
        type: fileObj.type,
      });
    }
  };

  const handleInputFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = null; // Reset input
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Attachments
      </label>

      {/* Files list */}
      <div className="mt-6 mb-4 space-y-3">
        {files.length === 0 && (
          <div className="text-sm text-gray-500">
            No attachments (at least one required)
          </div>
        )}

        {files.map((fileObj) => (
          <div
            key={fileObj.id}
            className="flex items-center justify-between bg-white border rounded p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center text-gray-400">
                <FileText className="w-5 h-5" />
              </div>

              <div className="text-sm">
                <div className="text-blue-700 font-medium">{fileObj.name}</div>
                <div className="text-xs text-gray-400">
                  {Math.round((fileObj.size || 0) / 1024)} KB
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Ready
              </div>

              {/* Preview button for supported files */}
              {(fileObj.type === "application/pdf" || fileObj.url) && (
                <button
                  onClick={() => openPreview(fileObj)}
                  className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                  disabled={disabled}
                >
                  <Eye className="w-4 h-4" /> View
                </button>
              )}

              {/* Download button */}
              {fileObj.url && (
                <a
                  href={fileObj.url}
                  download={fileObj.name}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeFile(fileObj)}
                className="text-gray-400 hover:text-red-500"
                disabled={disabled}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`rounded border-2 border-dashed p-4 transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <CloudUpload className="w-5 h-5" />
          <span>Drag & drop files here, or</span>
          <label
            className={`text-blue-600 underline ${disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleInputFiles}
              disabled={disabled}
              accept="image/jpeg,image/png,image/jpg,application/pdf"
            />
            + Add document
          </label>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          JPEG, PNG, PDF up to 10MB
        </div>
      </div>


    </div>
  );
}
