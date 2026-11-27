import { mobileScanCtaEvent, type MobileScanCtaArm } from '../../lib/mobileScanCtaExperiment';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

/** Mirrors the click arm captured by handleScanAttempt and its deferred onImageReady callback. */
function startEventForPendingImage(arm?: MobileScanCtaArm) {
  let currentArm = arm;
  const events: string[] = [];
  const imageReady = deferred<void>();
  const clickArm = currentArm;
  const onImageReady = clickArm ? () => {
    if (currentArm === clickArm) {
      events.push(mobileScanCtaEvent('start', clickArm));
      currentArm = undefined;
    }
  } : undefined;
  return { events, imageReady, onImageReady, cancel: () => { currentArm = undefined; } };
}

describe('mobile scan CTA start attribution', () => {
  it.each(['control', 'variant'] as const)(
    'keeps the clicked %s arm when image readiness follows a resize', async arm => {
      const scan = startEventForPendingImage(arm);
      const pending = scan.imageReady.promise;
      scan.imageReady.resolve();
      await pending;
      scan.onImageReady?.();
      expect(scan.events).toEqual([mobileScanCtaEvent('start', arm)]);
    },
  );

  it('counts duplicate image-ready callbacks once', () => {
    const scan = startEventForPendingImage('control');
    scan.onImageReady?.();
    scan.onImageReady?.();
    expect(scan.events).toEqual([mobileScanCtaEvent('start', 'control')]);
  });

  it('does not count a canceled scan or an unassigned CTA', () => {
    const canceled = startEventForPendingImage('variant');
    canceled.cancel();
    canceled.onImageReady?.();
    const unassigned = startEventForPendingImage();
    unassigned.onImageReady?.();
    expect(canceled.events).toEqual([]);
    expect(unassigned.events).toEqual([]);
  });
});
