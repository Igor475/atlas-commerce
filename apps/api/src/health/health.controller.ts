import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";

const LIVE_RESPONSE = Object.freeze({ status: "ok" as const });
const READY_RESPONSE = Object.freeze({
  status: "unavailable" as const,
  code: "DEPENDENCIES_NOT_CONFIGURED" as const,
});

@Controller("health")
export class HealthController {
  @Get("live")
  live(): typeof LIVE_RESPONSE {
    return LIVE_RESPONSE;
  }

  @Get("ready")
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  ready(): typeof READY_RESPONSE {
    return READY_RESPONSE;
  }
}
