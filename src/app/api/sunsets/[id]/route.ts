import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sunset = await prisma.sunset.findUnique({ where: { id } });

  if (!sunset || sunset.status !== "APPROVED") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: sunset.id,
    imageUrl: `/api/uploads/${sunset.imagePath}`,
    thumbUrl: `/api/uploads/${sunset.thumbPath}`,
    takenAt: sunset.takenAt.toISOString(),
    lat: sunset.lat,
    lng: sunset.lng,
    placeName: sunset.placeName,
  });
}
