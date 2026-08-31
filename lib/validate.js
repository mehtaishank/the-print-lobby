// -----------------------------------------------------------------------------
// Upload validation. An uploaded file must clear all three checks:
//   1. Extension is on the allowlist.
//   2. The leading "magic bytes" match a type we accept (so a .exe renamed to
//      .pdf is rejected).
//   3. Size is within the cap.
// -----------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

// extension -> logical kind
const ALLOWED = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".doc": "doc",
};

// Magic-byte signatures (first bytes of the file).
const SIGNATURES = {
  pdf: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // "%PDF-"
  docx: [[0x50, 0x4b, 0x03, 0x04]], // ZIP container "PK\x03\x04"
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE compound
};

export function getExtension(filename) {
  const m = String(filename || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
}

function matchesSignature(buffer, kind) {
  const sigs = SIGNATURES[kind];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

// Returns { ok, kind, ext } on success, or { ok:false, error } on failure.
export function validateUpload(filename, size, buffer) {
  const ext = getExtension(filename);
  const kind = ALLOWED[ext];
  if (!kind) {
    return { ok: false, error: "Only PDF and Word files (.pdf, .docx, .doc) are accepted." };
  }
  if (!size || size <= 0) {
    return { ok: false, error: "That file looks empty." };
  }
  if (size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is too large. The limit is 50 MB." };
  }
  // .docx and .doc both need their own signature; .pdf needs the PDF header.
  const expectedKind = kind === "docx" || kind === "doc" ? kind : "pdf";
  if (!matchesSignature(buffer, expectedKind)) {
    return { ok: false, error: "That file's contents don't match its extension." };
  }
  return { ok: true, kind, ext };
}
