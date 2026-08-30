/**
 * Immutable original-evidence storage.
 *
 * Contract mirrors Supabase Storage: objects are written once to a deterministic
 * path and never overwritten. This demo backend persists to the local disk under
 * `.workqora-storage/`; a Supabase-backed implementation satisfies the same
 * {@link DocumentStorage} interface without changing callers.
 *
 * Canonical path: organizations/{orgId}/locations/{locationId}/documents/{docId}/{filename}
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface StoredObject {
  storagePath: string;
  absolutePath: string;
  sizeBytes: number;
}

export interface DocumentStorage {
  buildPath(args: { organizationId: string; locationId?: string; documentId: string; filename: string }): string;
  put(storagePath: string, bytes: Uint8Array): Promise<StoredObject>;
  exists(storagePath: string): Promise<boolean>;
  read(storagePath: string): Promise<Uint8Array>;
  /** A time-limited access reference. Local impl returns a file:// style ref. */
  signedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
}

export class LocalDiskDocumentStorage implements DocumentStorage {
  readonly bucket: string;
  private readonly root: string;

  constructor(options?: { root?: string; bucket?: string }) {
    this.bucket = options?.bucket ?? 'workqora-documents';
    this.root = options?.root ?? path.join(process.cwd(), '.workqora-storage');
  }

  buildPath(args: {
    organizationId: string;
    locationId?: string;
    documentId: string;
    filename: string;
  }): string {
    const loc = args.locationId ?? '_org';
    return `organizations/${args.organizationId}/locations/${loc}/documents/${args.documentId}/${args.filename}`;
  }

  private abs(storagePath: string): string {
    // Guard against traversal: storagePath is server-built, but be defensive.
    const normalized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.root, this.bucket, normalized);
  }

  async put(storagePath: string, bytes: Uint8Array): Promise<StoredObject> {
    const absolutePath = this.abs(storagePath);
    // Never overwrite immutable evidence.
    if (await this.exists(storagePath)) {
      const stat = await fs.stat(absolutePath);
      return { storagePath, absolutePath, sizeBytes: stat.size };
    }
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, bytes, { flag: 'wx' }).catch(async (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EEXIST') throw err;
    });
    return { storagePath, absolutePath, sizeBytes: bytes.byteLength };
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(this.abs(storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async read(storagePath: string): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(this.abs(storagePath)));
  }

  async signedUrl(storagePath: string): Promise<string> {
    return `file://${this.abs(storagePath)}`;
  }
}

export const documentStorage: DocumentStorage = new LocalDiskDocumentStorage();
