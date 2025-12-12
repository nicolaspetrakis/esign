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

// Render signature to canvas and return as PNG data
async function renderSignatureToImage(signature: SignatureData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Create a high-resolution canvas for better quality
    const scale = 2; // 2x resolution for crisp signatures
    const canvas = document.createElement('canvas');
    canvas.width = signature.width * scale;
    canvas.height = signature.height * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate font size based on signature dimensions
    const fontSize = Math.min(signature.height * 0.6, signature.width * 0.15) * scale;
    
    // Set font with the signature style
    ctx.font = `${signature.style.fontWeight} ${fontSize}px ${signature.style.fontFamily}`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Draw the signature text centered
    ctx.fillText(signature.name, canvas.width / 2, canvas.height / 2);
    
    // Convert canvas to PNG blob
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not convert canvas to blob'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = () => reject(new Error('Could not read blob'));
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

// Wait for fonts to be loaded
async function waitForFonts(): Promise<void> {
  // Check if fonts are already loaded
  if (document.fonts) {
    await document.fonts.ready;
    
    // Additional wait to ensure fonts are fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function exportPDFWithAnnotations(
  originalFile: File,
  textBoxes: TextBoxData[],
  signatures: SignatureData[]
): Promise<Blob> {
  // Wait for fonts to be loaded before rendering signatures
  await waitForFonts();
  
  // Load the original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Embed fonts for text boxes
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

  // Add signatures to each page as images
  for (const signature of signatures) {
    const pageIndex = signature.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height } = page.getSize();

    try {
      // Render signature to PNG
      const signatureImageBytes = await renderSignatureToImage(signature);
      
      // Embed the image in the PDF
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      // PDF coordinates start from bottom-left
      const pdfY = height - signature.y - signature.height;
      
      // Draw the signature image
      page.drawImage(signatureImage, {
        x: signature.x,
        y: pdfY,
        width: signature.width,
        height: signature.height,
      });
    } catch (error) {
      console.error('Error rendering signature:', error);
      // Fallback: draw as text if image rendering fails
      const fontSize = Math.min(signature.height * 0.6, signature.width * 0.15);
      const pdfY = height - signature.y - (signature.height / 2) - (fontSize / 3);
      
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      page.drawText(signature.name, {
        x: signature.x + 4,
        y: pdfY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
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
