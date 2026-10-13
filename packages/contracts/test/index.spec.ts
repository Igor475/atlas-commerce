import { describe, expect, it } from "vitest";

import { BOOTSTRAP_STATUS } from "../src/index.js";

describe("bootstrap contract", () => {
  it("exports only the neutral skeleton marker", () => {
    expect(BOOTSTRAP_STATUS).toBe("SKELETON_ONLY");
  });
});
