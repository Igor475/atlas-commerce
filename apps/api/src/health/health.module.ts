import { Logger, Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import {
  DB_READINESS,
  ReadOnlyProbe,
} from "../infrastructure/persistence/probe-readiness.js";
import { readProbeConfig } from "../infrastructure/persistence/probe-config.js";
@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: DB_READINESS,
      useFactory: () =>
        new ReadOnlyProbe(readProbeConfig(process.env), undefined, (code) =>
          Logger.warn(code, "DatabaseProbe"),
        ),
    },
  ],
})
export class HealthModule {}
