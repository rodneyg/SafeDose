import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLastCalculation } from '../useLastCalculation';

const calculation = { dose: '1 mg', draw: 'Draw to 0.20 ml', vial: '5 mg/ml', solutionVolume: null };

beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(() => jest.restoreAllMocks());

it('keeps each account and the guest session separate', async () => {
  const { result, rerender } = renderHook(({ id }) => useLastCalculation(id), {
    initialProps: { id: 'first' as string | undefined },
  });
  act(() => result.current.rememberCalculation(calculation));

  rerender({ id: 'second' });
  expect(result.current.lastCalculation).toBeNull();
  rerender({ id: undefined });
  expect(result.current.lastCalculation).toBeNull();
  act(() => result.current.rememberCalculation({ ...calculation, dose: '2 mg' }));

  rerender({ id: 'first' });
  await waitFor(() => expect(result.current.lastCalculation).toEqual(calculation));
  rerender({ id: undefined });
  await waitFor(() => expect(result.current.lastCalculation?.dose).toBe('2 mg'));
});

it('restores separate dose and reconstitution results for the same account', async () => {
  const reconstitution = { ...calculation, draw: 'Draw to 0.40 ml', solutionVolume: '2 ml' };
  const { result, unmount } = renderHook(() => ({
    dose: useLastCalculation('first', 'dose'),
    reconstitution: useLastCalculation('first', 'reconstitution'),
  }));

  await act(async () => {
    result.current.dose.rememberCalculation(calculation);
    result.current.reconstitution.rememberCalculation(reconstitution);
  });
  unmount();

  const restored = renderHook(() => ({
    dose: useLastCalculation('first', 'dose'),
    reconstitution: useLastCalculation('first', 'reconstitution'),
  }));
  await waitFor(() => {
    expect(restored.result.current.dose.lastCalculation).toEqual(calculation);
    expect(restored.result.current.reconstitution.lastCalculation).toEqual(reconstitution);
  });
});

it('keeps the active account result when a previous account read finishes late', async () => {
  const secondCalculation = { ...calculation, dose: '2 mg' };
  let resolveFirstRead!: (raw: string) => void;
  jest.spyOn(AsyncStorage, 'getItem')
    .mockReturnValueOnce(new Promise(resolve => { resolveFirstRead = resolve; }))
    .mockResolvedValueOnce(JSON.stringify(secondCalculation));
  const { result, rerender } = renderHook(({ id }) => useLastCalculation(id), {
    initialProps: { id: 'first' },
  });

  rerender({ id: 'second' });
  await waitFor(() => expect(result.current.lastCalculation).toEqual(secondCalculation));
  await act(async () => resolveFirstRead(JSON.stringify(calculation)));

  expect(result.current.lastCalculation).toEqual(secondCalculation);
});

it('keeps a newer result when a startup read finishes late', async () => {
  let resolveRead!: (raw: string) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(resolve => { resolveRead = resolve; }));
  const { result } = renderHook(() => useLastCalculation());
  act(() => result.current.rememberCalculation(calculation));

  await act(async () => resolveRead(JSON.stringify({ ...calculation, dose: '2 mg' })));
  expect(result.current.lastCalculation).toEqual(calculation);
});

it('ignores unreadable data and keeps current-session results when writes fail', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('broken json');
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage unavailable'));

  const { result } = renderHook(() => useLastCalculation());
  await act(async () => {});
  expect(result.current.lastCalculation).toBeNull();
  await act(async () => result.current.rememberCalculation(calculation));
  expect(result.current.lastCalculation).toEqual(calculation);
});
