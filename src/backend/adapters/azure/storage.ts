import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { CryptographyClient, KeyClient } from "@azure/keyvault-keys";
import type { TokenCredential } from "@azure/identity";
import type { Store, Stored } from "../../core.js";

interface Envelope {
  keyId: string; wrappedKey: string; iv: string; tag: string; ciphertext: string;
}
function status(error: unknown): number | undefined {
  return error instanceof Error && "statusCode" in error && typeof error.statusCode === "number"
    ? error.statusCode : undefined;
}

/** Envelope-encrypted persistence for OTP/abuse records; customer sessions use MemoryStore instead. */
export class AzureStore implements Store {
  private container: ContainerClient;
  private keys: KeyClient;
  private keyId?: string;
  private vaultOrigin: string;
  constructor(storageUrl: string, vaultUrl: string, private credential: TokenCredential) {
    this.container = new BlobServiceClient(storageUrl, credential).getContainerClient("onboarding");
    this.keys = new KeyClient(vaultUrl, credential);
    this.vaultOrigin = new URL(vaultUrl).origin;
  }
  async initialize(): Promise<void> {
    try {
      this.keyId = (await this.keys.getKey("onboarding-encryption")).id;
    } catch (error) {
      if (status(error) !== 404) throw error;
      this.keyId = (await this.keys.createRsaKey("onboarding-encryption", { keySize: 2048 })).id;
    }
    if (!this.keyId) throw new Error("Key Vault did not return an encryption key ID");
    await this.container.getProperties();
  }
  async get<T>(name: string): Promise<Stored<T> | undefined> {
      const blob = this.container.getBlockBlobClient(`${name}.json`);
      const response = await blob.download().catch((error: unknown) => {
        if (status(error) === 404) return undefined;
        throw error;
      });
      if (!response) return undefined;
      const chunks: Buffer[] = [];
      if (!response.readableStreamBody || !response.etag) throw new Error("Invalid Blob response");
      for await (const chunk of response.readableStreamBody) chunks.push(Buffer.from(chunk));
      const envelope: Envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const keyUrl = new URL(envelope.keyId);
      // A stored envelope cannot redirect credentialed key operations to another vault or key name.
      if (keyUrl.origin !== this.vaultOrigin || !/^\/keys\/onboarding-encryption\/[a-f0-9]+$/i.test(keyUrl.pathname)) {
        throw new Error("Unexpected envelope key reference");
      }
      const crypto = new CryptographyClient(envelope.keyId, this.credential);
      const unwrapped = await crypto.unwrapKey("RSA-OAEP-256", Buffer.from(envelope.wrappedKey, "base64"));
      const decipher = createDecipheriv("aes-256-gcm", unwrapped.result, Buffer.from(envelope.iv, "base64"));
      decipher.setAAD(Buffer.from(name));
      decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final(),
      ]);
      return { value: JSON.parse(plaintext.toString("utf8")) as T, etag: response.etag };
  }
  async put<T>(name: string, value: T, etag?: string): Promise<boolean> {
    if (!this.keyId) throw new Error("Store not initialized");
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    // Bind the ciphertext to its record name so copying an envelope cannot change its identity.
    cipher.setAAD(Buffer.from(name));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    const wrapped = await new CryptographyClient(this.keyId, this.credential).wrapKey("RSA-OAEP-256", key);
    const envelope: Envelope = {
      keyId: this.keyId, wrappedKey: Buffer.from(wrapped.result).toString("base64"),
      iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    try {
      await this.container.getBlockBlobClient(`${name}.json`).uploadData(Buffer.from(JSON.stringify(envelope)), {
        conditions: etag ? { ifMatch: etag } : { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
      return true;
    } catch (error) {
      if (status(error) === 409 || status(error) === 412) return false;
      throw error;
    }
  }
}
