import { randomUUID } from "node:crypto";
import type { Router } from "express";
import { z } from "zod";
import {
  HttpError, opaque, digest, normalizeEmail, newChallenge, consumeCode, update,
  type Challenge, type Store,
} from "../core.js";
import type { EmailSender, OperatorAuthContext, OperatorAuthProvider } from "../contracts.js";

export interface EmailOtpOptions {
  allowedEmails: string[];
  enabled: boolean;
}

/** Reference operator authentication; transport and protected persistence are supplied by the host. */
export class EmailOtpAuth implements OperatorAuthProvider {
  readonly enabled: boolean;
  private allowlist: Set<string>;

  constructor(options: EmailOtpOptions, private store: Store, private email: EmailSender) {
    this.enabled = options.enabled;
    this.allowlist = new Set(z.array(z.email()).parse(options.allowedEmails).map(normalizeEmail));
  }

  isAuthorized(email: string) {
    return this.allowlist.has(normalizeEmail(email));
  }

  private async rate(key: string, maximum: number, window: number) {
    return update(this.store, `limits/${digest(key)}`, () => ({ count: 0, until: 0 }), state => {
      if (Date.now() >= state.until) { state.count = 0; state.until = Date.now() + window; }
      state.count++;
      return state.count <= maximum;
    });
  }

  private async reserveEmail(address: string) {
    return update(this.store, `limits/${digest(`email:${address}`)}`, () => ({ count: 0, until: 0, last: 0 }), state => {
      const now = Date.now();
      if (now >= state.until) { state.count = 0; state.until = now + 15 * 60_000; }
      if (now - state.last < 60_000 || state.count >= 3) return false;
      state.count++; state.last = now;
      return true;
    });
  }

  registerRoutes(router: Router, context: OperatorAuthContext) {
    router.post("/access/request", async (req, res) => {
      if (req.headers.origin !== context.publicOrigin) throw new HttpError(403, "origin_rejected");
      if (!this.enabled) throw new HttpError(503, "email_setup_pending");
      const address = normalizeEmail(z.object({ email: z.email() }).parse(req.body).email);
      if (!await this.rate(`ip:${req.ip}`, 20, 15 * 60_000)) throw new HttpError(429, "rate_limited");
      const permitted = await this.reserveEmail(address);
      const challengeId = opaque();
      const { code, challenge } = newChallenge(address, this.isAuthorized(address) && permitted, Date.now());
      if (permitted) {
        await update(this.store, `challenges/${digest(address)}`, () => ({ id: "", challenge }), entry => {
          entry.id = digest(challengeId); entry.challenge = challenge;
        });
      }
      if (challenge.allowed) {
        try {
          await this.email.send({
            to: address,
            subject: `${context.partnerName} - CS Access Onboarding`,
            text: `CS Access Onboarding\n\n${code}\n\nPT: Seu codigo expira em 5 minutos. Nao compartilhe.\nES: Su codigo caduca en 5 minutos. No lo comparta.\nEN: Your code expires in 5 minutes. Do not share it.`,
          });
        } catch (error) {
          console.error(JSON.stringify({ event: "otp_delivery_failed", correlationId: randomUUID(), errorType: error instanceof Error ? error.name : "unknown" }));
        }
      }
      // Uniform output avoids disclosing membership or delivery; transport failures are logged above.
      res.status(202).json({ challengeId, message: "If this email is authorized, you will receive an access code valid for five minutes." });
    });
    router.post("/access/verify", async (req, res) => {
      if (req.headers.origin !== context.publicOrigin) throw new HttpError(403, "origin_rejected");
      if (!await this.rate(`verify:${req.ip}`, 30, 15 * 60_000)) throw new HttpError(429, "rate_limited");
      const input = z.object({
        email: z.email(), challengeId: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        code: z.string().regex(/^\d{6}$/),
      }).parse(req.body);
      const address = normalizeEmail(input.email);
      const verified = await update(this.store, `challenges/${digest(address)}`, () => {
        throw new HttpError(400, "invalid_or_expired_code");
      }, (entry: { id: string; challenge: Challenge }) =>
        entry.id === digest(input.challengeId) && this.isAuthorized(address) && consumeCode(entry.challenge, input.code, Date.now()));
      if (!verified) throw new HttpError(400, "invalid_or_expired_code");
      await context.completeLogin(address, res);
    });
  }
}
