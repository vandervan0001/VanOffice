import { NextResponse } from "next/server";
import { isPaperclipAvailable } from "@/lib/runtime/adapters/paperclip";

export async function GET() {
  const available = await isPaperclipAvailable();
  return NextResponse.json({ available });
}
