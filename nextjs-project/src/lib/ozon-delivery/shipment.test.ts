import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOzonShipmentAfterPayment, runOzonShipmentAction } from './shipment';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), getClient: vi.fn(),
  createOrder: vi.fn(), postingInfo: vi.fn(), approvePosting: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({ prisma: { ozonShipment: { findUnique: mocks.findUnique, updateMany: mocks.updateMany, update: mocks.update } } }));
vi.mock('./client', () => ({ getOzonDeliveryClient: mocks.getClient }));

const request = {
  order_external_id: 'inner-order-1', recipient: { full_name: 'Recipient', phone_number: '+79991234567' },
  delivery: { delivery_point: { delivery_point_id: 123 } },
  postings: [{ request_id: 1, shipment_method_id: 7, posting_external_id: 'inner-posting-1', description: 'Goods',
    cutoff_at: '2026-10-26T12:00:00Z', declared_value: { amount: '2000.00', currency_code: 'RUB' },
    dimensions: { weight_g: 400, length_mm: 100, width_mm: 80, height_mm: 80 },
  }],
};
const fixture = (changes: Record<string, unknown> = {}) => ({
  id: 'shipment-1', orderId: 'order-1', postingNumber: null, orderNumber: null, status: 'pending', error: null,
  idempotencyKey: '7363aaba-03ef-40c6-833d-4fa1d5a4beea', request,
  order: { status: 'paid', brand: 'inner', deletedAt: null, shippingInfo: { deliveryMethod: 'ozon_pvz' } },
  ...changes,
});

