import type { Response, Router } from "express";
import type { Store } from "./core.js";

/** Must remain process-local, expiring and compare-and-swap capable to preserve session semantics. */
export interface TransientStore extends Store {
  delete(key: string): void;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Resolve only after the transport confirms delivery submission; failures must reject. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface OperatorAuthContext {
  publicOrigin: string;
  partnerName: string;
  /** Trusted provider callback: call only after verifying identity, never with unverified request data. */
  completeLogin(email: string, response: Response): Promise<void>;
}

/**
 * Owns operator identity verification, not customer Microsoft authorization.
 * Providers replacing email OTP must also supply the corresponding login UI/routes.
 */
export interface OperatorAuthProvider {
  enabled: boolean;
  isAuthorized(email: string): boolean | Promise<boolean>;
  registerRoutes(router: Router, context: OperatorAuthContext): void;
}

export interface PortalServices {
  operatorAuth: OperatorAuthProvider;
  transientStore: TransientStore;
}

export interface PortalOptions {
  publicOrigin: string;
  partnerName: string;
  frontendDirectory?: string;
}
