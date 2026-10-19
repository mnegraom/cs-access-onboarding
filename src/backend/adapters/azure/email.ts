import { EmailClient } from "@azure/communication-email";
import type { TokenCredential } from "@azure/identity";
import type { EmailMessage, EmailSender } from "../../contracts.js";

/** Azure transport reference; delivery policy and OTP verification belong to EmailOtpAuth. */
export class AzureEmailSender implements EmailSender {
  private client: EmailClient;

  constructor(endpoint: string, private senderAddress: string, credential: TokenCredential) {
    this.client = new EmailClient(endpoint, credential);
  }

  async send(message: EmailMessage) {
    const poller = await this.client.beginSend({
      senderAddress: this.senderAddress,
      recipients: { to: [{ address: message.to }] },
      content: { subject: message.subject, plainText: message.text },
    });
    const result = await poller.pollUntilDone();
    if (result.status !== "Succeeded") throw new Error("Email send not confirmed");
  }
}
