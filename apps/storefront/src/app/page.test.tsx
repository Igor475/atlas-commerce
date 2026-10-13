import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StorefrontPage from "./page";

describe("storefront placeholder", () => {
  it("renders only the required technical content", () => {
    const html = renderToStaticMarkup(<StorefrontPage />);

    expect(html).toContain("<main>");
    expect(html).toContain("<h1>Atlas Commerce — Loja</h1>");
    expect(html).toContain(
      "Interface em preparação — não representa o design final",
    );
  });
});
