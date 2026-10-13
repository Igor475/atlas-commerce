import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  DB_READINESS,
  type DatabaseReadiness,
} from "../infrastructure/persistence/probe-readiness.js";
const LIVE_RESPONSE = Object.freeze({ status: "ok" as const });
@Controller("health")
export class HealthController {
  constructor(
    @Inject(DB_READINESS) private readonly database: DatabaseReadiness,
  ) {}
  @Get("live") live(): typeof LIVE_RESPONSE {
    return LIVE_RESPONSE;
  }
  @Get("ready") async ready(): Promise<{ status: "ok" }> {
    if (!this.database.configured)
      throw new ServiceUnavailableException({
        status: "unavailable",
        code: "DEPENDENCIES_NOT_CONFIGURED",
      });
    if (!(await this.database.check()))
      throw new ServiceUnavailableException({
        status: "unavailable",
        code: "DEPENDENCY_UNAVAILABLE",
      });
    return { status: "ok" };
  }
}
