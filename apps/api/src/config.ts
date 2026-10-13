const DEFAULT_PORT = 3002;

export function readPort(value: string | undefined): number {
  if (value === undefined || value.length === 0) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("PORT deve ser um inteiro entre 1 e 65535.");
  }

  const port = Number(value);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT deve ser um inteiro entre 1 e 65535.");
  }

  return port;
}
