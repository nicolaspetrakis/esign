'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DownloadModalProps {
  isOpen: boolean;
  defaultFilename: string;
  onClose: () => void;
  onConfirm: (filename: string) => void;
  isExporting: boolean;
}

export default function DownloadModal({
  isOpen,
  defaultFilename,
  onClose,
  onConfirm,
  isExporting,
}: DownloadModalProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename);
      // Focus and select the filename (without extension)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, defaultFilename]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, isExporting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filename.trim()) {
      // Ensure .pdf extension
      const finalName = filename.trim().endsWith('.pdf') 
        ? filename.trim() 
        : `${filename.trim()}.pdf`;
      onConfirm(finalName);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={isExporting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download PDF
            </h2>
            {!isExporting && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <label className="block text-sm font-medium mb-2">
                File name
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  disabled={isExporting}
                  placeholder="Enter filename"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors pr-12 disabled:opacity-50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  .pdf
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                The file will be downloaded to your default downloads folder.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!filename.trim() || isExporting}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

