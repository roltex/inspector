import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export interface StorageAdapter {
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<{ url: string }>;
  publicUrl(key: string): string;
}

class LocalStorage implements StorageAdapter {
  private dir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);

  async put(key: string, data: Buffer | Uint8Array, _ct?: string) {
    const full = path.join(this.dir, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return { url: this.publicUrl(key) };
  }

  publicUrl(key: string) {
    return `/api/uploads/${key.split(path.sep).join("/")}`;
  }
}

let _adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (_adapter) return _adapter;
  _adapter = new LocalStorage();
  return _adapter;
}

export function makeUploadKey(organizationId: string, folder: string, ext = "") {
  const id = randomUUID();
  return path.join(organizationId, folder, `${id}${ext ? "." + ext.replace(/^\./, "") : ""}`);
}
