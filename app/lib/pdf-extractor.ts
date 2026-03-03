/**
 * PDF text extraction using pdf.js
 * Runs entirely client-side
 */

import * as pdfjsLib from "pdfjs-dist";

// Set the worker source - we'll load from CDN for simplicity
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageContent {
  pageNumber: number;
  width: number;
  height: number;
  items: TextItem[];
}

export interface ExtractedPdf {
  pages: PageContent[];
  fullText: string;
}

/**
 * Extract text content from a PDF file
 */
export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PageContent[] = [];
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string') {
        const textItem = item as { str: string; transform: number[]; width: number; height: number };
        items.push({
          text: textItem.str,
          x: textItem.transform[4],
          y: textItem.transform[5],
          width: textItem.width,
          height: textItem.height,
        });
      }
    }

    pages.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      items,
    });

    // Build full text with rough spatial awareness
    // Group by Y position to reconstruct lines
    const lineGroups = groupTextByLines(items);
    for (const line of lineGroups) {
      textParts.push(line.map(item => item.text).join(" "));
    }
    textParts.push("\n--- Page Break ---\n");
  }

  return {
    pages,
    fullText: textParts.join("\n"),
  };
}

/**
 * Group text items into lines based on Y position
 */
function groupTextByLines(items: TextItem[], tolerance = 3): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y (descending - PDF coordinates start from bottom) then X
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > tolerance) {
      return b.y - a.y; // Higher Y first (top of page)
    }
    return a.x - b.x; // Left to right
  });

  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentLine.push(item);
    } else {
      // Sort current line by X before pushing
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
    }
  }

  // Don't forget the last line
  currentLine.sort((a, b) => a.x - b.x);
  lines.push(currentLine);

  return lines;
}
