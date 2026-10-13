import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { readPort } from "./config.js";

async function bootstrap(): Promise<void> {
  const port = readPort(process.env.PORT);
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");
  Logger.log(`API técnica disponível na porta ${port}.`, "Bootstrap");
}

void bootstrap();
