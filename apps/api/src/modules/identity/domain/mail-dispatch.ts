import type { EmailMessage, MailIntent } from "./identity.js";

export type MailResult =
  | { kind: "ACCEPTED"; providerId: string }
  | { kind: "RETRY"; code: "THROTTLED" | "CONCURRENT"; afterSeconds: number }
  | {
      kind: "PERMANENT";
      code:
        | "PAYLOAD"
        | "RECIPIENT"
        | "INTEGRITY"
        | "HTTP_400"
        | "HTTP_401"
        | "HTTP_403"
        | "HTTP_4XX"
        | "REDIRECT";
    }
  | {
      kind: "UNCERTAIN";
      code: "TIMEOUT" | "NETWORK" | "HTTP_5XX" | "RESPONSE" | "STOPPED";
    };

export interface DispatchMail {
  snapshot(message: EmailMessage): EmailMessage;
  send(id: string, message: EmailMessage): Promise<MailResult>;
  close(): void;
}
export interface MailDispatchRepository {
  claimDispatchMail(id?: string): Promise<MailIntent | undefined>;
  freezeDispatchMail(intent: MailIntent, payload: string): Promise<boolean>;
  dispatchMailLive(intent: MailIntent): Promise<boolean>;
  finishDispatchMail(intent: MailIntent, result: MailResult): Promise<boolean>;
}
