export type MobileScanCtaArm = 'control' | 'variant';

export const MOBILE_SCAN_CTA_COOKIE = 'safedose_mobile_scan_cta_v1';

export function isMobileScanViewport(width: number): boolean {
  return width > 0 && width < 768;
}

export function readMobileScanCtaArm(cookies: string): MobileScanCtaArm | null {
  const prefix = `${MOBILE_SCAN_CTA_COOKIE}=`;
  const value = cookies.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return value === 'control' || value === 'variant' ? value : null;
}

export function assignMobileScanCtaArm(
  doc: Pick<Document, 'cookie'>,
  secure: boolean,
  random = Math.random,
): MobileScanCtaArm | null {
  try {
    const existing = readMobileScanCtaArm(doc.cookie);
    if (existing) return existing;

    const arm = random() < 0.5 ? 'control' : 'variant';
    const secureAttribute = secure ? '; Secure' : '';
    doc.cookie = `${MOBILE_SCAN_CTA_COOKIE}=${arm}; Max-Age=2592000; Path=/; SameSite=Lax${secureAttribute}`;
    return readMobileScanCtaArm(doc.cookie);
  } catch {
    return null;
  }
}

export function mobileScanCtaEvent(kind: 'view' | 'start', arm: MobileScanCtaArm): string {
  return `mobile_scan_cta_v1_${kind}_${arm}`;
}
