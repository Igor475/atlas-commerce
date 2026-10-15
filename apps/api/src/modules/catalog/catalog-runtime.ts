import type { OnModuleDestroy } from "@nestjs/common";
import {
  CatalogReader,
  type PublicPricing,
  type CatalogRepository,
} from "./application/catalog-reader.js";
import { CatalogError } from "./domain/catalog.js";
import { CatalogDatabase } from "./infrastructure/catalog-database.js";
import { catalogEnabled } from "./infrastructure/catalog-config.js";
import { CatalogBoundary } from "./presentation/catalog-http.js";
export const CATALOG_RUNTIME = Symbol("CATALOG_RUNTIME");
export class CatalogRuntime implements OnModuleDestroy {
  readonly boundary = new CatalogBoundary();
  constructor(
    readonly reader?: CatalogReader,
    private readonly repository?: CatalogRepository,
  ) {}
  service() {
    if (!this.reader) throw new CatalogError("DEPENDENCY_UNAVAILABLE");
    return this.reader;
  }
  async onModuleDestroy() {
    await this.repository?.close();
  }
}
export const unavailablePricing: PublicPricing = {
  read: async () => {
    throw new CatalogError("DEPENDENCY_UNAVAILABLE");
  },
};
export function composeCatalog(env: NodeJS.ProcessEnv): CatalogRuntime {
  if (!catalogEnabled(env)) return new CatalogRuntime();
  const repository = new CatalogDatabase(
    env.CATALOG_RUNTIME_URL!,
    env.CATALOG_CONSENT,
  );
  return new CatalogRuntime(
    new CatalogReader(repository, unavailablePricing),
    repository,
  );
}
