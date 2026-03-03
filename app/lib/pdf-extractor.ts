/**
 * PDF text extraction using pdf.js
 * Runs entirely client-side
 */

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set the worker source using the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    // Disable streaming features for Safari/iOS compatibility
    disableStream: true,
    disableAutoFetch: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: PageContent[] = [];
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];
    const contentItems = textContent.items || [];
    for (let idx = 0; idx < contentItems.length; idx++) {
      const item = contentItems[idx];
      if (item && 'str' in item && typeof item.str === 'string') {
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

    // Build full text handling multi-column layout
    // Process each column separately, then combine in reading order
    const columnLines = extractColumnarText(items, viewport.width);
    for (let j = 0; j < columnLines.length; j++) {
      textParts.push(columnLines[j]);
    }
    textParts.push("\n--- Page Break ---\n");
  }

  return {
    pages,
    fullText: textParts.join("\n"),
  };
}

/**
 * Extract text from a multi-column layout
 * Detects columns and processes each one top-to-bottom in reading order
 */
function extractColumnarText(items: TextItem[], pageWidth: number): string[] {
  if (items.length === 0) return [];

  // Detect column boundaries by analyzing X positions
  const columns = detectColumns(items, pageWidth);

  // Process each column and collect lines
  const allLines: string[] = [];

  for (let c = 0; c < columns.length; c++) {
    const columnItems = columns[c];
    const lines = groupTextByLines(columnItems);
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      const lineText = line.map(item => item.text).join(" ");
      if (lineText.trim()) {
        allLines.push(lineText);
      }
    }
  }

  return allLines;
}

/**
 * Detect columns by clustering X positions
 * Returns items grouped by column, in left-to-right order
 */
function detectColumns(items: TextItem[], pageWidth: number): TextItem[][] {
  if (!items || items.length === 0) return [];

  // Get min/max X positions without spread operator (more compatible)
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < items.length; i++) {
    const x = Math.round(items[i].x);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const xRange = maxX - minX;

  // If content spans less than half the page, likely single column
  if (xRange < pageWidth * 0.4) {
    return [items];
  }

  // For HY-TEK psych sheets, assume 3 columns
  // Divide page into thirds and assign items to columns
  const columnWidth = pageWidth / 3;
  const column1: TextItem[] = [];
  const column2: TextItem[] = [];
  const column3: TextItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.x < columnWidth) {
      column1.push(item);
    } else if (item.x < columnWidth * 2) {
      column2.push(item);
    } else {
      column3.push(item);
    }
  }

  // Return non-empty columns in order
  const columns: TextItem[][] = [];
  if (column1.length > 0) columns.push(column1);
  if (column2.length > 0) columns.push(column2);
  if (column3.length > 0) columns.push(column3);

  return columns;
}

/**
 * Group text items into lines based on Y position
 */
function groupTextByLines(items: TextItem[], tolerance = 3): TextItem[][] {
  if (!items || items.length === 0) return [];

  // Sort by Y (descending - PDF coordinates start from bottom) then X
  const sorted = Array.from(items).sort((a, b) => {
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
