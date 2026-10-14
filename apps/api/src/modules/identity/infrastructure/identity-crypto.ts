import * as crypto from "node:crypto";
import {
  IdentityError,
  type EmailMessage,
  type IdentityCrypto,
} from "../domain/identity.js";
const memory = 19456,
  passes = 2;
export class NodeIdentityCrypto implements IdentityCrypto {
  private dummy: Promise<string> | undefined;
  private readonly encryptionKey: Buffer;
  constructor(
    private readonly secret: Buffer,
    private readonly cost = memory,
    private readonly iterations = passes,
  ) {
    if (
      !Number.isInteger(cost) ||
      cost < memory ||
      cost > 65536 ||
      !Number.isInteger(iterations) ||
      iterations < passes ||
      iterations > 4
    )
      throw new IdentityError("DEPENDENCY_UNAVAILABLE");
    this.encryptionKey = crypto
      .createHmac("sha256", secret)
      .update("identity-email-v1")
      .digest();
  }
  random(): string {
    return crypto.randomBytes(32).toString("base64url");
  }
  digest(purpose: string, value: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(purpose)
      .update("\0")
      .update(value)
      .digest("hex");
  }
  private derive(
    value: string,
    salt: Buffer,
    cost: number,
    iterations: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.argon2(
        "argon2id",
        {
          message: value,
          nonce: salt,
          memory: cost,
          passes: iterations,
          parallelism: 1,
          tagLength: 32,
        },
        (error, key) =>
          error
            ? reject(new IdentityError("DEPENDENCY_UNAVAILABLE"))
            : resolve(key),
      );
    });
  }
  async password(value: string): Promise<string> {
    const salt = crypto.randomBytes(16),
      key = await this.derive(value, salt, this.cost, this.iterations);
    return [
      "",
      "argon2id",
      "v=19",
      "m=" + this.cost + ",t=" + this.iterations + ",p=1",
      salt.toString("base64").replace(/=+$/, ""),
      key.toString("base64").replace(/=+$/, ""),
    ].join("$");
  }
  async verify(
    value: string,
    hash?: string,
  ): Promise<{ matches: boolean; upgrade: boolean }> {
    if (!hash) {
      this.dummy ??= this.password(this.random());
      await this.verify(value, await this.dummy);
      return { matches: false, upgrade: false };
    }
    const match =
      /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=1\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/.exec(
        hash,
      );
    if (
      !match ||
      Number(match[1]) < memory ||
      Number(match[1]) > 65536 ||
      Number(match[2]) < 2 ||
      Number(match[2]) > 4
    ) {
      await this.verify(value);
      return { matches: false, upgrade: false };
    }
    const actual = await this.derive(
      value,
      Buffer.from(match[3]!, "base64"),
      Number(match[1]),
      Number(match[2]),
    );
    return {
      matches: crypto.timingSafeEqual(actual, Buffer.from(match[4]!, "base64")),
      upgrade:
        Number(match[1]) <= this.cost &&
        Number(match[2]) <= this.iterations &&
        (Number(match[1]) < this.cost || Number(match[2]) < this.iterations),
    };
  }
  seal(message: EmailMessage): string {
    const iv = crypto.randomBytes(12),
      cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    cipher.setAAD(Buffer.from("identity-email-v1"));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(message), "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((x) => x.toString("base64url"))
      .join(".");
  }
  open(payload: string): EmailMessage {
    const [iv, tag, body] = payload.split(".");
    if (!iv || !tag || !body) throw new IdentityError("DEPENDENCY_UNAVAILABLE");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from("identity-email-v1"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(body, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ) as EmailMessage;
  }
}
