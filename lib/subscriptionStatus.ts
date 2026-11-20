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
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load payment details.');
  return data;
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