describe('Ozon shipment workflow', () => {
  let savedShipment: ReturnType<typeof fixture>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    savedShipment = fixture();
    mocks.findUnique.mockImplementation(async () => savedShipment);
    mocks.getClient.mockReturnValue({ createOrder: mocks.createOrder, postingInfo: mocks.postingInfo, approvePosting: mocks.approvePosting });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockImplementation(async ({ data }) => {
      savedShipment = { ...savedShipment, ...data };
      return savedShipment;
    });
    mocks.createOrder.mockResolvedValue({ order_number: 'ozon-order-1', postings: [{ request_id: 1, posting_number: 'ozon-posting-1' }] });
    mocks.postingInfo.mockResolvedValue({ postings: [{ posting_number: 'ozon-posting-1', status: 'on_way' }] });
    mocks.approvePosting.mockResolvedValue(undefined);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each(['pending', 'cancelled', 'completed'])('requires payment before creating %s orders', async (status) => {
    mocks.findUnique.mockResolvedValue(fixture({ order: { ...fixture().order, status } }));
    await expect(runOzonShipmentAction('order-1')).rejects.toThrow('только для оплаченных заказов');
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to send a shipment when no configured client is available', async () => {
    mocks.getClient.mockReturnValue(null);
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 503 });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('rejects unknown brands rather than using another brand client', async () => {
    mocks.findUnique.mockResolvedValue(fixture({ order: { ...fixture().order, brand: 'unknown' } }));
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 503 });
    expect(mocks.getClient).not.toHaveBeenCalled();
  });

  it.each(['forming', 'ready_for_shipping', 'on_way', 'in_delivery_point', 'delivered', 'canceled'])('leaves an existing %s posting unchanged', async status => {
    const shipment = fixture({ postingNumber: 'ozon-posting-1', status });
    mocks.findUnique.mockResolvedValue(shipment);
    await expect(runOzonShipmentAction('order-1')).resolves.toBe(shipment);
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('creates a shipment using the persisted request and automatically confirms readiness', async () => {
    await expect(runOzonShipmentAction('order-1')).resolves.toMatchObject({
      orderNumber: 'ozon-order-1', postingNumber: 'ozon-posting-1', status: 'forming', error: null,
    });
    expect(mocks.getClient).toHaveBeenCalledWith('inner', { includeDisabled: true });
    expect(mocks.createOrder).toHaveBeenCalledWith(request, fixture().idempotencyKey);
    expect(mocks.approvePosting).toHaveBeenCalledExactlyOnceWith('ozon-posting-1');
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.approvePosting.mock.invocationCallOrder[0]);
    expect(mocks.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'shipment-1', lockedUntil: new Date('2026-10-25T10:01:00Z') }, data: { lockedUntil: null },
    });
  });

  it.each(['created', 'forming_failed'])('confirms an existing %s posting without creating another shipment', async status => {
    savedShipment = fixture({ postingNumber: 'ozon-posting-1', status });
    await expect(runOzonShipmentAction('order-1')).resolves.toMatchObject({ postingNumber: 'ozon-posting-1', status: 'forming' });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).toHaveBeenCalledExactlyOnceWith('ozon-posting-1');
  });

  it('keeps the created posting after a failed confirmation and resumes without recreating it', async () => {
    const error = new Error('network failed');
    mocks.approvePosting.mockRejectedValueOnce(error);
    await expect(runOzonShipmentAction('order-1')).rejects.toBe(error);
    expect(savedShipment).toMatchObject({
      postingNumber: 'ozon-posting-1', orderNumber: 'ozon-order-1', status: 'created',
      error: 'Не удалось выполнить запрос к Ozon. Повторите операцию с тем же отправлением.',
    });
    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { lockedUntil: null } }));
    await expect(runOzonShipmentAction('order-1')).resolves.toMatchObject({ postingNumber: 'ozon-posting-1', status: 'forming', error: null });
    await runOzonShipmentAction('order-1');
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.approvePosting).toHaveBeenCalledTimes(2);
  });

  it('does not approve a posting again if another worker confirmed it before acquiring the lease', async () => {
    mocks.findUnique.mockResolvedValueOnce(fixture({ postingNumber: 'ozon-posting-1', status: 'created' }))
      .mockResolvedValue(fixture({ postingNumber: 'ozon-posting-1', status: 'forming' }));
    await expect(runOzonShipmentAction('order-1')).resolves.toMatchObject({ status: 'forming' });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { lockedUntil: null } }));
  });


  it.each(['create', 'sync', 'approve'] as const)('keeps paid shipment %s operations available after disabling checkout', async action => {
    if (action !== 'create') mocks.findUnique.mockResolvedValue(fixture({ postingNumber: 'ozon-posting-1', status: 'created' }));
    mocks.getClient.mockImplementation(async (_brand, options) => options?.includeDisabled ? {
      createOrder: mocks.createOrder, postingInfo: mocks.postingInfo, approvePosting: mocks.approvePosting,
    } : null);
    await expect(runOzonShipmentAction('order-1', action)).resolves.toBeDefined();
    expect(mocks.getClient).toHaveBeenCalledWith('inner', { includeDisabled: true });
  });

  it('preserves request and idempotency key across a failed request and retry', async () => {
    const error = new Error('network failed: private-phone +79991234567');
    mocks.createOrder.mockRejectedValueOnce(error);
    await expect(runOzonShipmentAction('order-1')).rejects.toBe(error);
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'shipment-1' }, data: {
      error: 'Не удалось выполнить запрос к Ozon. Повторите операцию с тем же отправлением.',
    } });
    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { lockedUntil: null } }));
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain('+79991234567');
    await runOzonShipmentAction('order-1');
    expect(mocks.createOrder).toHaveBeenCalledTimes(2);
    expect(mocks.createOrder.mock.calls[1]).toEqual(mocks.createOrder.mock.calls[0]);
    expect(mocks.createOrder.mock.calls[1][0]).toBe(request);
  });

  it('rejects a concurrent lease holder without calling Ozon', async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 409 });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
  });

  it('allows only one in-flight creation while the lease is held', async () => {
    let lease = false;
    let finish!: () => void;
    mocks.updateMany.mockImplementation(async ({ data }) => {
      if (data.lockedUntil === null) { lease = false; return { count: 1 }; }
      if (lease) return { count: 0 };
      lease = true;
      return { count: 1 };
    });
    mocks.createOrder.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { finish = resolve; });
      return { order_number: 'ozon-order-1', postings: [{ request_id: 1, posting_number: 'ozon-posting-1' }] };
    });
    const first = runOzonShipmentAction('order-1');
    await vi.waitFor(() => expect(mocks.createOrder).toHaveBeenCalledTimes(1));
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 409 });
    finish();
    await expect(first).resolves.toMatchObject({ postingNumber: 'ozon-posting-1' });
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.approvePosting).toHaveBeenCalledExactlyOnceWith('ozon-posting-1');
    expect(lease).toBe(false);
  });

  it('syncs the matching posting rather than a different returned posting', async () => {
    mocks.findUnique.mockResolvedValue(fixture({ postingNumber: 'ozon-posting-1', status: 'created' }));
    mocks.postingInfo.mockResolvedValue({ postings: [{ posting_number: 'different', status: 'delivered' }, { posting_number: 'ozon-posting-1', status: 'on_way' }] });
    await expect(runOzonShipmentAction('order-1', 'sync')).resolves.toMatchObject({ status: 'on_way', error: null });
    expect(mocks.postingInfo).toHaveBeenCalledWith(['ozon-posting-1']);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('approves an existing created posting and marks it forming', async () => {
    mocks.findUnique.mockResolvedValue(fixture({ postingNumber: 'ozon-posting-1', status: 'created' }));
    await expect(runOzonShipmentAction('order-1', 'approve')).resolves.toMatchObject({ status: 'forming' });
    expect(mocks.approvePosting).toHaveBeenCalledWith('ozon-posting-1');
  });

  it.each(['sync', 'approve'] as const)('requires an existing posting for %s', async (action) => {
    await expect(runOzonShipmentAction('order-1', action)).rejects.toThrow('Сначала создайте отправление');
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('rejects incomplete or ambiguous creation responses and releases the lease', async () => {
    mocks.createOrder.mockResolvedValueOnce({ order_number: '1', postings: [] }).mockResolvedValueOnce({ order_number: '1', postings: [{ request_id: 1, posting_number: '1' }, { request_id: 2, posting_number: '2' }] });
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 502 });
    await expect(runOzonShipmentAction('order-1')).rejects.toMatchObject({ status: 502 });
    expect(mocks.approvePosting).not.toHaveBeenCalled();
    expect(mocks.updateMany.mock.calls.filter(([args]) => args.data.lockedUntil === null)).toHaveLength(2);
  });

  it('creates and confirms readiness automatically after payment', async () => {
    await expect(createOzonShipmentAfterPayment('order-1')).resolves.toBeUndefined();
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.approvePosting).toHaveBeenCalledExactlyOnceWith('ozon-posting-1');
    expect(savedShipment).toMatchObject({ status: 'forming', postingNumber: 'ozon-posting-1' });
  });

  it('skips automatic creation and confirmation for orders without an Ozon shipment', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(createOzonShipmentAfterPayment('order-1')).resolves.toBeUndefined();
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.approvePosting).not.toHaveBeenCalled();
  });

  it.each(['createOrder', 'approvePosting'] as const)('logs only the order id after %s fails and leaves recovery to the saved shipment', async operation => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks[operation].mockRejectedValue(new Error('private credentials and phone +79991234567'));
    await expect(createOzonShipmentAfterPayment('order-1')).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledWith('[ozon-delivery] Shipment creation or readiness confirmation failed', { orderId: 'order-1' });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('+79991234567');
  });
});
