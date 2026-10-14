import { CustomerIdentity } from "./application/customer-identity.js";
import {
  IdentityError,
  type IdentityMail,
  type IdentityRepository,
} from "./domain/identity.js";
import { NodeIdentityCrypto } from "./infrastructure/identity-crypto.js";
import { PrismaIdentityRepository } from "./infrastructure/identity-database.js";
import type { IdentityConfig } from "./infrastructure/identity-config.js";
import { IdentityMailDispatcher } from "./application/mail-dispatcher.js";
import { ResendMail, configuredResend } from "./infrastructure/resend-mail.js";
import { readIdentityConfig } from "./infrastructure/identity-config.js";
export const IDENTITY_RUNTIME = Symbol("IDENTITY_RUNTIME");
export class IdentityRuntime {
  readonly crypto: NodeIdentityCrypto;
  readonly repository: IdentityRepository;
  private readonly customer: CustomerIdentity | undefined;
  readonly dispatcher: IdentityMailDispatcher | undefined;
  constructor(
    readonly config: IdentityConfig,
    mail?: IdentityMail,
    repository?: IdentityRepository,
    resend?: ResendMail,
  ) {
    if (
      mail &&
      (process.env.NODE_ENV !== "test" || process.env.VITEST !== "true")
    )
      throw new Error("IDENTITY_TEST_TRANSPORT_FORBIDDEN");
    this.crypto = new NodeIdentityCrypto(
      config.secret,
      config.argonMemory,
      config.argonPasses,
    );
    this.repository = repository ?? new PrismaIdentityRepository();
    if (mail instanceof ResendMail && config.profile !== "local-resend")
      throw new Error("IDENTITY_TEST_TRANSPORT_FORBIDDEN");
    if (resend) {
      if (
        config.profile !== "local-resend" ||
        !(resend instanceof ResendMail) ||
        !(this.repository instanceof PrismaIdentityRepository)
      )
        throw new Error("IDENTITY_MAIL_CONFIGURATION_INVALID");
      this.dispatcher = new IdentityMailDispatcher(
        this.repository,
        this.crypto,
        resend,
      );
    }
    if (config.enabled && mail)
      this.customer = new CustomerIdentity(
        this.repository,
        this.crypto,
        mail,
        config,
        config.profile !== "local-resend",
      );
  }
  service(): CustomerIdentity {
    if (!this.config.enabled || !this.customer)
      throw new IdentityError("DEPENDENCY_UNAVAILABLE");
    return this.customer;
  }
  async ready(): Promise<boolean> {
    return (
      this.config.enabled && !!this.customer && (await this.repository.ready())
    );
  }
  async onApplicationShutdown(): Promise<void> {
    await this.dispatcher?.stop();
    await this.repository.close();
  }
}
export function composeIdentity(env: NodeJS.ProcessEnv): IdentityRuntime {
  const config = readIdentityConfig(env);
  // A real adapter only equips the explicit CLI worker. No customer HTTP service
  // until the separate UI/host/password/legal gates have been approved.
  return new IdentityRuntime(
    config,
    undefined,
    undefined,
    configuredResend(env),
  );
}
