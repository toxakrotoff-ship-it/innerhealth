import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteOzonDelivery, validateOzonQuote, type OzonQuoteInput } from './checkout';
import { ozonCartFingerprint, ozonPhoneHash } from './parcel';

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(), pointFindUnique: vi.fn(), quoteCreate: vi.fn(), quoteFindUnique: vi.fn(),
  config: vi.fn(), getClient: vi.fn(), gifts: vi.fn(), checkClient: vi.fn(), checkout: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({ prisma: {
  product: { findMany: mocks.productFindMany },
  ozonDeliveryPointCache: { findUnique: mocks.pointFindUnique },
  ozonDeliveryQuote: { create: mocks.quoteCreate, findUnique: mocks.quoteFindUnique },
} }));
vi.mock('./config', () => ({ getOzonDeliveryConfig: mocks.config }));
vi.mock('./client', () => ({ getOzonDeliveryClient: mocks.getClient }));
vi.mock('@/services/gift-promotion.service', () => ({ calculateGiftsForOrder: mocks.gifts }));

const now = new Date('2026-10-25T10:00:00Z');
const phone = '+79991234567';
const input: OzonQuoteInput = { items: [{ productId: 'product-1', quantity: 2 }], phone, deliveryPointId: 123 };
const product = { id: 'product-1', brand: 'inner', price: 1000, weight: 200, length: 100, width: 80, height: 40 };
const gift = { id: 'gift-1', price: 100, weight: 50, length: 120, width: 90, height: 20 };
const quoteResult = () => ({ results: [{ request_id: 1, posting: {
  estimated_delivery_cost: { amount: '149.90', currency_code: 'RUB' },
  estimated_insurance_cost: { amount: '12.34', currency_code: 'RUB' },
  estimated_delivery_days: 3, cutoff_at: '2026-10-26T12:00:00Z',
} }] });
const savedQuote = (changes: Record<string, unknown> = {}) => ({
  id: 'quote-1', brand: 'inner', expiresAt: new Date(now.getTime() + 900000), shipment: null,
  pointId: '123', phoneHash: ozonPhoneHash(phone),
  cartFingerprint: ozonCartFingerprint([{ ...product, quantity: 2 }]),
  posting: { shipment_method_id: 7 }, ...changes,
});

