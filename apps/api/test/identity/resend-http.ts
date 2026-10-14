import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export async function resendHttpMock() {
  const requests: {
    headers: Record<string, string | string[] | undefined>;
    body: Record<string, unknown>;
  }[] = [];
  let status = 200,
    response: unknown = { id: "11111111-2222-4333-8444-555555555555" },
    retryAfter: string | undefined,
    hang = false;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += String(chunk);
    requests.push({
      headers: req.headers,
      body: JSON.parse(raw) as Record<string, unknown>,
    });
    if (hang) return;
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    if (retryAfter) res.setHeader("Retry-After", retryAfter);
    if (status === 302) res.setHeader("Location", "http://127.0.0.1:1/denied");
    res.end(JSON.stringify(response));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const local = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  const transport: typeof fetch = async (url, options) => {
    if (url !== "https://api.resend.com/emails")
      throw new Error("TEST_FIXED_ENDPOINT_REQUIRED");
    return fetch(local + "/emails", options);
  };
  return {
    requests,
    transport,
    reset() {
      requests.length = 0;
      status = 200;
      response = { id: "11111111-2222-4333-8444-555555555555" };
      retryAfter = undefined;
      hang = false;
    },
    reply(code: number, body: unknown = {}, retry?: string) {
      status = code;
      response = body;
      retryAfter = retry;
    },
    stall() {
      hang = true;
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
