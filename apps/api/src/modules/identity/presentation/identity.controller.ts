import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import { IDENTITY_RUNTIME, IdentityRuntime } from "../identity-runtime.js";
import { IdentityError } from "../domain/identity.js";
import {
  normalizeEmail,
  normalizePassword,
} from "../application/customer-identity.js";
import {
  bootstrapCsrf,
  cookie,
  metadata,
  names,
  objectBody,
  tokenBody,
  uniform,
  validateCsrf,
  type IdentityRequest,
  type IdentityResponse,
} from "./identity-http.js";
@Controller("api/v1")
export class IdentityController {
  constructor(
    @Inject(IDENTITY_RUNTIME) private readonly runtime: IdentityRuntime,
  ) {}
  private async prepare(
    request: IdentityRequest,
    response: IdentityResponse,
    mutate: boolean,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Vary", "Origin, Cookie");
    const meta = metadata(this.runtime, request);
    if (mutate) validateCsrf(this.runtime, request, meta.csrf, meta.session);
    await this.runtime.service().limit(meta.ip, "http");
    return meta;
  }
  @Get("auth/csrf")
  async csrf(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    const meta = await this.prepare(request, response, false);
    const csrf = bootstrapCsrf(this.runtime, meta.session);
    response.setHeader(
      "Set-Cookie",
      cookie(this.runtime, names(this.runtime).csrf, csrf.context, 1800),
    );
    response.status(200).json({ csrfToken: csrf.token });
  }
  @Post("auth/register")
  async register(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    await uniform(async () => {
      const meta = await this.prepare(request, response, true);
      const body = objectBody(request, ["email", "password"]),
        email = normalizeEmail(body.email);
      const password = normalizePassword(body.password, true, email);
      await this.runtime.service().limit(meta.ip, "register", email);
      await this.runtime.service().register(email, password, meta.requestId);
    });
    response.status(202).json({ state: "ACCEPTED" });
  }
  @Post("auth/verify-email")
  async verify(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    const meta = await this.prepare(request, response, true),
      body = objectBody(request, ["token"]);
    await this.runtime.service().verify(tokenBody(body.token), meta.requestId);
    response.status(204).end();
  }
  private async requestToken(
    request: IdentityRequest,
    response: IdentityResponse,
    recovery: boolean,
  ) {
    await uniform(async () => {
      const meta = await this.prepare(request, response, true),
        body = objectBody(request, ["email"]);
      const email = normalizeEmail(body.email);
      await this.runtime
        .service()
        .limit(meta.ip, recovery ? "recovery" : "resend", email);
      await this.runtime
        .service()
        .requestToken(
          email,
          recovery ? "RESET_PASSWORD" : "VERIFY_EMAIL",
          meta.requestId,
        );
    });
    response.status(202).json({ state: "ACCEPTED" });
  }
  @Post("auth/verify-email/resend")
  resend(@Req() request: IdentityRequest, @Res() response: IdentityResponse) {
    return this.requestToken(request, response, false);
  }
  @Post("auth/recovery/request")
  recoveryRequest(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    return this.requestToken(request, response, true);
  }
  @Post("auth/recovery/complete")
  async recover(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    await uniform(async () => {
      const meta = await this.prepare(request, response, true),
        body = objectBody(request, ["token", "password"]);
      await this.runtime
        .service()
        .recover(
          tokenBody(body.token),
          normalizePassword(body.password, true),
          meta.requestId,
        );
    });
    response.status(204).end();
  }
  @Post("auth/login")
  async login(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    const token = await uniform(async () => {
      const meta = await this.prepare(request, response, true),
        body = objectBody(request, ["email", "password", "context"]);
      if (body.context !== "CUSTOMER")
        throw new IdentityError(
          body.context === "STAFF" ? "FORBIDDEN" : "INVALID_REQUEST",
        );
      const email = normalizeEmail(body.email),
        password = normalizePassword(body.password, false);
      await this.runtime.service().limit(meta.ip, "login", email);
      return this.runtime
        .service()
        .login(email, password, meta.session, meta.requestId);
    });
    response.setHeader(
      "Set-Cookie",
      cookie(
        this.runtime,
        names(this.runtime).session,
        token,
        this.runtime.config.absoluteSeconds,
      ),
    );
    response.status(200).json({ state: "AUTHENTICATED" });
  }
  @Get("me")
  async me(@Req() request: IdentityRequest, @Res() response: IdentityResponse) {
    const meta = await this.prepare(request, response, false);
    response.status(200).json(await this.runtime.service().me(meta.session));
  }
  private async endSession(
    request: IdentityRequest,
    response: IdentityResponse,
    all: boolean,
  ) {
    const meta = await this.prepare(request, response, true);
    objectBody(request, []);
    await this.runtime.service().logout(meta.session, all, meta.requestId);
    response.setHeader(
      "Set-Cookie",
      cookie(this.runtime, names(this.runtime).session, "", 0),
    );
    response.status(204).end();
  }
  @Post("auth/logout")
  logout(@Req() request: IdentityRequest, @Res() response: IdentityResponse) {
    return this.endSession(request, response, false);
  }
  @Post("auth/logout-all")
  logoutAll(
    @Req() request: IdentityRequest,
    @Res() response: IdentityResponse,
  ) {
    return this.endSession(request, response, true);
  }
}
