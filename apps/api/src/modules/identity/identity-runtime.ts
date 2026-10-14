import { CustomerIdentity } from "./application/customer-identity.js";
import {
  IdentityError,
  type IdentityMail,
  type IdentityRepository,
} from "./domain/identity.js";
import { NodeIdentityCrypto } from "./infrastructure/identity-crypto.js";
import { PrismaIdentityRepository } from "./infrastructure/identity-database.js";
import type { IdentityConfig } from "./infrastructure/identity-config.js";
export const IDENTITY_RUNTIME = Symbol("IDENTITY_RUNTIME");
export class IdentityRuntime {
  readonly crypto: NodeIdentityCrypto;
  readonly repository: IdentityRepository;
  private readonly customer: CustomerIdentity | undefined;
  constructor(
    readonly config: IdentityConfig,
    mail?: IdentityMail,
    repository?: IdentityRepository,
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
    if (config.enabled && mail)
      this.customer = new CustomerIdentity(
        this.repository,
        this.crypto,
        mail,
        config,
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
    await this.repository.close();
  }
}
