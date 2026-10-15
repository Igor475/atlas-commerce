import type { NestExpressApplication } from "@nestjs/platform-express";
import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { readPort } from "./config.js";
import { configureIdentityHttp } from "./modules/identity/presentation/identity-http.js";
import { readIdentityConfig } from "./modules/identity/infrastructure/identity-config.js";
import { catalogEnabled } from "./modules/catalog/infrastructure/catalog-config.js";

async function bootstrap(): Promise<void> {
  const port = readPort(process.env.PORT);
  const identity = readIdentityConfig(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  configureIdentityHttp(app);

  app.enableShutdownHooks();
  await app.listen(
    port,
    identity.enabled || catalogEnabled(process.env) ? "127.0.0.1" : "0.0.0.0",
  );
  Logger.log(`API técnica disponível na porta ${port}.`, "Bootstrap");
}

void bootstrap();
