import { Platform } from 'react-native';
import { logAnalyticsEvent } from './analytics';
import {
  assignLandingCtaArm,
  LANDING_CTA_LABELS,
  readLandingCtaArm,
  recordLandingCtaClick,
  recordLandingCtaExposure,
  recordLandingCtaStart,
} from './landingCtaExperiment';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('./analytics', () => ({ logAnalyticsEvent: jest.fn() }));

const cookieName = 'safedose_landing_cta_v1';
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
let cookies: string;
let writeCookie: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  cookies = 'other_cookie=unchanged';
  writeCookie = jest.fn((value: string) => {
    cookies = `other_cookie=unchanged; ${value.split(';')[0]}`;
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      location: { protocol: 'https:' },
      get cookie() { return cookies; },
      set cookie(value: string) { writeCookie(value); },
    },
  });
});

afterEach(() => {
  if (originalDocument) {
    Object.defineProperty(globalThis, 'document', originalDocument);
  } else {
    Reflect.deleteProperty(globalThis, 'document');
  }
  jest.restoreAllMocks();
  Object.assign(Platform, { OS: 'web' });
});

it.each([
  [0.4999, 'control', 'Try Now'],
  [0.5, 'variant', 'Scan a vial'],
] as const)('assigns %s to %s and keeps that label on return', (sample, arm, label) => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(sample);
  expect(assignLandingCtaArm()).toBe(arm);
  expect(LANDING_CTA_LABELS[arm]).toBe(label);
  expect(writeCookie).toHaveBeenCalledWith(
    `${cookieName}=${arm}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`,
  );

  random.mockReturnValue(1 - sample);
  expect(assignLandingCtaArm()).toBe(arm);
  expect(random).toHaveBeenCalledTimes(1);
  expect(writeCookie).toHaveBeenCalledTimes(1);
});

it.each(['control', 'variant'] as const)('reports the matching %s funnel events', arm => {
  expect(readLandingCtaArm()).toBeNull();
  recordLandingCtaStart('scan');
  expect(logAnalyticsEvent).not.toHaveBeenCalled();

  cookies = `${cookieName}=${arm}`;
  recordLandingCtaExposure(arm);
  recordLandingCtaClick(arm);
  recordLandingCtaStart('scan');
  recordLandingCtaStart('signup');
  expect(jest.mocked(logAnalyticsEvent).mock.calls).toEqual([
    [`landing_cta_v1_view_${arm}`],
    [`landing_cta_v1_click_${arm}`],
    [`landing_cta_v1_start_${arm}`, { start_kind: 'scan' }],
    [`landing_cta_v1_start_${arm}`, { start_kind: 'signup' }],
  ]);
});

it('replaces an invalid cookie', () => {
  cookies = `${cookieName}=invalid`;
  jest.spyOn(Math, 'random').mockReturnValue(0.7);
  expect(readLandingCtaArm()).toBeNull();
  expect(assignLandingCtaArm()).toBe('variant');
});

it('keeps visitors with blocked cookies out of the experiment', () => {
  writeCookie.mockImplementation(() => {});
  expect(assignLandingCtaArm()).toBeNull();
  recordLandingCtaStart('signup');
  expect(logAnalyticsEvent).not.toHaveBeenCalled();
});

it('leaves native and server rendering unassigned', () => {
  Object.assign(Platform, { OS: 'ios' });
  expect(assignLandingCtaArm()).toBeNull();
  expect(writeCookie).not.toHaveBeenCalled();

  Object.assign(Platform, { OS: 'web' });
  Reflect.deleteProperty(globalThis, 'document');
  expect(assignLandingCtaArm()).toBeNull();
});
