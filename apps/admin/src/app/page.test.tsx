import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminPage from "./page";

describe("admin placeholder", () => {
  it("renders only the required technical content", () => {
    const html = renderToStaticMarkup(<AdminPage />);

    expect(html).toContain("<main>");
    expect(html).toContain("<h1>Atlas Commerce — Administração</h1>");
    expect(html).toContain(
      "Interface em preparação — não representa o design final",
    );
  });
});
