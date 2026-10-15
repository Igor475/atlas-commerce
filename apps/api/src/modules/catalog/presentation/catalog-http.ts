import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { CatalogError } from "../domain/catalog.js";
export const productIdPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export interface CatalogRequest extends IncomingMessage {
  originalUrl: string;
}
export interface CatalogResponse {
  setHeader(name: string, value: string): void;
  status(code: number): CatalogResponse;
  json(value: unknown): void;
}
export class CatalogBoundary {
  private readonly key = randomBytes(32);
  private readonly buckets = new Map<
    string,
    { start: number; count: number }
  >();
  private active = 0;
  cursor(id: string) {
    const data = Buffer.from(JSON.stringify(["catalog-v1", id])).toString(
      "base64url",
    );
    return (
      data +
      "." +
      createHmac("sha256", this.key).update(data).digest("base64url")
    );
  }
  private decode(raw: string): string {
    if (raw.length > 256 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(raw))
      throw new CatalogError("INVALID_REQUEST");
    const [data, sig] = raw.split(".");
    const expected = createHmac("sha256", this.key)
      .update(data!)
      .digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig!), Buffer.from(expected)))
      throw new CatalogError("INVALID_REQUEST");
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(data!, "base64url").toString());
    } catch {
      throw new CatalogError("INVALID_REQUEST");
    }
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      value[0] !== "catalog-v1" ||
      typeof value[1] !== "string" ||
      !productIdPattern.test(value[1])
    )
      throw new CatalogError("INVALID_REQUEST");
    if (Buffer.from(JSON.stringify(value)).toString("base64url") !== data)
      throw new CatalogError("INVALID_REQUEST");
    return value[1];
  }
  query(request: CatalogRequest, list: boolean) {
    if (
      request.originalUrl.length > 2048 ||
      /%(?![a-fA-F0-9]{2})/.test(request.originalUrl)
    )
      throw new CatalogError("INVALID_REQUEST");
    const query = new URL(request.originalUrl, "http://127.0.0.1").searchParams;
    const allowed = list ? ["limit", "cursor"] : [];
    if (
      [...query.keys()].some(
        (k) => !allowed.includes(k) || query.getAll(k).length !== 1,
      )
    )
      throw new CatalogError("INVALID_REQUEST");
    const raw = query.get("limit");
    if (raw !== null && !/^(?:[1-9]|[1-9][0-9]|100)$/.test(raw))
      throw new CatalogError("INVALID_REQUEST");
    const cursor = query.get("cursor");
    return {
      limit: raw === null ? 20 : Number(raw),
      after: cursor === null ? null : this.decode(cursor),
    };
  }
  async run<T>(
    request: CatalogRequest,
    response: CatalogResponse,
    work: () => Promise<T>,
  ): Promise<T> {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    const now = Date.now(),
      ip = request.socket.remoteAddress ?? "unknown";
    for (const [key, bucket] of this.buckets)
      if (now - bucket.start >= 60000) this.buckets.delete(key);
    if (!this.buckets.has(ip) && this.buckets.size >= 1000)
      throw new CatalogError("RATE_LIMITED");
    const bucket = this.buckets.get(ip) ?? { start: now, count: 0 };
    this.buckets.set(ip, bucket);
    if (++bucket.count > 120) throw new CatalogError("RATE_LIMITED");
    if (this.active >= 8) throw new CatalogError("DEPENDENCY_UNAVAILABLE");
    this.active++;
    try {
      return await work();
    } finally {
      this.active--;
    }
  }
}
@Catch()
export class CatalogExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const code =
      error instanceof CatalogError ? error.code : "DEPENDENCY_UNAVAILABLE";
    const status = {
      INVALID_REQUEST: 400,
      RESOURCE_NOT_FOUND: 404,
      DEPENDENCY_UNAVAILABLE: 503,
      RATE_LIMITED: 429,
    }[code];
    const response = host.switchToHttp().getResponse<CatalogResponse>();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/problem+json");
    if (status === 429) response.setHeader("Retry-After", "60");
    response.status(status).json({
      type: "about:blank",
      title: "Solicitação não concluída",
      status,
      code,
      requestId: randomUUID(),
      instance: "/api/v1/catalog/products",
    });
  }
}
