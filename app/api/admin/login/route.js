import { NextResponse } from "next/server";
import { checkAdminPassword, setAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!checkAdminPassword(body?.password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  setAdminSession();
  return NextResponse.json({ ok: true });
}
