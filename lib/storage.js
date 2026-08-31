// -----------------------------------------------------------------------------
// Supabase Storage — replaces local disk storage.
// Files are stored in the "print-files" bucket under <orderId>/original<ext>
// and <orderId>/print.pdf. The bucket is private; files are served only through
// the signed /api/files/[id] route.
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY  // service role key — never exposed to browser
  );
}

const BUCKET = "print-files";

const MIME_TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

export async function saveOriginal(orderId, ext, buffer) {
  const safeExt = ext.replace(/[^a-z0-9.]/gi, "").toLowerCase();
  const path = `${orderId}/original${safeExt.startsWith(".") ? safeExt : "." + safeExt}`;
  const contentType = MIME_TYPES[safeExt] || "application/pdf";
  const { error } = await client().storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error("Storage upload failed: " + error.message);
  return path;
}

export async function savePrintPdf(orderId, buffer) {
  const path = `${orderId}/print.pdf`;
  const { error } = await client().storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error("Storage upload failed: " + error.message);
  return path;
}

export async function readPrintPdf(orderId) {
  const path = `${orderId}/print.pdf`;
  const { data, error } = await client().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteOrderFiles(orderId) {
  const { data: list } = await client().storage.from(BUCKET).list(orderId);
  if (!list || list.length === 0) return;
  const paths = list.map((f) => `${orderId}/${f.name}`);
  await client().storage.from(BUCKET).remove(paths);
}

// printPdfPath kept for interface compatibility — not meaningful with cloud storage
export function printPdfPath(orderId) {
  return `${orderId}/print.pdf`;
}
