'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ContextMenu from './ContextMenu';
import TextBox, { TextBoxData } from './TextBox';

// Set up the worker - use local copy from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  pdfFile: File;
  textBoxes: TextBoxData[];
  onTextBoxesChange: (textBoxes: TextBoxData[]) => void;
  scale: number;
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
}

export default function PDFViewer({
  pdfFile,
  textBoxes,
  onTextBoxesChange,
  scale,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pageNumber: number;
    pdfX: number;
    pdfY: number;
  } | null>(null);
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

    const timeoutId = setTimeout(() => {
      setRenderKey((k) => k + 1);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pdfDoc, pages, isLoading]);

  // Render pages when PDF is loaded, scale changes, or renderKey changes
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    const renderPage = async (pageNum: number) => {
      if (renderingRef.current.has(pageNum)) return;

      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      renderingRef.current.add(pageNum);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        if (!context) return;

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

    pages.forEach((pageData) => {
      renderPage(pageData.pageNumber);
    });
  }, [pdfDoc, pages, scale, renderKey]);

  const setCanvasRef = useCallback((pageNumber: number, el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNumber, el);
    }
  }, []);

  // Handle right-click to show context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, pageNumber: number) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const pdfX = (e.clientX - rect.left) / scale;
      const pdfY = (e.clientY - rect.top) / scale;

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        pageNumber,
        pdfX,
        pdfY,
      });
    },
    [scale]
  );

  // Handle click on PDF area (deselect)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the PDF canvas area, not on a text box
    if ((e.target as HTMLElement).tagName === 'DIV') {
      setSelectedId(null);
    }
  }, []);

  // Add a new text box
  const handleAddTextBox = useCallback(() => {
    if (!contextMenu) return;

    const newTextBox: TextBoxData = {
      id: `textbox-${Date.now()}`,
      x: contextMenu.pdfX,
      y: contextMenu.pdfY,
      width: 150,
      height: 30,
      text: '',
      fontSize: 14,
      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      fontWeight: 'normal',
      color: '#000000',
      pageNumber: contextMenu.pageNumber,
    };

    onTextBoxesChange([...textBoxes, newTextBox]);
    setSelectedId(newTextBox.id);
    setContextMenu(null);
  }, [contextMenu, textBoxes, onTextBoxesChange]);

  // Update a text box
  const handleTextBoxChange = useCallback(
    (updatedData: TextBoxData) => {
      onTextBoxesChange(
        textBoxes.map((tb) => (tb.id === updatedData.id ? updatedData : tb))
      );
    },
    [textBoxes, onTextBoxesChange]
  );

  // Delete a text box
  const handleDeleteTextBox = useCallback(
    (id: string) => {
      onTextBoxesChange(textBoxes.filter((tb) => tb.id !== id));
      setSelectedId(null);
    },
    [textBoxes, onTextBoxesChange]
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
        const pageTextBoxes = textBoxes.filter((tb) => tb.pageNumber === pageNumber);

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

            {/* Interactive overlay */}
            <div
              className="absolute inset-0"
              onClick={handleClick}
              onContextMenu={(e) => handleContextMenu(e, pageNumber)}
            />

            {/* Render text boxes */}
            {pageTextBoxes.map((textBox) => (
              <TextBox
                key={textBox.id}
                data={textBox}
                scale={scale}
                isSelected={selectedId === textBox.id}
                onSelect={() => setSelectedId(textBox.id)}
                onChange={handleTextBoxChange}
                onDelete={() => handleDeleteTextBox(textBox.id)}
              />
            ))}
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAddTextBox={handleAddTextBox}
        />
      )}
    </div>
  );
}

