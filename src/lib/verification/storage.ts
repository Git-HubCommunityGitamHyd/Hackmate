import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const LOCAL_DIRECTORY = path.resolve(
  process.cwd(),
  ".data",
  "private-college-ids",
);
const PATHNAME_PREFIX = "college-id/";

function localPath(pathname: string): string {
  if (!/^college-id\/[0-9a-f-]{36}\.jpg$/i.test(pathname)) {
    throw new Error("Invalid private ID document pathname.");
  }
  const resolved = path.resolve(LOCAL_DIRECTORY, pathname);
  if (!resolved.startsWith(`${LOCAL_DIRECTORY}${path.sep}`)) {
    throw new Error("Invalid private ID document pathname.");
  }
  return resolved;
}

function filesystemStorageEnabled(): boolean {
  return process.env.NODE_ENV !== "production" &&
    !process.env.ID_BLOB_READ_WRITE_TOKEN &&
    !process.env.ID_BLOB_STORE_ID;
}

function privateBlobOptions(): { token?: string; storeId?: string } {
  const token = process.env.ID_BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.ID_BLOB_STORE_ID;
  if (token) return { token };
  if (storeId) return { storeId };
  throw new Error("Private ID Blob storage is not configured.");
}

export async function storeCollegeIdImage(image: Buffer): Promise<string> {
  const pathname = `${PATHNAME_PREFIX}${randomUUID()}.jpg`;
  if (filesystemStorageEnabled()) {
    const filePath = localPath(pathname);
    await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
    await writeFile(filePath, image, { flag: "wx", mode: 0o600 });
    return pathname;
  }

  await put(pathname, image, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: false,
    ...privateBlobOptions(),
  });
  return pathname;
}

export async function readCollegeIdImage(
  pathname: string,
): Promise<Buffer | ReadableStream<Uint8Array> | null> {
  if (filesystemStorageEnabled()) {
    try {
      return await readFile(localPath(pathname));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const blob = await get(pathname, {
    access: "private",
    ...privateBlobOptions(),
  });
  if (!blob || blob.statusCode !== 200) return null;
  return blob.stream;
}

export async function deleteCollegeIdImage(pathname: string): Promise<void> {
  if (filesystemStorageEnabled()) {
    try {
      await unlink(localPath(pathname));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  await del(pathname, privateBlobOptions());
}
