'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ExportData,
  exportSummaryStatsCsv,
  exportUserSummariesCsv,
  exportLanguageStatsCsv,
  exportEngagementDataCsv,
  exportFullReportCsv,
  exportReportPdf,
} from '../../utils/exports';

interface ExportButtonProps {
  exportData: ExportData;
  fullWidth?: boolean;
}

type ExportOption = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (data: ExportData) => void;
};

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CsvIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PdfIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const exportOptions: ExportOption[] = [
  {
    id: 'full-csv',
    label: 'Full Report (CSV)',
    description: 'Complete metrics report with all data',
    icon: <CsvIcon />,
    action: (data) => exportFullReportCsv(
      data.stats,
      data.enterpriseName,
      data.userSummaries,
      data.languageStats,
      data.engagementData,
      data.chatUsersData,
      data.chatRequestsData
    ),
  },
  {
    id: 'pdf',
    label: 'Summary Report (PDF)',
    description: 'Printable summary with key metrics',
    icon: <PdfIcon />,
    action: (data) => exportReportPdf(
      data.stats,
      data.enterpriseName,
      data.userSummaries,
      data.languageStats,
      data.engagementData,
      data.chatUsersData,
      data.chatRequestsData
    ),
  },
  {
    id: 'summary-csv',
    label: 'Summary Stats (CSV)',
    description: 'Overview statistics only',
    icon: <CsvIcon />,
    action: (data) => exportSummaryStatsCsv(data.stats, data.enterpriseName),
  },
  {
    id: 'users-csv',
    label: 'User Data (CSV)',
    description: 'All user summaries',
    icon: <CsvIcon />,
    action: (data) => exportUserSummariesCsv(data.userSummaries, data.stats),
  },
  {
    id: 'languages-csv',
    label: 'Language Stats (CSV)',
    description: 'Language breakdown',
    icon: <CsvIcon />,
    action: (data) => exportLanguageStatsCsv(data.languageStats, data.stats),
  },
  {
    id: 'engagement-csv',
    label: 'Daily Engagement (CSV)',
    description: 'Day-by-day activity',
    icon: <CsvIcon />,
    action: (data) => exportEngagementDataCsv(data.engagementData, data.stats),
  },
];

const ExportButton: React.FC<ExportButtonProps> = ({ exportData, fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (option: ExportOption) => {
    option.action(exportData);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${fullWidth ? 'w-full' : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="inline-flex items-center gap-2">
          <DownloadIcon />
          Export
        </span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className={`absolute z-20 mt-2 w-64 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${fullWidth ? 'left-0' : 'right-0'}`}>
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Export Options</p>
            </div>
            {exportOptions.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleExport(option)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  index === 0 ? 'bg-blue-50 hover:bg-blue-100' : ''
                }`}
              >
                <span className={`mt-0.5 ${index === 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${index === 0 ? 'text-blue-900' : 'text-gray-900'}`}>
                    {option.label}
                  </p>
                  <p className={`text-xs ${index === 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
