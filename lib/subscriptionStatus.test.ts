import type { User } from 'firebase/auth';
import { getApiBaseUrl } from './apiBase';
import { billingRequest, getSubscriptionStatus } from './subscriptionStatus';

jest.mock('./apiBase', () => ({ getApiBaseUrl: jest.fn() }));

const mockedGetApiBaseUrl = jest.mocked(getApiBaseUrl);
const user = { getIdToken: jest.fn() } as unknown as User;

beforeEach(() => {
  mockedGetApiBaseUrl.mockReturnValue('https://example.test');
  (user.getIdToken as jest.Mock).mockResolvedValue('test-token');
  jest.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('posts the authenticated request and returns the response data', async () => {
  const signal = new AbortController().signal;
  const data = { hasActiveSubscription: true };
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => data } as Response);

  await expect(billingRequest(user, 'billing-path', { plan: 'annual' }, signal)).resolves.toBe(data);
  expect(user.getIdToken).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('https://example.test/api/billing-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify({ plan: 'annual' }),
    signal,
  });
});

it('throws the API error when the response is not ok', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'Subscription unavailable.' }) } as Response);

  await expect(billingRequest(user, 'billing-path')).rejects.toThrow('Subscription unavailable.');
});

it('throws the fallback error when an unsuccessful response has no error message', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

  await expect(billingRequest(user, 'billing-path')).rejects.toThrow('Could not load payment details.');
});

it('requests the subscription status with an empty body and forwards the signal', async () => {
  const signal = new AbortController().signal;
  const data = { hasActiveSubscription: false };
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => data } as Response);

  await expect(getSubscriptionStatus(user, signal)).resolves.toBe(data);
  expect(fetch).toHaveBeenCalledWith(
    'https://example.test/api/get-subscription-status',
    expect.objectContaining({ body: '{}', signal }),
  );
});
