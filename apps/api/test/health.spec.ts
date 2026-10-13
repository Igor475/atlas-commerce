import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";

describe("health routes", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("reports liveness without external dependencies", async () => {
    const response = await request(app.getHttpServer()).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("does not claim readiness before dependencies exist", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "unavailable",
      code: "DEPENDENCIES_NOT_CONFIGURED",
    });
  });
});
