import { logAnalyticsEvent } from '../../analytics';
import {
  beginGuidedRetake,
  getRetakeSession,
  offerRetakeGuidance,
  recordGuidanceShown,
  recordGuidedRetakeSuccess,
  startRetakeSession,
} from '../retakeGuidance';

jest.mock('../../analytics', () => ({ logAnalyticsEvent: jest.fn() }));

const cookieName = 'safedose_retake_guidance_v1';

describe('retake guidance', () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const cameraRef = {};
  let stopSession: () => void;
  let cookie: string;
  let readCookie: jest.Mock;
  let writeCookie: jest.Mock;
  let location: { protocol: string };

  beforeEach(() => {
    stopSession = startRetakeSession(cameraRef);
    cookie = '';
    location = { protocol: 'https:' };
    readCookie = jest.fn(() => cookie);
    writeCookie = jest.fn((value: string) => {
      cookie = value.split(';')[0];
    });
    const browserDocument = Object.defineProperty({}, 'cookie', {
      get: readCookie,
      set: writeCookie,
    });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: browserDocument });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopSession();
    jest.restoreAllMocks();
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else Reflect.deleteProperty(globalThis, 'document');
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  });

  it('isolates sessions by camera ref and clears guidance when the scanner is remounted', () => {
    cookie = `${cookieName}=a`;
    offerRetakeGuidance(getRetakeSession(cameraRef));

    const otherRef = {};
    const stopOtherSession = startRetakeSession(otherRef);
    try {
      expect(getRetakeSession(otherRef)?.guidance).toBeUndefined();
      stopSession();
      expect(getRetakeSession(cameraRef)).toBeUndefined();
      expect(getRetakeSession(otherRef)).toBeDefined();

      stopSession = startRetakeSession(cameraRef);
      expect(getRetakeSession(cameraRef)?.guidance).toBeUndefined();
      offerRetakeGuidance(getRetakeSession(cameraRef));
      expect(getRetakeSession(cameraRef)?.guidance).toEqual({ variant: 'a', shown: false });
    } finally {
      stopOtherSession();
    }
  });

  it('does not read or write a cookie without a session', () => {
    offerRetakeGuidance(undefined);

    expect(readCookie).not.toHaveBeenCalled();
    expect(writeCookie).not.toHaveBeenCalled();
  });

  it.each(['a', 'b'] as const)('reuses saved arm %s without assigning it again', variant => {
    const random = jest.spyOn(Math, 'random');
    cookie = `${cookieName}_old=b; unrelated=1;  ${cookieName}=${variant}`;
    const session = getRetakeSession(cameraRef);

    offerRetakeGuidance(session);

    expect(session?.guidance).toEqual({ variant, shown: false });
    expect(random).not.toHaveBeenCalled();
    expect(writeCookie).not.toHaveBeenCalled();
  });

  it.each([
    ['https:', 0.49, 'a', '; Secure'],
    ['http:', 0.5, 'b', ''],
  ] as const)('assigns an arm on %s and uses the matching cookie attributes', (protocol, randomValue, variant, secure) => {
    location.protocol = protocol;
    cookie = `${cookieName}=invalid`;
    jest.spyOn(Math, 'random').mockReturnValue(randomValue);
    const session = getRetakeSession(cameraRef);

    offerRetakeGuidance(session);

    expect(writeCookie).toHaveBeenCalledTimes(1);
    expect(writeCookie).toHaveBeenCalledWith(
      `${cookieName}=${variant}; Max-Age=7776000; Path=/; SameSite=Lax${secure}`,
    );
    expect(session?.guidance).toEqual({ variant, shown: false });
  });

  it('leaves guidance absent when the browser silently discards the cookie', () => {
    writeCookie.mockImplementation(() => {});
    const session = getRetakeSession(cameraRef);

    offerRetakeGuidance(session);

    expect(writeCookie).toHaveBeenCalledTimes(1);
    expect(session?.guidance).toBeUndefined();
    expect(logAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('leaves guidance absent when cookie access throws', () => {
    readCookie.mockImplementation(() => {
      throw new Error('Cookie access denied');
    });
    const session = getRetakeSession(cameraRef);

    expect(() => offerRetakeGuidance(session)).not.toThrow();
    expect(session?.guidance).toBeUndefined();
    expect(writeCookie).not.toHaveBeenCalled();
  });

  it.each(['a', 'b'] as const)('tracks shown, retry, and success for arm %s', variant => {
    const session = getRetakeSession(cameraRef);
    expect(beginGuidedRetake(undefined)).toBeUndefined();
    expect(beginGuidedRetake(session)).toBeUndefined();

    cookie = `${cookieName}=${variant}`;
    offerRetakeGuidance(session);
    const guidance = session?.guidance;
    expect(guidance).toEqual({ variant, shown: false });
    expect(beginGuidedRetake(session)).toBeUndefined();
    expect(session?.guidance).toBe(guidance);
    recordGuidedRetakeSuccess(undefined);
    expect(logAnalyticsEvent).not.toHaveBeenCalled();

    recordGuidanceShown(guidance!);
    recordGuidanceShown(guidance!);
    expect(guidance?.shown).toBe(true);
    expect(logAnalyticsEvent).toHaveBeenCalledTimes(1);

    const retryVariant = beginGuidedRetake(session);
    expect(retryVariant).toBe(variant);
    expect(session?.guidance).toBeUndefined();
    expect(beginGuidedRetake(session)).toBeUndefined();
    recordGuidedRetakeSuccess(retryVariant);
    expect(jest.mocked(logAnalyticsEvent).mock.calls).toEqual([
      [`retake_guidance_shown_${variant}`],
      [`retake_guidance_retry_${variant}`],
      [`retake_guidance_success_${variant}`],
    ]);
  });
});
