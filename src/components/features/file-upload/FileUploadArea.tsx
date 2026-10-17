"use client";

import React, { useState, useRef } from 'react';
import { Banner, Button, Spinner } from '@primer/react';
import { FileIcon } from '@primer/octicons-react';
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
        <h1 className="text-xl font-semibold text-default mb-1">GitHub Copilot Usage Metrics</h1>
        <p className="text-sm text-muted">Upload your User Level metrics export to explore usage statistics</p>
      </div>

      <div className="rounded-lg border border-default bg-default">
        <div className="px-5 py-4 border-b border-default">
          <h2 className="text-sm font-semibold text-default">Upload metrics file</h2>
        </div>
        <div className="p-5 space-y-4">
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-accent-emphasis bg-accent-muted'
                : 'border-default hover:border-accent-emphasis hover:bg-muted'
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
            <svg className="mx-auto mb-3 w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-default">Drag &amp; drop files here, or click to browse</p>
            <p className="mt-1 text-xs text-muted">Accepts .ndjson and .json &mdash; multiple files supported</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-default" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 border-t border-default" />
          </div>

          <div className="text-center">
            <Button variant="primary" leadingVisual={FileIcon} onClick={onSampleLoad} disabled={isLoading}>
              Try with sample data
            </Button>
          </div>

          {isLoading && (
            <div role="status" className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner size="small" srText={null} />
                <span>
                  {uploadProgress && uploadProgress.totalFiles > 1
                    ? `Processing file ${uploadProgress.currentFile} of ${uploadProgress.totalFiles}\u2026`
                    : 'Processing file\u2026'}
                </span>
              </div>
              {uploadProgress && (
                <p className="text-xs text-muted">
                  <span className="font-medium text-default">{uploadProgress.fileName}</span>
                  <span className="mx-1.5 text-[var(--borderColor-default)]">·</span>
                  <span>{uploadProgress.recordsProcessed.toLocaleString()} records processed</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <Banner variant="critical" layout="compact" title="Upload failed" hideTitle description={error} />
          )}
        </div>
      </div>

      <HowToGetData />
      <PrivacyNotice />
    </div>
  );
};

export default FileUploadArea;
