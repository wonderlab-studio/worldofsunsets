import sharp from "sharp";

const FULL_MAX_DIMENSION = 1600;
const THUMB_SIZE = 120;

export async function processSunsetImage(input: Buffer): Promise<{
  full: Buffer;
  thumb: Buffer;
}> {
  const image = sharp(input, { failOn: "none" }).rotate();

  const full = await image
    .clone()
    .resize({
      width: FULL_MAX_DIMENSION,
      height: FULL_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const thumb = await image
    .clone()
    .resize({
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      fit: "cover",
    })
    .webp({ quality: 70 })
    .toBuffer();

  return { full, thumb };
}