describe('Ozon checkout quotes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.config.mockReturnValue({ clientId: 'client', clientSecret: 'secret', shipmentMethodId: 7, handlingHours: 24 });
    mocks.getClient.mockReturnValue({ checkClient: mocks.checkClient, checkout: mocks.checkout });
    mocks.productFindMany.mockResolvedValue([product]);
    mocks.pointFindUnique.mockResolvedValue({ pointId: '123', name: 'Trusted point', address: 'Trusted address', syncedAt: now });
    mocks.gifts.mockResolvedValue([]);
    mocks.checkClient.mockResolvedValue({ can_be_delivered: true });
    mocks.checkout.mockResolvedValue(quoteResult());
    mocks.quoteCreate.mockImplementation(async ({ data }) => ({ id: 'quote-1', ...data }));
    mocks.quoteFindUnique.mockResolvedValue(savedQuote());
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it('quotes trusted product and gift dimensions, includes insurance, and stores the provider cutoff', async () => {
    mocks.gifts.mockResolvedValue([{ giftProductId: 'gift-1', giftPromotionId: 'promotion-1', quantity: 1 }]);
    mocks.productFindMany.mockResolvedValueOnce([product]).mockResolvedValueOnce([gift]);
    const result = await quoteOzonDelivery({ ...input, phone: '8 (999) 123-45-67' }, 'inner');
    expect(mocks.checkout).toHaveBeenCalledWith({
      recipient: { phone_number: phone }, delivery: { delivery_point: { delivery_point_id: 123 } },
      postings: [{ request_id: 1, shipment_method_id: 7, cutoff_at: '2026-10-26T10:00:00.000Z',
        declared_value: { amount: '2100.00', currency_code: 'RUB' },
        dimensions: { weight_g: 450, length_mm: 120, width_mm: 90, height_mm: 100 },
      }],
    });
    expect(result).toEqual({
      quoteToken: 'quote-1', deliverySum: 162.24, estimatedDeliveryDays: 3, expiresAt: '2026-10-25T10:15:00.000Z',
      point: { id: 123, name: 'Trusted point', address: 'Trusted address' },
    });
    const persisted = mocks.quoteCreate.mock.calls[0][0].data;
    expect(persisted).toMatchObject({
      brand: 'inner', pointAddress: 'Trusted address', phoneHash: ozonPhoneHash(phone),
      posting: { cutoff_at: '2026-10-26T12:00:00Z' },
    });
    expect(JSON.stringify(persisted)).not.toContain(phone);
    expect(mocks.gifts).toHaveBeenCalledWith({ items: [{ productId: 'product-1', quantity: 2, price: 1000, hasPromoPrice: false }], hasPromoCode: false, brandId: 'inner' });
  });


  it('uses the handling deadline saved in admin settings instead of environment values', async () => {
    vi.stubEnv('OZON_HANDLING_HOURS', '120');
    vi.stubEnv('OZON_INNER_HANDLING_HOURS', '144');
    mocks.config.mockResolvedValue({ clientId: 'client', clientSecret: 'secret', shipmentMethodId: 7, handlingHours: 48 });
    await quoteOzonDelivery(input, 'inner');
    expect(mocks.checkout.mock.calls[0][0].postings[0].cutoff_at).toBe('2026-10-27T10:00:00.000Z');
  });

  it('accepts a valid quote using its current trusted cart', async () => {
    await expect(validateOzonQuote('quote-1', input, 'inner')).resolves.toEqual(savedQuote());
    expect(mocks.quoteFindUnique).toHaveBeenCalledWith({ where: { id: 'quote-1' }, include: { shipment: { select: { id: true } } } });
    expect(mocks.productFindMany.mock.calls[0][0].where).toEqual({ id: { in: ['product-1'] }, isDraft: false });
  });

  it.each([
    { label: 'missing', value: null },
    { label: 'expired', value: savedQuote({ expiresAt: now }) },
    { label: 'wrong brand', value: savedQuote({ brand: 'sprint-power' }) },
    { label: 'used', value: savedQuote({ shipment: { id: 'shipment-1' } }) },
    { label: 'wrong phone', value: savedQuote({ phoneHash: ozonPhoneHash('+79991234568') }) },
    { label: 'wrong point', value: savedQuote({ pointId: '456' }) },
  ])('rejects $label quotes before loading the cart', async ({ value }) => {
    mocks.quoteFindUnique.mockResolvedValue(value);
    await expect(validateOzonQuote('quote-1', input, 'inner')).rejects.toThrow('Расчёт доставки Ozon устарел');
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it.each([
    { price: 1001 }, { weight: 201 }, { height: 41 },
  ])('rejects a cart whose trusted product changed: %j', async (change) => {
    mocks.productFindMany.mockResolvedValue([{ ...product, ...change }]);
    await expect(validateOzonQuote('quote-1', input, 'inner')).rejects.toThrow('Корзина изменилась');
  });

  it('rejects changes to quantities, promo, or gift eligibility', async () => {
    await expect(validateOzonQuote('quote-1', { ...input, items: [{ productId: 'product-1', quantity: 3 }] }, 'inner')).rejects.toThrow('Корзина изменилась');
    await expect(validateOzonQuote('quote-1', { ...input, promoCodeId: 'new-promo' }, 'inner')).rejects.toThrow('Корзина изменилась');
    mocks.gifts.mockResolvedValue([{ giftProductId: 'gift-1', giftPromotionId: 'promotion-1', quantity: 1 }]);
    mocks.productFindMany.mockResolvedValueOnce([product]).mockResolvedValueOnce([gift]);
    await expect(validateOzonQuote('quote-1', input, 'inner')).rejects.toThrow('Корзина изменилась');
  });

  it.each(['inner', 'sprint-power'] as const)('rejects products outside the %s brand before requesting a price', async (brand) => {
    mocks.productFindMany.mockResolvedValue([{ ...product, brand: brand === 'inner' ? 'sprint-power' : 'inner' }]);
    await expect(quoteOzonDelivery(input, brand)).rejects.toThrow('Товар недоступен');
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.config).toHaveBeenCalledWith(brand);
  });

  it('rejects unavailable products, gift dimensions and unserviceable phone numbers', async () => {
    mocks.productFindMany.mockResolvedValueOnce([]);
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('Товар недоступен');
    mocks.gifts.mockResolvedValueOnce([{ giftProductId: 'gift-1', giftPromotionId: 'promotion-1', quantity: 1 }]);
    mocks.productFindMany.mockResolvedValueOnce([product]).mockResolvedValueOnce([{ ...gift, weight: null }]);
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('вес или габариты');
    mocks.checkClient.mockResolvedValueOnce({ can_be_delivered: false });
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('Ozon не может доставить заказ по указанному телефону');
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it('rejects a disabled provider for quote and quote validation', async () => {
    mocks.config.mockReturnValue(null);
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toMatchObject({ status: 503 });
    await expect(validateOzonQuote('quote-1', input, 'inner')).rejects.toMatchObject({ status: 503 });
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it('rejects stale or missing points and never calls Ozon', async () => {
    mocks.pointFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ pointId: '123', syncedAt: new Date(now.getTime() - 49 * 3600000) });
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('Пункт выдачи недоступен');
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('Пункт выдачи недоступен');
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it('rejects changed shipment configuration when consuming a quote', async () => {
    mocks.config.mockReturnValue({ clientId: 'client', clientSecret: 'secret', shipmentMethodId: 8, handlingHours: 24 });
    await expect(validateOzonQuote('quote-1', input, 'inner')).rejects.toThrow('Условия доставки изменились');
  });

  it.each([
    { results: [{ request_id: 1, error: { code: 'unavailable' } }] },
    { results: [] },
  ])('never saves a quote when Ozon declines checkout', async (response) => {
    mocks.checkout.mockResolvedValue(response);
    await expect(quoteOzonDelivery(input, 'inner')).rejects.toThrow('Ozon не может доставить заказ в выбранный ПВЗ');
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it('limits quote expiry to the returned cutoff', async () => {
    const response = quoteResult();
    response.results[0].posting.cutoff_at = '2026-10-25T10:05:00Z';
    mocks.checkout.mockResolvedValue(response);
    await expect(quoteOzonDelivery(input, 'inner')).resolves.toMatchObject({ expiresAt: '2026-10-25T10:05:00.000Z' });
  });
});
