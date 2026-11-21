import { assignPricingDefault, pricingEvent } from './pricingDefault';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
let getItem: jest.Mock;
let setItem: jest.Mock;

beforeEach(() => {
  getItem = jest.fn();
  setItem = jest.fn();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: { getItem, setItem } },
  });
});

afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
  jest.restoreAllMocks();
});

it.each(['monthly', 'annual'] as const)('reuses a stored %s assignment', arm => {
  getItem.mockReturnValue(arm);
  const random = jest.spyOn(Math, 'random');

  expect(assignPricingDefault()).toBe(arm);
  expect(random).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

it.each([
  [0.4999, 'monthly'],
  [0.5, 'annual'],
] as const)('assigns draw %s to %s and persists it', (draw, arm) => {
  getItem.mockReturnValue('invalid');
  jest.spyOn(Math, 'random').mockReturnValue(draw);

  expect(assignPricingDefault()).toBe(arm);
  expect(setItem).toHaveBeenCalledWith('safedose:pricing-default:v1', arm);
});

it.each(['read', 'write'] as const)('returns null when storage %s fails', operation => {
  if (operation === 'read') {
    getItem.mockImplementation(() => { throw new Error('storage denied'); });
  } else {
    setItem.mockImplementation(() => { throw new Error('storage denied'); });
  }

  expect(assignPricingDefault()).toBeNull();
});

it.each([
  ['monthly', 'view', 'pricing_v1_monthly_view'],
  ['monthly', 'select_mo', 'pricing_v1_monthly_select_mo'],
  ['annual', 'select_yr', 'pricing_v1_annual_select_yr'],
  ['annual', 'checkout_start', 'pricing_v1_annual_checkout_start'],
] as const)('builds the %s %s event name', (arm, action, event) => {
  expect(pricingEvent(arm, action)).toBe(event);
});
