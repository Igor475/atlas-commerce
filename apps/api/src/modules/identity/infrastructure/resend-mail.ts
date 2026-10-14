import type { EmailMessage, IdentityMail } from "../domain/identity.js";
import type { DispatchMail, MailResult } from "../domain/mail-dispatch.js";

const endpoint = "https://api.resend.com/emails";
const sender = "Atlas Commerce <onboarding@resend.dev>";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type ResendOptions = {
  key: string;
  to: string;
  origin: string;
  from: string;
  timeoutMs?: number;
};
export class MailConfigurationError extends Error {
  constructor() {
    super("IDENTITY_MAIL_CONFIGURATION_INVALID");
  }
}
function email(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_{}|~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(
      value,
    )
  );
}
function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function validOptions(value: ResendOptions): boolean {
  try {
    if (
      Object.keys(value).some(
        (key) => !["key", "to", "origin", "from", "timeoutMs"].includes(key),
      )
    )
      return false;
    const origin = new URL(value.origin);
    return (
      /^re_[a-zA-Z0-9_-]{16,200}$/.test(value.key) &&
      email(value.to) &&
      value.from === sender &&
      /^http:\/\/(127\.0\.0\.1|localhost):[1-9][0-9]{1,4}$/.test(
        value.origin,
      ) &&
      origin.origin === value.origin &&
      Number(origin.port) <= 65535 &&
      Number.isInteger(value.timeoutMs ?? 3000) &&
      (value.timeoutMs ?? 3000) >= 50 &&
      (value.timeoutMs ?? 3000) <= 5000
    );
  } catch {
    return false;
  }
}
export function configuredResend(
  env: NodeJS.ProcessEnv,
): ResendMail | undefined {
  // No credential inspection, adapter creation or network in other profiles.
  if (
    env.IDENTITY_PROFILE !== "local-resend" ||
    env.IDENTITY_MAIL_DISPATCH_ENABLED !== "1"
  )
    return undefined;
  if (
    env.IDENTITY_DISPOSABLE !== "1" ||
    env.IDENTITY_MAIL_LOCAL_OPT_IN !== "1" ||
    env.IDENTITY_MAIL_PROVIDER !== "resend" ||
    env.NODE_ENV === "production"
  )
    throw new MailConfigurationError();
  if (env.RESEND_API_URL || env.IDENTITY_MAIL_API_URL)
    throw new MailConfigurationError();
  if (!env.RESEND_API_KEY) return undefined;
  return new ResendMail({
    key: env.RESEND_API_KEY,
    to: env.IDENTITY_MAIL_TEST_TO ?? "",
    from: env.IDENTITY_MAIL_FROM ?? "",
    origin: env.IDENTITY_PUBLIC_SITE_ORIGIN ?? "",
  });
}
export class ResendMail implements IdentityMail, DispatchMail {
  #options: ResendOptions;
  #fetch: typeof fetch;
  #active = new Set<AbortController>();
  #stopped = false;
  constructor(options: ResendOptions, transport?: typeof fetch) {
    if (
      !validOptions(options) ||
      (transport &&
        (process.env.NODE_ENV !== "test" || process.env.VITEST !== "true"))
    )
      throw new MailConfigurationError();
    this.#options = Object.freeze({ ...options });
    this.#fetch = transport ?? fetch;
  }
  snapshot(message: EmailMessage): EmailMessage {
    if (
      !message ||
      typeof message !== "object" ||
      Array.isArray(message) ||
      Object.keys(message).some(
        (key) => !["email", "token", "purpose", "delivery"].includes(key),
      ) ||
      !email(message.email) ||
      !/^[A-Za-z0-9_-]{43}$/.test(message.token) ||
      !["VERIFY_EMAIL", "RESET_PASSWORD"].includes(message.purpose)
    )
      throw new Error("MAIL_PAYLOAD");
    if (message.email !== this.#options.to) throw new Error("MAIL_RECIPIENT");
    if (
      Object.hasOwn(message, "delivery") &&
      (!message.delivery ||
        typeof message.delivery !== "object" ||
        Array.isArray(message.delivery))
    )
      throw new Error("MAIL_INTEGRITY");
    const delivery = {
      version: 1 as const,
      from: this.#options.from,
      origin: this.#options.origin,
    };
    if (
      message.delivery &&
      (Object.keys(message.delivery).sort().join() !== "from,origin,version" ||
        message.delivery.version !== 1 ||
        message.delivery.from !== delivery.from ||
        message.delivery.origin !== delivery.origin)
    )
      throw new Error("MAIL_INTEGRITY");
    return {
      email: message.email,
      token: message.token,
      purpose: message.purpose,
      delivery,
    };
  }
  async send(id: string, message: EmailMessage): Promise<MailResult> {
    if (this.#stopped) return { kind: "UNCERTAIN", code: "STOPPED" };
    if (!uuid.test(id) || !message?.delivery)
      return { kind: "PERMANENT", code: "PAYLOAD" };
    let validated: EmailMessage;
    try {
      validated = this.snapshot(message);
    } catch (error) {
      return {
        kind: "PERMANENT",
        code:
          error instanceof Error && error.message === "MAIL_RECIPIENT"
            ? "RECIPIENT"
            : error instanceof Error && error.message === "MAIL_INTEGRITY"
              ? "INTEGRITY"
              : "PAYLOAD",
      };
    }
    const verify = validated.purpose === "VERIFY_EMAIL";
    const link =
      this.#options.origin +
      (verify ? "/auth/verify-email" : "/auth/recovery") +
      "#token=" +
      encodeURIComponent(validated.token);
    const subject = verify ? "Confirme seu e-mail" : "Recuperação de acesso";
    const action = verify ? "Confirmar e-mail" : "Continuar recuperação";
    const text =
      subject +
      ".\n" +
      action +
      ": " +
      link +
      "\nSe você não solicitou esta ação, ignore esta mensagem. O link tem validade limitada e uso único.";
    const body = JSON.stringify({
      from: this.#options.from,
      to: [validated.email],
      subject,
      text,
      html:
        "<p>" +
        escape(subject) +
        '.</p><p><a href="' +
        escape(link) +
        '">' +
        escape(action) +
        "</a></p><p>Se você não solicitou esta ação, ignore esta mensagem. O link tem validade limitada e uso único.</p>",
    });
    const controller = new AbortController();
    this.#active.add(controller);
    const timer = setTimeout(
      () => controller.abort(),
      this.#options.timeoutMs ?? 3000,
    );
    try {
      const response = await this.#fetch(endpoint, {
        method: "POST",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Authorization: "Bearer " + this.#options.key,
          "Content-Type": "application/json",
          "Idempotency-Key": "identity-v1/" + id,
        },
        body,
      });
      const reader = response.body?.getReader();
      let bytes = 0;
      const parts: Uint8Array[] = [];
      if (reader)
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 4096) {
            controller.abort();
            return { kind: "UNCERTAIN", code: "RESPONSE" };
          }
          parts.push(next.value);
        }
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(Buffer.concat(parts).toString("utf8")) as Record<
          string,
          unknown
        >;
      } catch {
        /* No raw response or parser diagnostic escapes. */
      }
      if (
        (response.status === 200 || response.status === 201) &&
        typeof data?.id === "string" &&
        uuid.test(data.id)
      )
        return { kind: "ACCEPTED", providerId: data.id };
      if (response.status >= 200 && response.status < 300)
        return { kind: "UNCERTAIN", code: "RESPONSE" };
      if (response.status === 429) {
        const header = response.headers.get("Retry-After");
        const delay =
          header && /^\d+$/.test(header)
            ? Number(header)
            : header
              ? Math.ceil((Date.parse(header) - Date.now()) / 1000)
              : 5;
        // An invalid/huge Retry-After cannot cause an early retry.
        if (!Number.isFinite(delay) || delay > 86400)
          return { kind: "UNCERTAIN", code: "RESPONSE" };
        return {
          kind: "RETRY",
          code: "THROTTLED",
          afterSeconds: Math.max(1, delay),
        };
      }
      if (response.status === 409)
        return data?.name === "concurrent_idempotent_requests"
          ? { kind: "RETRY", code: "CONCURRENT", afterSeconds: 5 }
          : { kind: "PERMANENT", code: "INTEGRITY" };
      if (response.status >= 500)
        return { kind: "UNCERTAIN", code: "HTTP_5XX" };
      if (response.status >= 300 && response.status < 400)
        return { kind: "PERMANENT", code: "REDIRECT" };
      return {
        kind: "PERMANENT",
        code:
          response.status === 400
            ? "HTTP_400"
            : response.status === 401
              ? "HTTP_401"
              : response.status === 403
                ? "HTTP_403"
                : "HTTP_4XX",
      };
    } catch {
      return {
        kind: "UNCERTAIN",
        code: this.#stopped
          ? "STOPPED"
          : controller.signal.aborted
            ? "TIMEOUT"
            : "NETWORK",
      };
    } finally {
      clearTimeout(timer);
      this.#active.delete(controller);
    }
  }
  close(): void {
    this.#stopped = true;
    for (const controller of this.#active) controller.abort();
  }
}
