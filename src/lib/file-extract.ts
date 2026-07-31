// Client-side text extraction for submission uploads.
//
// The rest of the pipeline (grading, CSV export, rubric matching) works on
// plain text, so this module is the one place that turns an opaque binary
// blob into something the grader can reason about. Runs in the browser so
// we never have to ship binaries through our JSON API.
//
// Supported formats:
//   .pdf  \u2192 pdfjs-dist, page-by-page text concatenation
//   .docx \u2192 mammoth (DOCX \u2192 raw text; no styling preserved)
//   everything else \u2192 File.text() (treat as plain text; works for code,
//                      markdown, prose, etc.)

const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;
// Legacy .doc is deliberately not supported \u2014 mammoth only handles the
// modern OOXML format and we'd rather surface a clear error than guess.
const LEGACY_DOC_EXT = /\.doc$/i;

export interface ExtractResult {
  /** Extracted text content. Empty string is valid (empty submission). */
  text: string;
  /** Warnings surfaced to the TA (e.g. partial extraction, encoding issues). */
  warnings: string[];
}

export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string, reason: string) {
    super(`Cannot extract text from "${fileName}": ${reason}`);
    this.name = "UnsupportedFileTypeError";
  }
}

/**
 * Extract plain text from a File, dispatching on extension. Throws
 * UnsupportedFileTypeError for formats we explicitly refuse (e.g. legacy
 * .doc) or for parser failures we can't recover from (e.g. encrypted PDF).
 */
export async function extractText(file: File): Promise<ExtractResult> {
  const name = file.name;

  if (LEGACY_DOC_EXT.test(name)) {
    throw new UnsupportedFileTypeError(
      name,
      "legacy .doc format is not supported. Please re-save as .docx or .pdf.",
    );
  }

  if (PDF_EXT.test(name)) {
    return extractPdfText(file);
  }

  if (DOCX_EXT.test(name)) {
    return extractDocxText(file);
  }

  // Fallback: treat as plain text. File.text() handles UTF-8 + BOM and is
  // the standard way to read text in modern browsers.
  const text = await file.text();
  return { text, warnings: [] };
}

async function extractPdfText(file: File): Promise<ExtractResult> {
  // Dynamic import so the ~1MB pdfjs bundle is only fetched when a TA
  // actually uploads a PDF.
  const pdfjs = await import("pdfjs-dist");

  // pdfjs expects the worker to be configured. In Next.js we point it at
  // the legacy worker (fewer module-resolution headaches) served from a
  // CDN. If we ever move off that we'll self-host.
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const version = pdfjs.version;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }

  const buf = await file.arrayBuffer();

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: buf }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new UnsupportedFileTypeError(
      file.name,
      `could not parse PDF (${msg}). Encrypted or malformed PDFs are not supported.`,
    );
  }

  const warnings: string[] = [];
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      // Items can be either text items or marked-content markers; only the
      // former carry a .str field.
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(text);
    } catch (err) {
      warnings.push(
        `Page ${pageNum}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    warnings.push(
      "No text extracted from PDF \u2014 submission may be a scanned image. OCR is not yet supported.",
    );
  }
  return { text, warnings };
}

interface MammothMessage {
  type: string;
  message: string;
}
interface MammothResult {
  value?: string;
  messages?: MammothMessage[];
}
interface MammothBrowser {
  extractRawText: (options: {
    arrayBuffer: ArrayBuffer;
  }) => Promise<MammothResult>;
}

async function extractDocxText(file: File): Promise<ExtractResult> {
  // mammoth also comes in at ~500KB; dynamic import keeps initial bundle lean.
  // No bundled types for the browser entry, so we narrow to the tiny surface
  // we actually use.
  const mammothModule = (await import(
    // @ts-expect-error \u2014 mammoth ships no types for the browser entry
    "mammoth/mammoth.browser"
  )) as { default?: MammothBrowser } & MammothBrowser;
  const mammoth: MammothBrowser = mammothModule.default ?? mammothModule;

  const buf = await file.arrayBuffer();

  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const warnings = (result.messages ?? [])
      .filter((m) => m.type === "warning" || m.type === "error")
      .map((m) => m.message);
    return { text: result.value ?? "", warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new UnsupportedFileTypeError(
      file.name,
      `could not parse DOCX (${msg}).`,
    );
  }
}
