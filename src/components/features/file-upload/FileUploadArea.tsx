"use client";

import React, { useState, useRef } from 'react';
import PrivacyNotice from './PrivacyNotice';
import HowToGetData from './HowToGetData';
import { MultiFileProgress } from '../../../domain/metricsParser';

interface FileUploadAreaProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSampleLoad: () => void;
  isLoading: boolean;
  error: string | null;
  uploadProgress?: MultiFileProgress | null;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFileUpload,
  onSampleLoad,
  isLoading,
  error,
  uploadProgress,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < files.length; i++) {
          dataTransfer.items.add(files[i]);
        }
        fileInputRef.current.files = dataTransfer.files;
        
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PrivacyNotice />
      <HowToGetData />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Metrics File</h2>
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.ndjson"
            multiple
            onChange={onFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center space-y-2"
          >
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-gray-500">Accepted: .json, .ndjson (multiple files supported)</span>
          </label>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onSampleLoad}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Load Sample Report
          </button>
        </div>
        
        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex flex-col items-center space-y-2">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">
                  {uploadProgress && uploadProgress.totalFiles > 1
                    ? `Processing file ${uploadProgress.currentFile} of ${uploadProgress.totalFiles}...`
                    : 'Processing file...'}
                </span>
              </div>
              {uploadProgress && (
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{uploadProgress.fileName}</span>
                  <span className="mx-2">•</span>
                  <span>{uploadProgress.recordsProcessed.toLocaleString()} records processed</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadArea;
