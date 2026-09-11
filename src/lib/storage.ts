import { promises as fs } from "fs";
import path from "path";

function uploadRoot(): string {
  const dir = process.env.UPLOAD_DIR || "./data/uploads";
  return path.isAbsolute(dir)
    ? dir
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

// relPath is always stored/used with forward slashes (e.g. "abc123/full.webp")
export function resolveUploadPath(relPath: string): string {
  const normalized = relPath.split("/").join(path.sep);
  const full = path.resolve(uploadRoot(), normalized);
  if (!full.startsWith(uploadRoot())) {
    throw new Error("Invalid upload path");
  }
  return full;
}

export async function writeUploadFile(relPath: string, data: Buffer): Promise<void> {
  const full = resolveUploadPath(relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

export async function readUploadFile(relPath: string): Promise<Buffer> {
  return fs.readFile(resolveUploadPath(relPath));
}

export async function deleteSunsetFiles(sunsetId: string): Promise<void> {
  const dir = resolveUploadPath(sunsetId);
  await fs.rm(dir, { recursive: true, force: true });
}
