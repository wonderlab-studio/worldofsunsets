import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { processSunsetImage } from "@/lib/image";
import { writeUploadFile, deleteSunsetFiles } from "@/lib/storage";
import { reverseGeocode } from "@/lib/geocode";

const WINDOW_MS: Record<string, number | null> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  anytime: null,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") || "anytime";
  const ms = window in WINDOW_MS ? WINDOW_MS[window] : null;

  const sunsets = await prisma.sunset.findMany({
    where: {
      status: "APPROVED",
      ...(ms ? { takenAt: { gte: new Date(Date.now() - ms) } } : {}),
    },
    select: { id: true, thumbPath: true, lat: true, lng: true },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json(
    sunsets.map((s) => ({
      id: s.id,
      thumbUrl: `/api/uploads/${s.thumbPath}`,
      lat: s.lat,
      lng: s.lng,
    }))
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const image = form.get("image");
  const takenAtRaw = form.get("takenAt");
  const latRaw = form.get("lat");
  const lngRaw = form.get("lng");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "file must be an image" }, { status: 400 });
  }
  if (image.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "image too large (max 10MB)" }, { status: 400 });
  }

  const takenAt = typeof takenAtRaw === "string" ? new Date(takenAtRaw) : null;
  const lat = typeof latRaw === "string" ? parseFloat(latRaw) : NaN;
  const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : NaN;

  if (!takenAt || Number.isNaN(takenAt.getTime())) {
    return NextResponse.json({ error: "invalid takenAt" }, { status: 400 });
  }
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: "invalid lat" }, { status: 400 });
  }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "invalid lng" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  try {
    const inputBuffer = Buffer.from(await image.arrayBuffer());
    const { full, thumb } = await processSunsetImage(inputBuffer);

    const imagePath = `${id}/full.webp`;
    const thumbPath = `${id}/thumb.webp`;
    await writeUploadFile(imagePath, full);
    await writeUploadFile(thumbPath, thumb);

    const placeName = await reverseGeocode(lat, lng);

    const sunset = await prisma.sunset.create({
      data: { id, imagePath, thumbPath, takenAt, lat, lng, placeName, status: "PENDING" },
    });

    return NextResponse.json({ id: sunset.id }, { status: 201 });
  } catch (err) {
    console.error("Failed to create sunset:", err);
    await deleteSunsetFiles(id);
    return NextResponse.json({ error: "failed to process upload" }, { status: 500 });
  }
}
