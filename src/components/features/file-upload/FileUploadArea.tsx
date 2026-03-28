"use client";

import React, { useState, useRef } from 'react';
import PrivacyNotice from './PrivacyNotice';
import HowToGetData from './HowToGetData';
import { MultiFileProgress } from '../../../infra/metricsFileParser';

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
    <div className="max-w-2xl mx-auto space-y-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-xl font-semibold text-[#24292f] mb-1">GitHub Copilot Usage Metrics</h1>
        <p className="text-sm text-[#57606a]">Upload your User Level metrics export to explore usage statistics</p>
      </div>

      <div className="rounded-lg border border-[#d0d7de] bg-white">
        <div className="px-5 py-4 border-b border-[#d0d7de]">
          <h2 className="text-sm font-semibold text-[#24292f]">Upload metrics file</h2>
        </div>
        <div className="p-5 space-y-4">
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-[#0969da] bg-[#ddf4ff]'
                : 'border-[#d0d7de] hover:border-[#0969da] hover:bg-[#f6f8fa]'
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload metrics files by dragging and dropping or browsing your device"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <label htmlFor="file-upload" className="sr-only">
              Upload metrics file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ndjson,.json"
              multiple
              onChange={onFileUpload}
              className="hidden"
              id="file-upload"
            />
            <svg className="mx-auto mb-3 w-10 h-10 text-[#57606a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-[#24292f]">Drag &amp; drop files here, or click to browse</p>
            <p className="mt-1 text-xs text-[#57606a]">Accepts .ndjson and .json &mdash; multiple files supported</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-[#d0d7de]" />
            <span className="text-xs text-[#57606a]">or</span>
            <div className="flex-1 border-t border-[#d0d7de]" />
          </div>

          <div className="text-center">
            <button
              onClick={onSampleLoad}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md border border-[#218739] bg-[#2da44e] text-white hover:bg-[#2c974b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Try with sample data
            </button>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2 text-sm text-[#57606a]">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#d0d7de] border-t-[#0969da]" />
                <span>
                  {uploadProgress && uploadProgress.totalFiles > 1
                    ? `Processing file ${uploadProgress.currentFile} of ${uploadProgress.totalFiles}\u2026`
                    : 'Processing file\u2026'}
                </span>
              </div>
              {uploadProgress && (
                <p className="text-xs text-[#57606a]">
                  <span className="font-medium text-[#24292f]">{uploadProgress.fileName}</span>
                  <span className="mx-1.5 text-[#d0d7de]">·</span>
                  <span>{uploadProgress.recordsProcessed.toLocaleString()} records processed</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[#ff818266] bg-[#ffebe9] px-3 py-2">
              <svg className="w-4 h-4 text-[#cf222e] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-[#cf222e]">{error}</p>
            </div>
          )}
        </div>
      </div>

      <HowToGetData />
      <PrivacyNotice />
    </div>
  );
};

export default FileUploadArea;
