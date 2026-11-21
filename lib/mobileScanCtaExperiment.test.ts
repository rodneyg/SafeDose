import {
  assignMobileScanCtaArm, isMobileScanViewport, mobileScanCtaEvent,
  MOBILE_SCAN_CTA_COOKIE, readMobileScanCtaArm,
} from './mobileScanCtaExperiment';

describe('mobile scan CTA experiment', () => {
  it.each([[0, false], [320, true], [767, true], [768, false], [1200, false]])(
    'checks viewport width %i independently of the user agent',
    (width, eligible) => expect(isMobileScanViewport(width)).toBe(eligible),
  );

  it.each([[0.49999, 'control'], [0.5, 'variant']])('assigns %s to %s and keeps it', (draw, arm) => {
    const doc = { cookie: 'existing=unrelated' };
    expect(assignMobileScanCtaArm(doc, true, () => draw)).toBe(arm);
    expect(doc.cookie).toBe(`${MOBILE_SCAN_CTA_COOKIE}=${arm}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`);
    const nextDraw = jest.fn();
    expect(assignMobileScanCtaArm(doc, true, nextDraw)).toBe(arm);
    expect(nextDraw).not.toHaveBeenCalled();
  });

  it('ignores similarly named and malformed cookies', () => {
    expect(readMobileScanCtaArm(`x_${MOBILE_SCAN_CTA_COOKIE}=variant; ${MOBILE_SCAN_CTA_COOKIE}=other`)).toBeNull();
    expect(readMobileScanCtaArm(`first=1; ${MOBILE_SCAN_CTA_COOKIE}=control; third=3`)).toBe('control');
  });

  it('keeps visitors out when their browsers block the experiment cookie', () => {
    const ignoredWrite = Object.defineProperty({}, 'cookie', { get: () => '', set: () => {} }) as Document;
    const deniedAccess = Object.defineProperty({}, 'cookie', {
      get: () => { throw new Error('cookie access denied'); },
    }) as Document;
    expect(assignMobileScanCtaArm(ignoredWrite, false)).toBeNull();
    expect(assignMobileScanCtaArm(deniedAccess, false)).toBeNull();
  });

  it('identifies each arm and event without a custom analytics dimension', () => {
    expect(mobileScanCtaEvent('view', 'control')).toBe('mobile_scan_cta_v1_view_control');
    expect(mobileScanCtaEvent('start', 'variant')).toBe('mobile_scan_cta_v1_start_variant');
  });
});
