import { act, renderHook } from '@testing-library/react-native';
import { useWebOffline } from './useWebOffline';

type BrowserWindow = Window & typeof globalThis;

function installWindow(onLine: boolean) {
  const target = new EventTarget();
  const addEventListener = jest.spyOn(target, 'addEventListener');
  const removeEventListener = jest.spyOn(target, 'removeEventListener');
  Object.defineProperty(target, 'navigator', {
    configurable: true,
    value: { onLine },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: target as unknown as BrowserWindow,
  });
  return { target, addEventListener, removeEventListener };
}

function setOnline(onLine: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: onLine,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  jest.restoreAllMocks();
});

describe('useWebOffline', () => {
  it('stays online during server-side rendering where window is unavailable', () => {
    jest.isolateModules(() => {
      jest.doMock('react', () => ({
        useEffect: (effect: () => void) => effect(),
        useState: () => [false, jest.fn()],
      }));
      const { useWebOffline: renderServerHook } = require('./useWebOffline');
      Reflect.deleteProperty(globalThis, 'window');

      expect(renderServerHook()).toBe(false);
    });
    jest.dontMock('react');
  });

  it.each([
    { onLine: true, expectedOffline: false },
    { onLine: false, expectedOffline: true },
  ])('reads the initial navigator status when onLine is $onLine', ({ onLine, expectedOffline }) => {
    installWindow(onLine);

    const { result } = renderHook(() => useWebOffline());

    expect(result.current).toBe(expectedOffline);
  });

  it('updates for offline and online browser events', () => {
    const { target } = installWindow(true);
    const { result } = renderHook(() => useWebOffline());

    act(() => {
      setOnline(false);
      target.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(true);

    act(() => {
      setOnline(true);
      target.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(false);
  });

  it('registers both listeners and removes them on unmount', () => {
    const { addEventListener, removeEventListener } = installWindow(true);
    const { unmount } = renderHook(() => useWebOffline());
    const onlineListener = addEventListener.mock.calls.find(([event]) => event === 'online')?.[1];
    const offlineListener = addEventListener.mock.calls.find(([event]) => event === 'offline')?.[1];

    expect(onlineListener).toEqual(expect.any(Function));
    expect(offlineListener).toBe(onlineListener);

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('online', onlineListener);
    expect(removeEventListener).toHaveBeenCalledWith('offline', offlineListener);
  });
});
