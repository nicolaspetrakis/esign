'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - use local copy from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  pageNumber: number;
  fontSize: number;
}

interface PDFViewerProps {
  pdfFile: File;
  annotations: TextAnnotation[];
  onAnnotationsChange: (annotations: TextAnnotation[]) => void;
  scale: number;
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
}

export default function PDFViewer({
  pdfFile,
  annotations,
  onAnnotationsChange,
  scale,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true);
      canvasRefs.current.clear();
      
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);

        // Get dimensions of all pages
        const pageDataList: PageData[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          pageDataList.push({
            pageNumber: i,
            width: viewport.width,
            height: viewport.height,
          });
        }
        setPages(pageDataList);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfFile]);

  // Trigger render after canvases are mounted
  useEffect(() => {
    if (!pdfDoc || pages.length === 0 || isLoading) return;

    // Wait for next frame to ensure canvases are in the DOM
    const timeoutId = setTimeout(() => {
      setRenderKey((k) => k + 1);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pdfDoc, pages, isLoading]);

  // Render pages when PDF is loaded, scale changes, or renderKey changes
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    const renderPage = async (pageNum: number) => {
      // Prevent concurrent renders of the same page
      if (renderingRef.current.has(pageNum)) return;
      
      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      renderingRef.current.add(pageNum);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;
      } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
      } finally {
        renderingRef.current.delete(pageNum);
      }
    };

    // Render all pages
    pages.forEach((pageData) => {
      renderPage(pageData.pageNumber);
    });
  }, [pdfDoc, pages, scale, renderKey]);

  const setCanvasRef = useCallback((pageNumber: number, el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNumber, el);
    }
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      // Check if clicking on existing annotation
      const clickedAnnotation = annotations.find(
        (ann) =>
          ann.pageNumber === pageNumber &&
          Math.abs(ann.x - x) < 50 &&
          Math.abs(ann.y - y) < 20
      );

      if (clickedAnnotation) {
        setEditingId(clickedAnnotation.id);
        return;
      }

      // Create new annotation
      const newAnnotation: TextAnnotation = {
        id: `annotation-${Date.now()}`,
        x,
        y,
        text: '',
        pageNumber,
        fontSize: 14,
      };

      onAnnotationsChange([...annotations, newAnnotation]);
      setEditingId(newAnnotation.id);
    },
    [annotations, onAnnotationsChange, scale]
  );

  const handleAnnotationChange = useCallback(
    (id: string, text: string) => {
      onAnnotationsChange(
        annotations.map((ann) => (ann.id === id ? { ...ann, text } : ann))
      );
    },
    [annotations, onAnnotationsChange]
  );

  const handleAnnotationBlur = useCallback(
    (id: string) => {
      const annotation = annotations.find((ann) => ann.id === id);
      if (annotation && annotation.text.trim() === '') {
        // Remove empty annotations
        onAnnotationsChange(annotations.filter((ann) => ann.id !== id));
      }
      setEditingId(null);
    },
    [annotations, onAnnotationsChange]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      onAnnotationsChange(annotations.filter((ann) => ann.id !== id));
      setEditingId(null);
    },
    [annotations, onAnnotationsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Escape') {
        handleAnnotationBlur(id);
      } else if (e.key === 'Delete' && e.shiftKey) {
        handleDeleteAnnotation(id);
      }
    },
    [handleAnnotationBlur, handleDeleteAnnotation]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-text-muted">Loading PDF...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-8 py-8">
      {pages.map((pageData, index) => {
        const { pageNumber, width, height } = pageData;
        const pageAnnotations = annotations.filter(
          (ann) => ann.pageNumber === pageNumber
        );

        return (
          <div
            key={pageNumber}
            className="pdf-page-container animate-fade-in relative"
            style={{
              animationDelay: `${index * 0.1}s`,
              width: width * scale,
              height: height * scale,
            }}
          >
            {/* Page number indicator */}
            <div className="absolute -top-8 left-0 page-indicator">
              Page {pageNumber} of {pages.length}
            </div>

            {/* Canvas for PDF rendering */}
            <canvas
              ref={(el) => setCanvasRef(pageNumber, el)}
              className="bg-white block"
              style={{
                width: width * scale,
                height: height * scale,
              }}
            />

            {/* Clickable overlay for adding annotations */}
            <div
              className="absolute inset-0 cursor-crosshair"
              onClick={(e) => handleCanvasClick(e, pageNumber)}
            />

            {/* Render annotations */}
            {pageAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                style={{
                  position: 'absolute',
                  left: annotation.x * scale,
                  top: annotation.y * scale,
                  transform: 'translate(-2px, -50%)',
                }}
              >
                {editingId === annotation.id ? (
                  <textarea
                    autoFocus
                    className="annotation-input"
                    value={annotation.text}
                    onChange={(e) =>
                      handleAnnotationChange(annotation.id, e.target.value)
                    }
                    onBlur={() => handleAnnotationBlur(annotation.id)}
                    onKeyDown={(e) => handleKeyDown(e, annotation.id)}
                    style={{
                      fontSize: annotation.fontSize * scale,
                      minWidth: 100 * scale,
                    }}
                    placeholder="Type here..."
                    rows={1}
                  />
                ) : (
                  <div
                    className="annotation-text group"
                    style={{
                      fontSize: annotation.fontSize * scale,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(annotation.id);
                    }}
                  >
                    {annotation.text}
                    <button
                      className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(annotation.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
