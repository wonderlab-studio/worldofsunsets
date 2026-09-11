import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sunsets = await prisma.sunset.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    sunsets.map((s) => ({
      id: s.id,
      thumbUrl: `/api/uploads/${s.thumbPath}`,
      imageUrl: `/api/uploads/${s.imagePath}`,
      takenAt: s.takenAt.toISOString(),
      lat: s.lat,
      lng: s.lng,
      placeName: s.placeName,
    }))
  );
}
