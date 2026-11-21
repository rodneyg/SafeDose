import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { firebase: { projectId: 'unit-test-project' } } } },
}));
jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn() }));
jest.mock('firebase/firestore', () => ({ getFirestore: jest.fn() }));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn() }));

function loadFirebase(): typeof import('../firebase') {
  let firebase!: typeof import('../firebase');
  jest.isolateModules(() => {
    firebase = jest.requireActual('../firebase');
  });
  return firebase;
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('lazily initializes one app and one instance for each service', () => {
  const app = { name: 'unit-test-app' };
  const auth = { currentUser: null };
  const db = { type: 'firestore' };
  (initializeApp as jest.Mock).mockReturnValue(app);
  (getAuth as jest.Mock).mockReturnValue(auth);
  (getFirestore as jest.Mock).mockReturnValue(db);

  const firebase = loadFirebase();
  expect(initializeApp).not.toHaveBeenCalled();
  expect(getAuth).not.toHaveBeenCalled();
  expect(getFirestore).not.toHaveBeenCalled();
  expect(getAnalytics).not.toHaveBeenCalled();

  expect(firebase.auth.currentUser).toBeNull();
  expect(getFirestore).not.toHaveBeenCalled();
  expect(firebase.getAuthInstance()).toBe(auth);
  expect(firebase.db.type).toBe('firestore');
  expect(firebase.getDbInstance()).toBe(db);
  expect(initializeApp).toHaveBeenCalledTimes(1);
  expect(initializeApp).toHaveBeenCalledWith({ projectId: 'unit-test-project' });
  expect(getAuth).toHaveBeenCalledTimes(1);
  expect(getAuth).toHaveBeenCalledWith(app);
  expect(getFirestore).toHaveBeenCalledTimes(1);
  expect(getFirestore).toHaveBeenCalledWith(app);
});

it('retries app initialization after an error without caching a failed instance', () => {
  const failure = new Error('Firebase unavailable');
  const app = { name: 'recovered-app' };
  const auth = { currentUser: null };
  (initializeApp as jest.Mock).mockImplementationOnce(() => { throw failure; }).mockReturnValue(app);
  (getAuth as jest.Mock).mockReturnValue(auth);

  const firebase = loadFirebase();
  expect(() => firebase.getAuthInstance()).toThrow(failure);
  expect(getAuth).not.toHaveBeenCalled();
  expect(firebase.getAuthInstance()).toBe(auth);
  expect(initializeApp).toHaveBeenCalledTimes(2);
});

it('skips analytics and app initialization when there is no browser', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
  try {
    expect(loadFirebase().getAnalyticsInstance()).toBeUndefined();
    expect(initializeApp).not.toHaveBeenCalled();
    expect(getAnalytics).not.toHaveBeenCalled();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
