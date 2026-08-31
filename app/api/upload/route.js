import { NextResponse } from "next/server";
import { validateUpload, MAX_UPLOAD_BYTES } from "@/lib/validate";
import { convertWordToPdf, countPdfPages } from "@/lib/pdf";
import { saveOriginal, savePrintPdf } from "@/lib/storage";
import { createOrder } from "@/lib/db";
import { newId, shortCode } from "@/lib/ids";
import { STATUS } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large. The limit is 50 MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(file.name, buffer.length, buffer);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const orderId = newId();
  const accessToken = newId(); // lets the uploader view/confirm before OTP login

  try {
    await saveOriginal(orderId, check.ext, buffer);

    // Produce the PDF we will actually print.
    let printPdf;
    let converted = false;
    if (check.kind === "pdf") {
      printPdf = buffer;
    } else {
      printPdf = await convertWordToPdf(buffer, check.ext);
      converted = true;
    }
    await savePrintPdf(orderId, printPdf);

    const pages = await countPdfPages(printPdf);

    const order = {
      id: orderId,
      code: shortCode(),
      accessToken,
      status: STATUS.AWAITING_OPTIONS,
      originalName: sanitizeName(file.name),
      kind: check.kind,
      converted,
      pages,
      options: null,
      price: null,
      phone: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
      history: [{ at: new Date().toISOString(), event: "uploaded" }],
    };
    await createOrder(order);

    return NextResponse.json({
      orderId,
      accessToken,
      code: order.code,
      pages,
      converted,
      originalName: order.originalName,
    });
  } catch (err) {
    console.error("[upload] failed:", err?.message);
    // Generic message to the client; details stay in server logs.
    return NextResponse.json(
      { error: "We couldn't process that file. If it's a Word document, try exporting it to PDF and uploading that." },
      { status: 422 }
    );
  }
}

function sanitizeName(name) {
  return String(name || "document")
    .replace(/[\r\n\t]/g, " ")
    .slice(0, 120);
}
