// -----------------------------------------------------------------------------
// PDF utilities: count pages, and convert Word (.docx/.doc) to PDF.
//
// Conversion uses LibreOffice in headless mode (`soffice --convert-to pdf`),
// which is free and handles most student documents. Its weak spot is fonts the
// server doesn't have — the customer confirms the converted PDF preview before
// paying, which catches any layout drift. For higher fidelity later, swap this
// for a Word-based renderer (e.g. a CloudConvert API call).
// -----------------------------------------------------------------------------

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function countPdfPages(buffer) {
  // Use Python's pypdf — handles scanned, compressed, and encrypted PDFs reliably.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfcount-"));
  const inPath = path.join(workDir, "input.pdf");
  fs.writeFileSync(inPath, buffer);
  try {
    const count = await new Promise((resolve, reject) => {
      execFile(
        "python3",
        ["-c", `import pypdf,sys; print(len(pypdf.PdfReader(sys.argv[1]).pages))`, inPath],
        { timeout: 30_000 },
        (err, stdout) => {
          if (err) return reject(err);
          const n = parseInt(stdout.trim(), 10);
          resolve(Number.isFinite(n) && n > 0 ? n : 1);
        }
      );
    });
    return count;
  } catch {
    // Fallback: pdf-lib
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return doc.getPageCount();
    } catch {
      return 1;
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// Convert a Word document buffer to a PDF buffer. Returns the PDF Buffer.
export async function convertWordToPdf(buffer, ext) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "conv-"));
  const inPath = path.join(workDir, "input" + ext);
  // Isolate the LibreOffice user profile per-conversion so concurrent jobs
  // don't fight over a single profile lock.
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "loprofile-"));
  fs.writeFileSync(inPath, buffer);

  try {
    await new Promise((resolve, reject) => {
      execFile(
        "soffice",
        [
          "--headless",
          "--norestore",
          "-env:UserInstallation=file://" + profileDir,
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          inPath,
        ],
        { timeout: 90_000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error("Conversion failed: " + (stderr || err.message)));
          resolve();
        }
      );
    });

    const outPath = path.join(workDir, "input.pdf");
    if (!fs.existsSync(outPath)) {
      throw new Error("Converter did not produce a PDF");
    }
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}
