import sharp from "sharp";

const FULL_MAX_DIMENSION = 1600;
const THUMB_SIZE = 120;

export interface AvgColor {
  r: number;
  g: number;
  b: number;
}

export async function processSunsetImage(input: Buffer): Promise<{
  full: Buffer;
  thumb: Buffer;
  avgColor: AvgColor;
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

  // Mean of each channel over the whole (rotated) photo — used to tint the
  // map's color-filter overlay with the colors that actually dominate it.
  const stats = await image.clone().stats();
  const avgColor: AvgColor = {
    r: Math.round(stats.channels[0].mean),
    g: Math.round(stats.channels[1].mean),
    b: Math.round(stats.channels[2].mean),
  };

  return { full, thumb, avgColor };
}
