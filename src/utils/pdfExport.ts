import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextBoxData } from '@/components/TextBox';
import type { SignatureData } from '@/components/Signature';

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

export async function exportPDFWithAnnotations(
  originalFile: File,
  textBoxes: TextBoxData[],
  signatures: SignatureData[]
): Promise<Blob> {
  // Load the original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRomanBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
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
    const pdfY = height - textBox.y - textBox.fontSize;

    // Draw each line of text
    const lines = textBox.text.split('\n');
    let currentY = pdfY;

    for (const line of lines) {
      page.drawText(line, {
        x: textBox.x + 4,
        y: currentY,
        size: textBox.fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
      currentY -= textBox.fontSize * 1.2;
    }
  }

  // Add signatures to each page
  // Note: Since pdf-lib doesn't support custom fonts, we use italic Times Roman
  // for a more signature-like appearance
  for (const signature of signatures) {
    const pageIndex = signature.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height } = page.getSize();

    // Calculate font size based on signature dimensions
    const fontSize = Math.min(signature.height * 0.6, signature.width * 0.15);

    // Select a script-like font (italic for signature feel)
    // Map signature styles to available fonts
    let font = timesRomanItalic;
    const styleId = signature.style.id;
    
    if (styleId === 'elegant' || styleId === 'classic') {
      font = timesRomanBoldItalic;
    } else if (styleId === 'modern') {
      font = helveticaBoldOblique;
    } else if (styleId === 'formal') {
      font = timesRomanItalic;
    }

    // PDF coordinates start from bottom-left
    // Center the signature vertically in its box
    const pdfY = height - signature.y - (signature.height / 2) - (fontSize / 3);

    page.drawText(signature.name, {
      x: signature.x + 4,
      y: pdfY,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
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
