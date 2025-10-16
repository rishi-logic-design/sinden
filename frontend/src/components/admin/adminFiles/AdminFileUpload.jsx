import React, { useState } from "react";
import {
  FileText,
  Eye,
  Trash2,
  Download,
  CloudUpload,
} from "lucide-react";

export default function AdminFileUpload({
  files = [],
  onFilesChange,
  onPreview,
  onError = () => {},
  onSuccess = () => {},
  onDelete = null,
  onDownload = null,
  disabled = false,
}) {
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (file.size > maxSize) return "File size must be less than 10MB";
    if (!allowedTypes.includes(file.type))
      return "Only JPEG, PNG, and PDF files are allowed";
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
    if (fileObj.url && fileObj.url.startsWith("blob:")) {
      URL.revokeObjectURL(fileObj.url);
    }
    
    if (fileObj.status === "uploaded") {
      if (onDelete) onDelete(fileObj);
    } else {
      onFilesChange(files.filter((f) => f.id !== fileObj.id));
    }
  };

  const openPreview = (fileObj) => {
    if (!fileObj) return;
    let previewUrl = fileObj.url;
    if (fileObj.type === "application/pdf" && !previewUrl && fileObj.file) {
      previewUrl = URL.createObjectURL(fileObj.file);
    }
    if (previewUrl) {
      onPreview({ url: previewUrl, name: fileObj.name, type: fileObj.type });
    }
  };

  const handleInputFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-2">
        Attached documents
      </label>
      <div className="space-y-2">
        {files.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className={`rounded border-2 border-dashed p-4 transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <CloudUpload className="w-5 h-5" />
              <span>Drag & drop files here, or</span>
              <label className="text-blue-600 underline cursor-pointer">
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
          </div>
        )}

        {files.map((fileObj) => (
          <div
            key={fileObj.id}
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-md border border-blue-200"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">
                {fileObj.name}
              </p>
              <p className="text-xs text-blue-500">
                {Math.round((fileObj.size || 0) / 1024)} KB
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(fileObj.type === "application/pdf" || fileObj.url) && (
                <button
                  onClick={() => openPreview(fileObj)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <Download 
                className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800" 
                onClick={() => onDownload && onDownload(fileObj)}
              />
              <button
                onClick={() => removeFile(fileObj)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {files.length > 0 && (
          <label className="text-blue-600 underline cursor-pointer text-sm">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleInputFiles}
              disabled={disabled}
              accept="image/jpeg,image/png,image/jpg,application/pdf"
            />
            + Add more documents
          </label>
        )}
      </div>
    </div>
  );
}