import { Logger, Module } from "@nestjs/common";
import {
  IDENTITY_RUNTIME,
  IdentityRuntime,
} from "../modules/identity/identity-runtime.js";
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
      inject: [IDENTITY_RUNTIME],
      useFactory: (identity: IdentityRuntime) => {
        const probe = new ReadOnlyProbe(
          readProbeConfig(process.env),
          undefined,
          (code) => Logger.warn(code, "DatabaseProbe"),
        );
        return {
          get configured() {
            return probe.configured || identity.config.enabled;
          },
          async check() {
            return (
              (!probe.configured || (await probe.check())) &&
              (!identity.config.enabled || (await identity.ready()))
            );
          },
          async onApplicationShutdown() {
            await probe.onApplicationShutdown();
          },
        };
      },
    },
  ],
})
export class HealthModule {}
