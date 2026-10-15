import {
  Controller,
  Get,
  Inject,
  Param,
  Req,
  Res,
  UseFilters,
} from "@nestjs/common";
import { CATALOG_RUNTIME, CatalogRuntime } from "../catalog-runtime.js";
import { CatalogError } from "../domain/catalog.js";
import {
  CatalogExceptionFilter,
  productIdPattern,
  type CatalogRequest,
  type CatalogResponse,
} from "./catalog-http.js";
@Controller("api/v1/catalog/products")
@UseFilters(CatalogExceptionFilter)
export class CatalogController {
  constructor(
    @Inject(CATALOG_RUNTIME) private readonly runtime: CatalogRuntime,
  ) {}
  @Get()
  list(
    @Req() request: CatalogRequest,
    @Res({ passthrough: true }) response: CatalogResponse,
  ) {
    return this.runtime.boundary.run(request, response, async () => {
      const { limit, after } = this.runtime.boundary.query(request, true);
      const page = await this.runtime.service().page(after, limit);
      return {
        items: page.items,
        nextCursor: page.last ? this.runtime.boundary.cursor(page.last) : null,
      };
    });
  }
  @Get(":productId")
  get(
    @Param("productId") id: string,
    @Req() request: CatalogRequest,
    @Res({ passthrough: true }) response: CatalogResponse,
  ) {
    return this.runtime.boundary.run(request, response, async () => {
      this.runtime.boundary.query(request, false);
      if (!productIdPattern.test(id))
        throw new CatalogError("RESOURCE_NOT_FOUND");
      return this.runtime.service().get(id);
    });
  }
}
