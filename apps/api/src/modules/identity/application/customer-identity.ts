import {
  IdentityError,
  type IdentityCrypto,
  type IdentityMail,
  type IdentityRepository,
  type IssueToken,
  type TokenPurpose,
} from "../domain/identity.js";
export interface CustomerPolicy {
  origin: string;
  absoluteSeconds: number;
  idleSeconds: number;
  verificationSeconds: number;
  recoverySeconds: number;
  ipLimit: number;
  identityLimit: number;
}
export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new IdentityError("INVALID_REQUEST");
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_{}|~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(
      email,
    )
  )
    throw new IdentityError("INVALID_REQUEST");
  return email;
}
export function normalizePassword(
  value: unknown,
  creating: boolean,
  email = "",
): string {
  if (typeof value !== "string") throw new IdentityError("INVALID_REQUEST");
  const password = value.normalize("NFC");
  const length = Array.from(password).length;
  if (
    length < (creating ? 15 : 1) ||
    length > 128 ||
    new TextEncoder().encode(password).length > 1024
  )
    throw new IdentityError("INVALID_REQUEST");
  const common = [
    "passwordpassword",
    "123456789012345",
    "qwertyuiopasdfgh",
    "atlascommerce123",
    "correct horse battery staple",
  ];
  const local = email.split("@")[0] ?? "";
  if (
    creating &&
    (common.includes(password.toLowerCase()) ||
      (local.length >= 4 && password.toLowerCase().includes(local)))
  )
    throw new IdentityError("INVALID_REQUEST");
  return password;
}
export class CustomerIdentity {
  constructor(
    readonly repository: IdentityRepository,
    private readonly crypto: IdentityCrypto,
    private readonly mail: IdentityMail,
    private readonly policy: CustomerPolicy,
  ) {}
  async limit(ip: string, operation: string, email?: string): Promise<void> {
    let retry = await this.repository.limit(
      this.crypto.digest("abuse-ip", ip),
      300,
      this.policy.ipLimit,
    );
    if (retry !== undefined) throw new IdentityError("RATE_LIMITED", retry);
    if (email) {
      retry = await this.repository.limit(
        this.crypto.digest("abuse-account", operation + "\0" + email),
        900,
        this.policy.identityLimit,
      );
      if (retry !== undefined) throw new IdentityError("RATE_LIMITED", retry);
    }
  }
  private token(email: string, purpose: TokenPurpose): IssueToken {
    const token = this.crypto.random();
    return {
      hash: this.crypto.digest(purpose, token),
      purpose,
      ttl:
        purpose === "VERIFY_EMAIL"
          ? this.policy.verificationSeconds
          : this.policy.recoverySeconds,
      payload: this.crypto.seal({ email, token, purpose }),
    };
  }
  async register(
    email: string,
    password: string,
    requestId: string,
  ): Promise<void> {
    const hash = await this.crypto.password(password);
    await this.repository.register(
      email,
      hash,
      this.token(email, "VERIFY_EMAIL"),
      requestId,
    );
    await this.deliverPending();
  }
  async requestToken(
    email: string,
    purpose: TokenPurpose,
    requestId: string,
  ): Promise<void> {
    await this.repository.issue(email, this.token(email, purpose), requestId);
    await this.deliverPending();
  }
  async verify(token: string, requestId: string): Promise<void> {
    if (
      !(await this.repository.verifyToken(
        this.crypto.digest("VERIFY_EMAIL", token),
        requestId,
      ))
    ) {
      await this.repository.failure("VERIFY_DENIED", requestId);
      throw new IdentityError("INVALID_REQUEST");
    }
  }
  async login(
    email: string,
    password: string,
    oldToken: string,
    requestId: string,
  ): Promise<string> {
    const credential = await this.repository.credential(email);
    const proof = await this.crypto.verify(password, credential?.hash);
    if (!credential || !proof.matches || credential.status !== "ACTIVE") {
      await this.repository.failure("LOGIN_DENIED", requestId);
      throw new IdentityError("UNAUTHENTICATED");
    }
    const token = this.crypto.random();
    const upgrade = proof.upgrade
      ? await this.crypto.password(password)
      : undefined;
    if (
      !(await this.repository.login(
        credential,
        this.crypto.digest("session", token),
        this.crypto.digest("session", oldToken),
        upgrade,
        this.policy.origin,
        this.policy.absoluteSeconds,
        requestId,
      ))
    ) {
      await this.repository.failure("LOGIN_DENIED", requestId);
      throw new IdentityError("UNAUTHENTICATED");
    }
    return token;
  }
  async me(token: string) {
    const customer = await this.repository.current(
      this.crypto.digest("session", token),
      this.policy.origin,
      this.policy.idleSeconds,
    );
    if (!customer) throw new IdentityError("UNAUTHENTICATED");
    return customer;
  }
  async logout(token: string, all: boolean, requestId: string): Promise<void> {
    await this.repository.revoke(
      this.crypto.digest("session", token),
      all,
      this.policy.origin,
      this.policy.idleSeconds,
      requestId,
    );
  }
  async recover(
    token: string,
    password: string,
    requestId: string,
  ): Promise<void> {
    const hash = await this.crypto.password(password);
    if (
      !(await this.repository.recover(
        this.crypto.digest("RESET_PASSWORD", token),
        hash,
        requestId,
      ))
    ) {
      await this.repository.failure("RECOVERY_DENIED", requestId);
      throw new IdentityError("INVALID_REQUEST");
    }
  }
  async deliverPending(): Promise<void> {
    // No network or email inside a database transaction; bounded work only.
    for (let i = 0; i < 3; i++) {
      const intent = await this.repository.claimMail();
      if (!intent) return;
      let delivered = false;
      try {
        await this.mail.send(intent.id, this.crypto.open(intent.payload));
        delivered = true;
      } catch {
        /* Persist failure below, never claim delivery. */
      }
      await this.repository.finishMail(intent.id, delivered, intent.attempts);
      if (!delivered) return;
    }
  }
}
