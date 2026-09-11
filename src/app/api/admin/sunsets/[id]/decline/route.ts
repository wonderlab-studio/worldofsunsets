import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { deleteSunsetFiles } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.sunset.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await deleteSunsetFiles(id);
  return NextResponse.json({ ok: true });
}
