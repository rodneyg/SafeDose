const { resolveCheckoutPriceId } = require('./photoCheckStripe');

function mockStripe({ listed = [], createdId = 'price_created' } = {}) {
  return {
    prices: {
      list: jest.fn().mockResolvedValue({ data: listed }),
      create: jest.fn().mockResolvedValue({ id: createdId }),
    },
    products: {
      search: jest.fn().mockResolvedValue({ data: [{ id: 'prod_existing' }] }),
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn(),
    },
  };
}

describe('resolveCheckoutPriceId', () => {
  it('uses the env price ID when present', async () => {
    const stripe = mockStripe();
    const result = await resolveCheckoutPriceId(
      stripe,
      { offerKey: 'photo_check_monthly' },
      { mode: 'test', env: { STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID: 'price_from_env' } }
    );
    expect(result).toEqual({ priceId: 'price_from_env', offerKey: 'photo_check_monthly', created: false });
    expect(stripe.prices.list).not.toHaveBeenCalled();
  });

  it('reuses a Stripe lookup-key price before creating one', async () => {
    const stripe = mockStripe({ listed: [{ id: 'price_lookup' }] });
    const result = await resolveCheckoutPriceId(
      stripe,
      { offerKey: 'photo_check_annual' },
      { mode: 'test', env: {} }
    );
    expect(result.priceId).toBe('price_lookup');
    expect(result.created).toBe(false);
    expect(stripe.prices.create).not.toHaveBeenCalled();
  });

  it('creates a test-mode price when none exists', async () => {
    const stripe = mockStripe({ listed: [], createdId: 'price_new_test' });
    const result = await resolveCheckoutPriceId(
      stripe,
      { offerKey: 'photo_check_monthly' },
      { mode: 'test', env: {} }
    );
    expect(result).toEqual({ priceId: 'price_new_test', offerKey: 'photo_check_monthly', created: true });
    expect(stripe.prices.create).toHaveBeenCalledWith(expect.objectContaining({
      unit_amount: 299,
      lookup_key: 'safedose_photo_check_monthly',
      recurring: { interval: 'month' },
    }));
  });

  it('refuses to invent live prices', async () => {
    const stripe = mockStripe({ listed: [] });
    await expect(resolveCheckoutPriceId(
      stripe,
      { offerKey: 'photo_check_monthly' },
      { mode: 'live', env: {} }
    )).rejects.toMatchObject({ statusCode: 503 });
    expect(stripe.prices.create).not.toHaveBeenCalled();
  });

  it('rejects unknown offer keys and unlisted price IDs', async () => {
    const stripe = mockStripe();
    await expect(resolveCheckoutPriceId(stripe, { offerKey: 'enterprise' }, { mode: 'test', env: {} }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(resolveCheckoutPriceId(stripe, { priceId: 'price_random' }, { mode: 'test', env: {} }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('still accepts a known legacy priceId', async () => {
    const stripe = mockStripe();
    const result = await resolveCheckoutPriceId(
      stripe,
      { priceId: 'price_1RYgx7AY2p4W374YR9UxS0vr' },
      { mode: 'live', env: {} }
    );
    expect(result.priceId).toBe('price_1RYgx7AY2p4W374YR9UxS0vr');
  });
});
