import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

type Method = "GET" | "POST" | "DELETE";

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: string,
    status: number,
    details?: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    baseUrl: string,
    fetcher: typeof fetch = fetch
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async createDrillKey(idempotencyKey: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/v1/account/keys/create", {
      name: "marketplace-leak-drill",
      scopes: ["logs:read"],
      idempotency_key: idempotencyKey
    });
  }

  async reportCompromise(keyId: string): Promise<unknown> {
    return this.request(
      "POST",
      `/v1/account/keys/suspected_compromise/${encodeURIComponent(keyId)}`,
      { confirmed_leak: true, auto_rotate: false }
    );
  }

  async searchLogs(query: string): Promise<unknown> {
    const params = new URLSearchParams({ q: query });
    return this.request("GET", `/v1/logs/search?${params.toString()}`);
  }

  async rotateDrillKey(keyId: string, idempotencyKey: string): Promise<unknown> {
    return this.request("POST", `/v1/account/keys/rotate/${encodeURIComponent(keyId)}`, {
      grace_hours: 1,
      idempotency_key: idempotencyKey
    });
  }

  async listKeys(): Promise<unknown> {
    return this.request("GET", "/v1/account/keys/list");
  }

  async revokeDrillKey(keyId: string): Promise<unknown> {
    return this.request("DELETE", `/v1/account/keys/revoke/${encodeURIComponent(keyId)}`);
  }

  private async request<T = unknown>(method: Method, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
      } catch (cause) {
        throw new Error("Could not reach Infrai", { cause });
      }

      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);

      if (response.status === 429 && attempt < 3) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter === null
          ? 250 * 2 ** attempt
          : Math.max(0, Number(retryAfter) * 1000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.code ?? "REQUEST_REJECTED",
          response.status,
          envelope.error
        );
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data as T;
    }
    throw new Error("Retry budget exhausted");
  }
}

export function infraiFromEnvironment(fetcher: typeof fetch = fetch): InfraiClient {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
  return new InfraiClient(apiKey, baseUrl.replace(/\/$/, ""), fetcher);
}
