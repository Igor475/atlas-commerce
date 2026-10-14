import { Global, Module } from "@nestjs/common";
import { IDENTITY_RUNTIME, IdentityRuntime } from "./identity-runtime.js";
import { readIdentityConfig } from "./infrastructure/identity-config.js";
import { IdentityController } from "./presentation/identity.controller.js";
@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: IDENTITY_RUNTIME,
      useFactory: () => new IdentityRuntime(readIdentityConfig(process.env)),
    },
  ],
  exports: [IDENTITY_RUNTIME],
})
export class IdentityModule {}
