import { act, renderHook } from '@testing-library/react-native';
import { useWebOffline } from '../useWebOffline';

const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

function setWindow(value: unknown) {
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
}

afterEach(() => {
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

it('reports online by default when no browser is available', () => {
  setWindow(undefined);
  const { result } = renderHook(useWebOffline);
  expect(result.current).toBe(false);
});

it('reports online when the browser starts online', () => {
  setWindow(Object.assign(new EventTarget(), { navigator: { onLine: true } }));

  const { result } = renderHook(useWebOffline);

  expect(result.current).toBe(false);
});

it('tracks the initial connection and subsequent browser events, then removes both listeners', () => {
  const browser = Object.assign(new EventTarget(), { navigator: { onLine: false } });
  const add = jest.spyOn(browser, 'addEventListener');
  const remove = jest.spyOn(browser, 'removeEventListener');
  setWindow(browser);

  const { result, unmount } = renderHook(useWebOffline);
  expect(result.current).toBe(true);

  act(() => {
    browser.navigator.onLine = true;
    browser.dispatchEvent(new Event('online'));
  });
  expect(result.current).toBe(false);

  act(() => {
    browser.navigator.onLine = false;
    browser.dispatchEvent(new Event('offline'));
  });
  expect(result.current).toBe(true);

  unmount();
  expect(add.mock.calls.map(([event]) => event)).toEqual(['online', 'offline']);
  expect(remove.mock.calls).toEqual(add.mock.calls);
});
