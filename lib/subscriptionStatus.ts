import type { User } from 'firebase/auth';
import { getApiBaseUrl } from './apiBase';

export async function billingRequest<T>(user: User, path: string, body = {}, signal?: AbortSignal): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${getApiBaseUrl()}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (!response.ok) throw new Error('Could not load payment details.');
    throw error;
  }

  if (!response.ok) {
    const serverError =
      data !== null && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : undefined;
    throw new Error(serverError || 'Could not load payment details.');
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid payment details response.');
  }

  return data as T;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  plan: string;
  customerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    priceId: string | null;
  } | null;
}

export function getSubscriptionStatus(user: User, signal?: AbortSignal) {
  return billingRequest<SubscriptionStatus>(user, 'get-subscription-status', {}, signal);
}
