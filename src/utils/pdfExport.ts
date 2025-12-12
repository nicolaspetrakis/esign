import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextAnnotation } from '@/components/PDFViewer';

export async function exportPDFWithAnnotations(
  originalFile: File,
  annotations: TextAnnotation[]
): Promise<Blob> {
  // Load the original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  // Embed a font for the annotations
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Get all pages
  const pages = pdfDoc.getPages();
  
  // Add annotations to each page
  for (const annotation of annotations) {
    const pageIndex = annotation.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { height } = page.getSize();
    
    // PDF coordinates start from bottom-left, so we need to flip Y
    const pdfY = height - annotation.y;
    
    // Draw each line of text
    const lines = annotation.text.split('\n');
    let currentY = pdfY;
    
    for (const line of lines) {
      page.drawText(line, {
        x: annotation.x,
        y: currentY,
        size: annotation.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentY -= annotation.fontSize * 1.2; // Line height
    }
  }
  
  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();

  // Copy into a fresh ArrayBuffer to satisfy TypeScript's BlobPart type
  const buffer = new ArrayBuffer(pdfBytes.length);
  new Uint8Array(buffer).set(pdfBytes);
  return new Blob([buffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

