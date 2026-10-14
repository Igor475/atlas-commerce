import { Global, Module } from "@nestjs/common";
import { IDENTITY_RUNTIME, composeIdentity } from "./identity-runtime.js";
import { IdentityController } from "./presentation/identity.controller.js";
@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: IDENTITY_RUNTIME,
      useFactory: () => composeIdentity(process.env),
    },
  ],
  exports: [IDENTITY_RUNTIME],
})
export class IdentityModule {}
