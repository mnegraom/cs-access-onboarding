import { ManagedIdentityCredential } from "@azure/identity";
import { z } from "zod";
import { createPortal } from "../../server.js";
import { MemoryStore } from "../../memory-store.js";
import { EmailOtpAuth } from "../../auth/email-otp.js";
import { AzureStore } from "./storage.js";
import { AzureEmailSender } from "./email.js";

// Explicit reference composition, not a requirement of createPortal or its Microsoft flows.
const config = z.object({
  PUBLIC_ORIGIN: z.url(),
  PARTNER_NAME: z.string().min(1),
  AZURE_CLIENT_ID: z.uuid(),
  STORAGE_URL: z.url(),
  KEY_VAULT_URL: z.url(),
  ACS_ENDPOINT: z.url(),
  EMAIL_SENDER: z.email(),
  EMAIL_ENABLED: z.enum(["true", "false"]),
  ALLOWED_EMAILS: z.string(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
}).parse(process.env);

const credential = new ManagedIdentityCredential({ clientId: config.AZURE_CLIENT_ID });
const store = new AzureStore(config.STORAGE_URL, config.KEY_VAULT_URL, credential);
const operatorAuth = new EmailOtpAuth({
  allowedEmails: z.array(z.email()).parse(JSON.parse(config.ALLOWED_EMAILS)),
  enabled: config.EMAIL_ENABLED === "true",
}, store, new AzureEmailSender(config.ACS_ENDPOINT, config.EMAIL_SENDER, credential));
const app = createPortal({
  publicOrigin: config.PUBLIC_ORIGIN,
  partnerName: config.PARTNER_NAME,
}, { operatorAuth, transientStore: new MemoryStore() });

await store.initialize();
app.listen(config.PORT, "0.0.0.0", () => console.log(JSON.stringify({ event: "server_ready" })));
