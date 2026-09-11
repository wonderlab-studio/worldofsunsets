import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { deleteSunsetFiles } from "@/lib/storage";

// Wipes every Sunset row (pending, approved, or otherwise) and their photo
// files. Destructive and irreversible — the confirmation lives client-side
// in ModerationList before this is ever called.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const all = await prisma.sunset.findMany({ select: { id: true } });
  await prisma.sunset.deleteMany({});
  await Promise.all(all.map((s) => deleteSunsetFiles(s.id)));

  return NextResponse.json({ ok: true, deleted: all.length });
}
