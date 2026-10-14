import { HttpException } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import type { IncomingMessage } from "node:http";
import type { HttpServer, ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { IdentityError } from "../domain/identity.js";
import type { IdentityRuntime } from "../identity-runtime.js";
export interface IdentityRequest extends IncomingMessage {
  body?: unknown;
}
export interface IdentityResponse {
  status(code: number): IdentityResponse;
  json(value: unknown): void;
  end(): void;
  setHeader(name: string, value: string | string[]): void;
}
export function objectBody(
  request: IdentityRequest,
  keys: string[],
): Record<string, unknown> {
  const body = request.body ?? {};
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(body, key))
  )
    throw new IdentityError("INVALID_REQUEST");
  return body as Record<string, unknown>;
}
export function tokenBody(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new IdentityError("INVALID_REQUEST");
  return value;
}
function header(request: IdentityRequest, name: string): string | undefined {
  const raw = request.headers[name];
  if (Array.isArray(raw)) throw new IdentityError("INVALID_REQUEST");
  const duplicates = request.rawHeaders.filter(
    (_, index) =>
      index % 2 === 0 && request.rawHeaders[index]?.toLowerCase() === name,
  );
  if (duplicates.length > 1) throw new IdentityError("INVALID_REQUEST");
  return raw;
}
export function names(runtime: IdentityRuntime) {
  return runtime.config.secureCookie
    ? { session: "__Host-atlas_session", csrf: "__Host-atlas_csrf" }
    : { session: "atlas_identity_local", csrf: "atlas_csrf_local" };
}
function cookies(request: IdentityRequest): Map<string, string> {
  const cookie = header(request, "cookie") ?? "";
  if (cookie.length > 4096) throw new IdentityError("INVALID_REQUEST");
  const result = new Map<string, string>();
  for (const item of cookie.split(";").filter(Boolean)) {
    const split = item.trim().indexOf("=");
    if (split < 1) throw new IdentityError("INVALID_REQUEST");
    const key = item.trim().slice(0, split),
      value = item.trim().slice(split + 1);
    if (result.has(key)) throw new IdentityError("INVALID_REQUEST");
    result.set(key, value);
  }
  return result;
}
export function cookie(
  runtime: IdentityRuntime,
  name: string,
  value: string,
  maxAge: number,
): string {
  return (
    name +
    "=" +
    value +
    "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" +
    maxAge +
    (runtime.config.secureCookie ? "; Secure" : "")
  );
}
export function metadata(runtime: IdentityRuntime, request: IdentityRequest) {
  runtime.service();
  if (header(request, "origin") !== runtime.config.origin)
    throw new IdentityError("FORBIDDEN");
  const referer = header(request, "referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== runtime.config.origin) throw new Error();
    } catch {
      throw new IdentityError("FORBIDDEN");
    }
  }
  if (
    Object.keys(request.headers).some(
      (key) => key === "forwarded" || key.startsWith("x-forwarded-"),
    )
  )
    throw new IdentityError("FORBIDDEN");
  if (request.url?.includes("?")) throw new IdentityError("INVALID_REQUEST");
  const ip = request.socket.remoteAddress ?? "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip))
    throw new IdentityError("FORBIDDEN");
  const values = cookies(request),
    pair = names(runtime);
  const session = values.get(pair.session) ?? "";
  if (session && !/^[A-Za-z0-9_-]{43}$/.test(session))
    throw new IdentityError("UNAUTHENTICATED");
  return {
    ip,
    session,
    csrf: values.get(pair.csrf) ?? "",
    requestId: randomUUID(),
  };
}
export function csrfToken(
  runtime: IdentityRuntime,
  context: string,
  session: string,
): string {
  return runtime.crypto.digest(
    "csrf-token",
    context +
      "\0" +
      runtime.config.origin +
      "\0" +
      runtime.crypto.digest("session", session),
  );
}
export function bootstrapCsrf(runtime: IdentityRuntime, session: string) {
  const unsigned = runtime.crypto.random() + "." + Date.now();
  const context =
    unsigned +
    "." +
    runtime.crypto.digest(
      "csrf-cookie",
      unsigned + "\0" + runtime.config.origin,
    );
  return { context, token: csrfToken(runtime, context, session) };
}
export function validateCsrf(
  runtime: IdentityRuntime,
  request: IdentityRequest,
  context: string,
  session: string,
): void {
  if (
    header(request, "content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    throw new IdentityError("INVALID_REQUEST");
  const parts = /^([A-Za-z0-9_-]{43})\.(\d{13})\.([a-f0-9]{64})$/.exec(context);
  const supplied = header(request, "x-csrf-token");
  if (!parts || !supplied || !/^[a-f0-9]{64}$/.test(supplied))
    throw new IdentityError("CSRF_INVALID");
  const age = Date.now() - Number(parts[2]);
  if (age < 0 || age > 1800000) throw new IdentityError("CSRF_INVALID");
  const expected = runtime.crypto.digest(
    "csrf-cookie",
    parts[1] + "." + parts[2] + "\0" + runtime.config.origin,
  );
  if (
    !timingSafeEqual(Buffer.from(expected), Buffer.from(parts[3]!)) ||
    !timingSafeEqual(
      Buffer.from(csrfToken(runtime, context, session)),
      Buffer.from(supplied),
    )
  )
    throw new IdentityError("CSRF_INVALID");
}
export async function uniform<T>(work: () => Promise<T>): Promise<T> {
  const started = performance.now(),
    minimum = 120 + randomInt(16);
  try {
    return await work();
  } finally {
    await pause(Math.max(0, minimum - (performance.now() - started)));
  }
}
export class IdentityExceptionFilter extends BaseExceptionFilter {
  constructor(adapter: HttpServer) {
    super(adapter);
  }
  override catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<IdentityRequest>();
    if (
      !request.url?.startsWith("/api/v1/auth/") &&
      request.url !== "/api/v1/me"
    ) {
      super.catch(error, host);
      return;
    }
    const response = host.switchToHttp().getResponse<IdentityResponse>();
    const parserError =
      (error instanceof HttpException &&
        [400, 413, 415].includes(error.getStatus())) ||
      (typeof error === "object" &&
        error !== null &&
        "type" in error &&
        ["entity.too.large", "entity.parse.failed"].includes(
          String(error.type),
        ));
    const code =
      error instanceof IdentityError
        ? error.code
        : parserError
          ? "INVALID_REQUEST"
          : "DEPENDENCY_UNAVAILABLE";
    const status = {
      INVALID_REQUEST: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      CSRF_INVALID: 403,
      RATE_LIMITED: 429,
      DEPENDENCY_UNAVAILABLE: 503,
    }[code];
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/problem+json");
    if (error instanceof IdentityError && error.retryAfter)
      response.setHeader("Retry-After", String(error.retryAfter));
    response.status(status).json({
      type: "about:blank",
      title: "Solicitação não concluída",
      status,
      code,
      requestId: randomUUID(),
      instance: request.url === "/api/v1/me" ? "/api/v1/me" : "/api/v1/auth",
    });
  }
}
export function configureIdentityHttp(app: NestExpressApplication): void {
  // Used with Nest bodyParser:false in main and in the real HTTP test harness.
  app.useBodyParser("json", { limit: "4kb", strict: true });
  app.useGlobalFilters(new IdentityExceptionFilter(app.getHttpAdapter()));
}
