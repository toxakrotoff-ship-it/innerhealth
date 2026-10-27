import 'server-only';
import type { z } from 'zod';
import type { BrandId } from '@/lib/brand/brand';
import { getOzonDeliveryConfig, type OzonDeliveryConfig } from './config';
import {
  ozonCheckClientSchema, ozonCheckoutSchema, ozonCreateOrderSchema,
  ozonDeliveryPointsListSchema, ozonDeliveryPointsSchema, ozonPostingInfoSchema, ozonTokenSchema,
  type OzonCheckoutRequest, type OzonCheckoutResponse, type OzonCreateOrderRequest,
  type OzonCreateOrderResponse, type OzonDeliveryPoint, type OzonDeliveryPointsListResponse,
  type OzonPostingInfoResponse,
} from './types';

const API_ORIGIN = 'https://api-delivery.ozon.ru';
const TOKEN_URL = 'https://xapi.ozon.ru/oauth/token';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const SCOPES = ['delivery-api.delivery', 'delivery-api.delivery-point', 'delivery-api.order', 'delivery-api.posting'];

export type OzonDeliveryFailure = 'http' | 'network' | 'timeout' | 'invalid_response' | 'redirect' | 'antibot';

/** Deliberately excludes upstream messages, response bodies and recipient data. */
export class OzonDeliveryError extends Error {
  constructor(
    public readonly status: number = 502,
    public readonly failure: OzonDeliveryFailure = 'http',
    public readonly phase: 'oauth' | 'api' = 'api',
  ) {
    super('Ozon Delivery request failed');
    this.name = 'OzonDeliveryError';
  }
}

export class OzonDeliveryClient {
  private token?: { value: string; expiresAt: number };
  private tokenRequest?: Promise<string>;
  private readonly cookies = new Map<string, Map<string, string>>();
  private readonly timeoutMs: number;

  constructor(private readonly config: OzonDeliveryConfig, options: { timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 60_000) {
      throw new Error('Invalid Ozon Delivery timeout');
    }
  }

  checkClient(phone: string): Promise<{ can_be_delivered: boolean }> {
    return this.request('/v1/delivery/check-client', { phone_number: phone }, ozonCheckClientSchema);
  }

  listDeliveryPoints(cursor?: string): Promise<OzonDeliveryPointsListResponse> {
    return this.request('/v1/delivery-point/list', { pagination: { cursor: cursor || null, limit: 1000 } }, ozonDeliveryPointsListSchema);
  }

  getDeliveryPoints(ids: number[]): Promise<{ delivery_points: OzonDeliveryPoint[] }> {
    if (!ids.length || ids.length > 1000 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      return Promise.reject(new OzonDeliveryError(400));
    }
    return this.request('/v1/delivery-point/info', { delivery_point_ids: ids }, ozonDeliveryPointsSchema);
  }

  checkout(body: OzonCheckoutRequest): Promise<OzonCheckoutResponse> {
    return this.request('/v1/order/checkout', body, ozonCheckoutSchema);
  }

