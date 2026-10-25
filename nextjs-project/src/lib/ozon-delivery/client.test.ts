import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OzonDeliveryClient, OzonDeliveryError } from './client';
import type { OzonCreateOrderRequest } from './types';

const config = { clientId: 'client', clientSecret: 'secret', shipmentMethodId: 7, handlingHours: 24 };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const token = () => json({ access_token: 'oauth-token', expires_in: 3600 });
const available = () => json({ can_be_delivered: true });
const uuid = '7363aaba-03ef-40c6-833d-4fa1d5a4beea';
const order: OzonCreateOrderRequest = {
  order_external_id: 'order-1',
  recipient: { phone_number: '+79990001122', full_name: 'Recipient' },
  delivery: { delivery_point: { delivery_point_id: 1 } },
  postings: [{
    request_id: 1, shipment_method_id: 7, posting_external_id: 'posting-1', description: 'Goods',
    cutoff_at: '2026-10-27T00:00:00Z', declared_value: { amount: '100', currency_code: 'RUB' },
    dimensions: { weight_g: 100, length_mm: 100, width_mm: 100, height_mm: 100 },
  }],
};

vi.mock('server-only', () => ({}));

describe('Ozon Delivery API client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('authenticates once for concurrent calls and caches the token', async () => {
    fetchMock.mockResolvedValueOnce(token()).mockImplementation(async () => available());
    const client = new OzonDeliveryClient(config);
    await Promise.all([client.checkClient('+79990001122'), client.checkClient('+79990001122')]);
    await client.checkClient('+79990001122');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://xapi.ozon.ru/oauth/token');
    expect(JSON.parse(init!.body as string)).toEqual({
      client_id: 'client', client_secret: 'secret', grant_type: 'client_credentials',
      scope: ['delivery-api.delivery', 'delivery-api.delivery-point', 'delivery-api.order', 'delivery-api.posting'],
    });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ redirect: 'manual', cache: 'no-store', headers: { Authorization: 'Bearer oauth-token' } });
  });

  it.each([302, 307])('preserves OAuth POST body and testcookie on %s redirect', async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status, headers: {
      location: '/oauth/token?testcookie=1', 'set-cookie': 'testcookie=ok; Path=/; Secure; HttpOnly',
    } })).mockResolvedValueOnce(token()).mockResolvedValueOnce(available());
    await new OzonDeliveryClient(config).checkClient('+79990001122');
    expect(fetchMock.mock.calls[1][0]).toBe('https://xapi.ozon.ru/oauth/token?testcookie=1');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', body: fetchMock.mock.calls[0][1]!.body, headers: { Cookie: 'testcookie=ok' } });
    expect(fetchMock.mock.calls[2][1]!.headers).not.toHaveProperty('Cookie');
  });

  it('preserves API authorization, body and cookies while following the challenge', async () => {
    fetchMock.mockResolvedValueOnce(token())
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/v1/delivery/check-client?testcookie=1', 'set-cookie': 'challenge=ok; Path=/' } }))
      .mockResolvedValueOnce(available());
    await new OzonDeliveryClient(config).checkClient('+79990001122');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: 'POST', body: JSON.stringify({ phone_number: '+79990001122' }),
      headers: { Cookie: 'challenge=ok', Authorization: 'Bearer oauth-token' },
    });
  });

  it.each(['https://untrusted.example/token', 'http://xapi.ozon.ru/token', 'https://user:pass@xapi.ozon.ru/token'])('refuses credential-bearing redirect to %s', async (location) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
    await expect(new OzonDeliveryClient(config).checkClient('+79990001122')).rejects.toBeInstanceOf(OzonDeliveryError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bounds redirect loops', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: '/oauth/token?testcookie=1' } }));
    await expect(new OzonDeliveryClient(config).checkClient('+79990001122')).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('refreshes once on 401 and keeps concurrent refreshes singleflight', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('/oauth/token')) return json({ access_token: fetchMock.mock.calls.length === 1 ? 'old-token' : 'new-token', expires_in: 3600 });
      return (init!.headers as Record<string, string>).Authorization === 'Bearer old-token' ? json({}, 401) : available();
    });
    const client = new OzonDeliveryClient(config);
    await Promise.all([client.checkClient('+79990001122'), client.checkClient('+79990001122')]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/oauth/token'))).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('does not loop on persistent 401', async () => {
    fetchMock.mockImplementation(async (url) => String(url).includes('/oauth/token') ? token() : json({}, 401));
    await expect(new OzonDeliveryClient(config).checkClient('+79990001122')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry failed mutations and never exposes upstream payloads', async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ phone_number: '+79990001122', secret: 'secret' }, 500));
    const error = await new OzonDeliveryClient(config).createOrder(order, uuid).catch((value) => value);
    expect(error).toMatchObject({ status: 500, message: 'Ozon Delivery request failed' });
    expect(JSON.stringify(error)).not.toContain('+79990001122');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: { 'Idempotency-Key': uuid }, body: JSON.stringify(order) });
  });

  it('rejects missing and malformed OAuth fields before any API request', async () => {
    fetchMock.mockResolvedValueOnce(json({ access_token: '', expires_in: '3600' }));
    await expect(new OzonDeliveryClient(config).checkClient('+79990001122')).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed mutation success responses without retrying', async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ order_number: '1' }));
    await expect(new OzonDeliveryClient(config).createOrder(order, uuid)).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the order checkout endpoint and validates prices', async () => {
    const quote = { results: [{ request_id: 1, posting: {
      estimated_delivery_cost: { amount: '149.90', currency_code: 'RUB' },
      estimated_insurance_cost: { amount: '1.00', currency_code: 'RUB' },
      estimated_delivery_days: 2, cutoff_at: '2026-10-27T00:00:00Z',
    } }] };
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json(quote));
    await expect(new OzonDeliveryClient(config).checkout(order)).resolves.toEqual(quote);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api-delivery.ozon.ru/v1/order/checkout');
  });

  it('sends paginated points, point details and posting info in documented shapes', async () => {
    fetchMock.mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json({ delivery_points: [{ delivery_point_id: 1, shipment_method_ids: 7 }], next_cursor: 'next' }))
      .mockResolvedValueOnce(json({ delivery_points: [{ delivery_point_id: 1, name: 'Point', full_address: 'Address', type: 'pvz', is_active: true }] }))
      .mockResolvedValueOnce(json({ postings: [{ posting_number: '1', status: 'on_way' }] }));
    const client = new OzonDeliveryClient(config);
    await expect(client.listDeliveryPoints('cursor')).resolves.toMatchObject({ next_cursor: 'next' });
    await client.getDeliveryPoints([1]);
    await expect(client.postingInfo(['1'])).resolves.toEqual({ postings: [{ posting_number: '1', status: 'on_way' }] });
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ pagination: { cursor: 'cursor', limit: 1000 } });
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string)).toEqual({ delivery_point_ids: [1] });
    expect(JSON.parse(fetchMock.mock.calls[3][1]!.body as string)).toEqual({ posting_numbers: ['1'] });
  });

  it('refreshes expired tokens before the next API call', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json({ access_token: 'short-token', expires_in: 1 }))
      .mockResolvedValueOnce(available()).mockResolvedValueOnce(token()).mockResolvedValueOnce(available());
    const client = new OzonDeliveryClient(config);
    await client.checkClient('+79990001122');
    await vi.advanceTimersByTimeAsync(1000);
    await client.checkClient('+79990001122');
    expect(fetchMock.mock.calls[2][0]).toBe('https://xapi.ozon.ru/oauth/token');
    expect(fetchMock.mock.calls[3][1]!.headers).toMatchObject({ Authorization: 'Bearer oauth-token' });
  });

  it('accepts the create response and singular empty approval response', async () => {
    const created = { order_number: '1', postings: [{ request_id: 1, posting_number: 'posting-1', estimated_delivery_days: 2, cutoff_at: '2026-10-27T00:00:00Z' }] };
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json(created)).mockResolvedValueOnce(new Response(null));
    const client = new OzonDeliveryClient(config);
    await expect(client.createOrder(order, uuid)).resolves.toEqual(created);
    await expect(client.approvePosting('posting-1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[2]).toMatchObject(['https://api-delivery.ozon.ru/v1/posting/approve', { body: JSON.stringify({ posting_number: 'posting-1' }) }]);
  });

  it('downloads PDF labels through the same authenticated cookie redirect transport', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.7\nlabel');
    fetchMock.mockResolvedValueOnce(token())
      .mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: '/v1/posting/label?testcookie=1', 'set-cookie': 'testcookie=ok; Path=/' } }))
      .mockResolvedValueOnce(new Response(pdf, { headers: { 'content-type': 'application/pdf' } }));
    await expect(new OzonDeliveryClient(config).postingLabel('1')).resolves.toEqual(pdf);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api-delivery.ozon.ru/v1/posting/label');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ posting_number: '1' }), headers: { Authorization: 'Bearer oauth-token', Cookie: 'testcookie=ok' } });
  });

  it.each([
    { contentType: 'text/html', body: '<html>challenge</html>' },
    { contentType: 'application/pdf', body: 'invalid bytes' },
  ])('rejects invalid PDF label responses: $contentType', async ({ contentType, body }) => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response(body, { headers: { 'content-type': contentType } }));
    await expect(new OzonDeliveryClient(config).postingLabel('1')).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not forward label credentials to an external redirect', async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://files.example/label.pdf' } }));
    await expect(new OzonDeliveryClient(config).postingLabel('1')).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bounds total elapsed time including OAuth and aborts the fetch', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const call = new OzonDeliveryClient(config, { timeoutMs: 100 }).checkClient('+79990001122');
    const rejected = expect(call).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });

  it('rejects invalid idempotency keys and oversized batches before sending requests', async () => {
    const client = new OzonDeliveryClient(config);
    await expect(client.createOrder(order, 'bad-key')).rejects.toMatchObject({ status: 400 });
    await expect(client.getDeliveryPoints(Array(1001).fill(1))).rejects.toMatchObject({ status: 400 });
    await expect(client.postingInfo(Array(101).fill('1'))).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
