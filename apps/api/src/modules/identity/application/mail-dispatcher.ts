import type { IdentityCrypto } from "../domain/identity.js";
import type {
  DispatchMail,
  MailDispatchRepository,
  MailResult,
} from "../domain/mail-dispatch.js";

export class IdentityMailDispatcher {
  #running: Promise<MailResult[]> | undefined;
  #stopped = false;
  constructor(
    private readonly repository: MailDispatchRepository,
    private readonly crypto: IdentityCrypto,
    private readonly mail: DispatchMail,
  ) {}
  runOnce(id?: string): Promise<MailResult[]> {
    if (this.#stopped || this.#running)
      return Promise.reject(new Error("MAIL_DISPATCH_UNAVAILABLE"));
    const task = this.batch(id).catch(() => {
      throw new Error("MAIL_DISPATCH_STATE_UNCERTAIN");
    });
    this.#running = task;
    void task
      .finally(() => {
        this.#running = undefined;
      })
      .catch(() => {});
    return task;
  }
  private async batch(id?: string): Promise<MailResult[]> {
    const results: MailResult[] = [];
    for (let i = 0; i < (id ? 1 : 3) && !this.#stopped; i++) {
      const intent = await this.repository.claimDispatchMail(id);
      if (!intent) break;
      let result: MailResult;
      try {
        // Only the controlled worker opens the encrypted outbox payload.
        const message = this.mail.snapshot(this.crypto.open(intent.payload));
        if (
          !(await this.repository.freezeDispatchMail(
            intent,
            this.crypto.seal(message),
          ))
        )
          throw new Error("MAIL_LEASE_LOST");
        if (!(await this.repository.dispatchMailLive(intent)))
          result = { kind: "PERMANENT", code: "PAYLOAD" };
        else result = await this.mail.send(intent.id, message);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (
          code === "MAIL_RECIPIENT" ||
          code === "MAIL_PAYLOAD" ||
          code === "MAIL_INTEGRITY"
        )
          result = {
            kind: "PERMANENT",
            code:
              code === "MAIL_RECIPIENT"
                ? "RECIPIENT"
                : code === "MAIL_INTEGRITY"
                  ? "INTEGRITY"
                  : "PAYLOAD",
          };
        else throw new Error("MAIL_DISPATCH_STATE_UNCERTAIN");
      }
      if (!(await this.repository.finishDispatchMail(intent, result)))
        throw new Error("MAIL_DISPATCH_STATE_UNCERTAIN");
      results.push(result);
      if (
        result.kind === "UNCERTAIN" ||
        result.kind === "RETRY" ||
        (result.kind === "PERMANENT" &&
          ["HTTP_401", "HTTP_403"].includes(result.code))
      )
        break;
    }
    return results;
  }
  async stop(): Promise<void> {
    this.#stopped = true;
    this.mail.close();
    await this.#running?.catch(() => {});
  }
}
