import { randomUUID } from "node:crypto";
import type { Stored } from "./core.js";
import type { TransientStore } from "./contracts.js";

interface Entry { value: unknown; etag: string; expires: number }

/**
 * Process-local, expiring records only; restart/logout cannot restore customer state.
 * Clone on read/write so callers cannot bypass optimistic concurrency by mutating a shared reference.
 */
export class MemoryStore implements TransientStore {
  private entries = new Map<string, Entry>();
  private timer: ReturnType<typeof setInterval>;
  constructor(private now: () => number = Date.now) {
    this.timer = setInterval(() => this.purge(), 30_000);
    this.timer.unref();
  }
  private purge() {
    for (const [key, entry] of this.entries) if (this.now() >= entry.expires) this.entries.delete(key);
  }
  async get<T>(key: string): Promise<Stored<T> | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expires) { this.entries.delete(key); return undefined; }
    return { value: structuredClone(entry.value) as T, etag: entry.etag };
  }
  async put<T>(key: string, value: T, etag?: string): Promise<boolean> {
    if (!value || typeof value !== "object" || !("expires" in value) ||
        typeof value.expires !== "number" || !Number.isFinite(value.expires)) throw new Error("Memory records require an expiry");
    this.purge();
    const current = this.entries.get(key);
    if (etag ? current?.etag !== etag : Boolean(current)) return false;
    this.entries.set(key, { value: structuredClone(value), etag: randomUUID(), expires: value.expires });
    return true;
  }
  delete(key: string) { this.entries.delete(key); }
  close() { clearInterval(this.timer); this.entries.clear(); }
}
