import { describe, expect, it } from "vitest";

import { readPort } from "../src/config.js";

describe("readPort", () => {
  it("uses the documented local default", () => {
    expect(readPort(undefined)).toBe(3002);
  });

  it.each(["0", "65536", "not-a-port", "30.02"])(
    "rejects invalid input without echoing it: %s",
    (value) => {
      expect(() => readPort(value)).toThrow(
        "PORT deve ser um inteiro entre 1 e 65535.",
      );
    },
  );
});