  createOrder(body: OzonCreateOrderRequest, idempotencyKey: string): Promise<OzonCreateOrderResponse> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return Promise.reject(new OzonDeliveryError(400));
    }
    return this.request('/v1/order/create', body, ozonCreateOrderSchema, { 'Idempotency-Key': idempotencyKey });
  }

  postingInfo(postingNumbers: string[]): Promise<OzonPostingInfoResponse> {
    if (!postingNumbers.length || postingNumbers.length > 100 || postingNumbers.some((number) => !number.trim())) {
      return Promise.reject(new OzonDeliveryError(400));
    }
    return this.request('/v1/posting/info', { posting_numbers: postingNumbers }, ozonPostingInfoSchema);
  }

  approvePosting(postingNumber: string): Promise<void> {
    if (!postingNumber.trim()) return Promise.reject(new OzonDeliveryError(400));
    return this.request('/v1/posting/approve', { posting_number: postingNumber });
  }

  postingLabel(postingNumber: string): Promise<Uint8Array> {
    if (!postingNumber.trim()) return Promise.reject(new OzonDeliveryError(400));
    return this.request<Uint8Array>('/v1/posting/label', { posting_number: postingNumber }, 'pdf');
  }

  private async request<T = void>(path: string, body: unknown, schema?: z.ZodType<T> | 'pdf', extraHeaders: Record<string, string> = {}): Promise<T> {
    return this.withTimeout(async (signal) => {
      let token = await this.getToken(signal);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await this.post(`${API_ORIGIN}${path}`, body, {
          Authorization: `Bearer ${token}`, ...extraHeaders,
        }, signal);
        // Authentication rejection is the only retry; ambiguous mutation failures are never retried.
        if (response.status === 401 && attempt === 0) {
          await response.body?.cancel();
          if (this.token?.value === token) this.token = undefined;
          token = await this.getToken(signal);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new OzonDeliveryError(response.status);
        }
        if (!schema) {
          await response.body?.cancel();
          return undefined as T;
        }
        if (schema === 'pdf') {
          if (response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/pdf') {
            await response.body?.cancel();
            throw new OzonDeliveryError(502, 'invalid_response');
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new OzonDeliveryError(502, 'invalid_response');
          return bytes as T;
        }
        return this.parseResponse(response, schema);
      }
      throw new OzonDeliveryError(401);
    });
  }

  private async getToken(signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    if (!this.tokenRequest) {
      this.tokenRequest = (async () => {
        const response = await this.post(TOKEN_URL, {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: SCOPES,
        }, {}, signal);
        if (!response.ok) {
          await response.body?.cancel();
          throw new OzonDeliveryError(response.status, 'http', 'oauth');
        }
        const data = await this.parseResponse(response, ozonTokenSchema, 'oauth');
        const now = Date.now();
        // Ozon also returns an absolute Unix timestamp in expires_in.
        // Retain support for relative lifetimes used by OAuth-compatible responses.
        const expiresAt = data.expires_in >= 1_000_000_000 ? data.expires_in * 1000 : now + data.expires_in * 1000;
        const lifetime = expiresAt - now;
        if (lifetime <= 0) throw new OzonDeliveryError(502, 'invalid_response', 'oauth');
        this.token = { value: data.access_token, expiresAt: expiresAt - Math.min(30_000, lifetime / 10) };
        return data.access_token;
      })().finally(() => { this.tokenRequest = undefined; });
    }
    return this.tokenRequest;
  }

  private async parseResponse<T>(response: Response, schema: z.ZodType<T>, phase: 'oauth' | 'api' = 'api'): Promise<T> {
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new OzonDeliveryError(502, 'invalid_response', phase); }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new OzonDeliveryError(502, 'invalid_response', phase);
    return parsed.data;
  }

  /** Ozon's testcookie challenge uses 302: preserve POST and cookies explicitly. */
  private async post(url: string, body: unknown, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
    const origin = new URL(url).origin;
    const phase = origin === new URL(TOKEN_URL).origin ? 'oauth' : 'api';
    const serializedBody = JSON.stringify(body);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      signal.throwIfAborted();
      const jar = this.cookies.get(origin);
      const cookie = jar ? Array.from(jar, ([key, value]) => `${key}=${value}`).join('; ') : '';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers, ...(cookie ? { Cookie: cookie } : {}) },
        body: serializedBody,
        redirect: 'manual',
        cache: 'no-store',
        signal,
      }).catch(() => { throw new OzonDeliveryError(signal.aborted ? 504 : 502, signal.aborted ? 'timeout' : 'network', phase); });
      this.collectCookies(origin, response.headers);
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        if (response.headers.get('antibot') === '1') {
          await response.body?.cancel();
          throw new OzonDeliveryError(response.status, 'antibot', phase);
        }
        return response;
      }
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === MAX_REDIRECTS) throw new OzonDeliveryError(502, 'redirect', phase);
      const target = new URL(location, url);
      if (target.origin !== origin || target.username || target.password) throw new OzonDeliveryError(502, 'redirect', phase);
      // 301/303 can change request semantics; only the documented challenge redirects are accepted.
      if (response.status !== 302 && response.status !== 307 && response.status !== 308) throw new OzonDeliveryError(502, 'redirect', phase);
      url = target.href;
    }
    throw new OzonDeliveryError(502, 'redirect', phase);
  }

  private collectCookies(origin: string, headers: Headers): void {
    const values = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (headers.get('set-cookie')?.split(/,(?=\s*[^;,\s]+=)/) ?? []);
    if (!values.length) return;
    const jar = this.cookies.get(origin) ?? new Map<string, string>();
    for (const value of values) {
      const pair = value.split(';', 1)[0];
      const separator = pair.indexOf('=');
      if (separator > 0) jar.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
    this.cookies.set(origin, jar);
  }

  private async withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new OzonDeliveryError(504, 'timeout'));
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([operation(controller.signal), timeout]);
    } catch (error) {
      if (controller.signal.aborted) throw new OzonDeliveryError(504, 'timeout');
      if (error instanceof OzonDeliveryError) throw error;
      throw new OzonDeliveryError(502, 'network');
    } finally {
      clearTimeout(timer!);
    }
  }
}

const clients = new Map<BrandId | null, { config: OzonDeliveryConfig; client: OzonDeliveryClient }>();

export async function getOzonDeliveryClient(brandId: BrandId | null, options: { includeDisabled?: boolean } = {}): Promise<OzonDeliveryClient | null> {
  const config = await getOzonDeliveryConfig(brandId, options);
  if (!config) {
    clients.delete(brandId);
    return null;
  }
  const cached = clients.get(brandId);
  if (cached && cached.config.clientId === config.clientId && cached.config.clientSecret === config.clientSecret
    && cached.config.shipmentMethodId === config.shipmentMethodId && cached.config.handlingHours === config.handlingHours) return cached.client;
  const client = new OzonDeliveryClient(config);
  clients.set(brandId, { config, client });
  return client;
}
