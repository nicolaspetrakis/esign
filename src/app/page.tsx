'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { TextBoxData } from '@/components/TextBox';
import { exportPDFWithTextBoxes, downloadBlob } from '@/utils/pdfExport';

// Dynamic import to avoid SSR issues with PDF.js
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBoxData[]>([]);
  const [scale, setScale] = useState(1.5);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (file.type === 'application/pdf') {
      setPdfFile(file);
      setTextBoxes([]);
    } else {
      alert('Please upload a PDF file');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleExport = useCallback(async () => {
    if (!pdfFile) return;

    setIsExporting(true);
    try {
      const blob = await exportPDFWithTextBoxes(pdfFile, textBoxes);
      const filename = pdfFile.name.replace('.pdf', '_edited.pdf');
      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [pdfFile, textBoxes]);

  const handleNewDocument = useCallback(() => {
    setPdfFile(null);
    setTextBoxes([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">DocEdit</h1>
              <p className="text-xs text-text-muted">PDF Editor</p>
            </div>
          </div>

          {pdfFile && (
            <div className="flex items-center gap-4">
              {/* Zoom controls */}
              <div className="toolbar flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-elevated rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm font-mono text-text-muted min-w-[4rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-elevated rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Action buttons */}
              <button onClick={handleNewDocument} className="btn-secondary text-sm">
                New Document
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary text-sm flex items-center gap-2"
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
                    Download PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {!pdfFile ? (
          // Upload screen
          <div className="max-w-4xl mx-auto px-6 py-20">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-text-muted bg-clip-text text-transparent">
                Edit Your PDF Documents
              </h2>
              <p className="text-lg text-text-muted max-w-xl mx-auto">
                Upload a PDF, right-click to add text boxes, customize fonts and colors,
                then download your edited document.
              </p>
            </div>

            <div
              className={`drop-zone p-16 text-center cursor-pointer animate-fade-in-delay-1 ${
                isDragOver ? 'drag-over' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              aria-label="File upload area"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                aria-label="Upload PDF file"
                title="Upload PDF file"
                className="hidden"
              />

              <div className="mb-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-elevated flex items-center justify-center mb-4">
                  <svg
                    className="w-10 h-10 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-text-muted">
                  or click to browse files
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  PDF files only
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Processed locally
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  100% private
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <div className="p-6 rounded-xl bg-surface border border-border animate-fade-in-delay-1">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Right-Click to Add</h3>
                <p className="text-sm text-text-muted">
                  Right-click anywhere to add a text box. Drag to move, resize with the handle.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-surface border border-border animate-fade-in-delay-2">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Customize Text</h3>
                <p className="text-sm text-text-muted">
                  Change font, size, color, and style. Make your edits look exactly right.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-surface border border-border animate-fade-in-delay-3">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Download Edited PDF</h3>
                <p className="text-sm text-text-muted">
                  Export your edited document as a new PDF with all text boxes embedded.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // PDF Editor
          <div className="bg-surface-elevated min-h-[calc(100vh-73px)]">
            {/* Document info bar */}
            <div className="bg-surface border-b border-border px-6 py-3">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">{pdfFile.name}</span>
                  <span className="text-sm text-text-muted">
                    ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="text-sm text-text-muted">
                  {textBoxes.length} text box{textBoxes.length !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-accent/10 border-b border-accent/20 px-6 py-2">
              <div className="max-w-7xl mx-auto">
                <p className="text-sm text-accent flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Tip:</strong> Right-click to add a text box. Double-click to edit text.
                    Drag to move, use the corner handle to resize.
                  </span>
                </p>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="overflow-auto">
              <PDFViewer
                pdfFile={pdfFile}
                textBoxes={textBoxes}
                onTextBoxesChange={setTextBoxes}
                scale={scale}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-text-muted">
          <p>All processing happens in your browser. Your documents never leave your device.</p>
        </div>
      </footer>
    </div>
  );
}
