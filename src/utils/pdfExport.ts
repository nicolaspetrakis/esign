import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextBoxData } from '@/components/TextBox';

// Convert hex color to RGB values (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

export async function exportPDFWithTextBoxes(
  originalFile: File,
  textBoxes: TextBoxData[]
): Promise<Blob> {
  // Load the original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Get all pages
  const pages = pdfDoc.getPages();

  // Add text boxes to each page
  for (const textBox of textBoxes) {
    const pageIndex = textBox.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    if (!textBox.text.trim()) continue;

    const page = pages[pageIndex];
    const { height } = page.getSize();

    // Select font based on fontFamily and fontWeight
    let font = helvetica;
    const isBold = textBox.fontWeight === 'bold';
    
    if (textBox.fontFamily.includes('serif') && !textBox.fontFamily.includes('sans')) {
      font = isBold ? timesRomanBold : timesRoman;
    } else if (textBox.fontFamily.includes('mono')) {
      font = isBold ? courierBold : courier;
    } else {
      font = isBold ? helveticaBold : helvetica;
    }

    // Convert color
    const color = hexToRgb(textBox.color);

    // PDF coordinates start from bottom-left, so we need to flip Y
    // Also account for the text box height and add padding
    const pdfY = height - textBox.y - textBox.fontSize;

    // Draw each line of text
    const lines = textBox.text.split('\n');
    let currentY = pdfY;

    for (const line of lines) {
      page.drawText(line, {
        x: textBox.x + 4, // Add padding to match the UI
        y: currentY,
        size: textBox.fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
      currentY -= textBox.fontSize * 1.2; // Line height
    }
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();

  // Create a fresh ArrayBuffer to satisfy TypeScript's BlobPart type
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
