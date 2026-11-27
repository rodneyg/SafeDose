import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { collection } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { logAnalyticsEvent } from '../../analytics';
import { addDocWithEnv } from '../../firestoreWithEnv';
import { useEvaluationDataCapture } from '../useEvaluationDataCapture';

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'fixture-db'),
  collection: jest.fn(() => 'fixture-collection'),
}));
jest.mock('../../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));
jest.mock('../../analytics', () => ({
  ANALYTICS_EVENTS: { EVALUATION_DATA_CAPTURED: 'evaluation_data_captured' },
  logAnalyticsEvent: jest.fn(),
}));

const interaction = {
  sessionId: 'fixture-session',
  prompt: 'Read the synthetic fixture.',
  userIntent: 'scan' as const,
  image: { uri: 'fixture-image', base64: 'synthetic-data', mimeType: 'image/jpeg', size: 14 },
  inputParameters: {},
  result: {},
};

beforeEach(async () => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ user: null });
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('keeps an anonymous capture in local storage', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: null });
  const { result } = renderHook(useEvaluationDataCapture);
  let id: string | null | undefined;

  await act(async () => {
    id = await result.current.captureUserInteraction(interaction);
  });

  const stored = JSON.parse((await AsyncStorage.getItem('evaluation_data_anonymous')) ?? '[]');
  expect(stored).toEqual([expect.objectContaining({
    id: expect.any(String),
    userId: null,
    sessionId: interaction.sessionId,
    image: { uri: interaction.image.uri, mimeType: interaction.image.mimeType, size: interaction.image.size },
  })]);
  expect(stored[0].image).not.toHaveProperty('base64');
  expect(id).toBe(stored[0].id);
  expect(addDocWithEnv).not.toHaveBeenCalled();
  expect(result.current.isCapturing).toBe(false);
});

it('keeps the newest 500 captures and sends only image metadata to Firestore', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'fixture-user', isAnonymous: false } });
  (addDocWithEnv as jest.Mock).mockResolvedValue({ id: 'fixture-doc' });
  const key = 'evaluation_data_fixture-user';
  const history = Array.from({ length: 500 }, (_, index) => ({ id: `old-${index}` }));
  await AsyncStorage.setItem(key, JSON.stringify(history));
  const { result } = renderHook(useEvaluationDataCapture);

  await act(async () => {
    await result.current.captureUserInteraction(interaction);
  });

  const stored = JSON.parse((await AsyncStorage.getItem(key)) ?? '[]');
  expect(stored).toHaveLength(500);
  expect(stored[0]).toMatchObject({
    userId: 'fixture-user',
    image: { uri: interaction.image.uri, mimeType: interaction.image.mimeType, size: interaction.image.size },
  });
  expect(stored[0].image).not.toHaveProperty('base64');
  expect(stored.slice(1)).toEqual(history.slice(0, 499));
  expect(collection).toHaveBeenCalledWith('fixture-db', 'evaluation_data');
  expect(addDocWithEnv).toHaveBeenCalledTimes(1);
  expect(addDocWithEnv).toHaveBeenCalledWith('fixture-collection', expect.objectContaining({
    userId: 'fixture-user',
    image: { hasImage: true, mimeType: 'image/jpeg', size: 14 },
  }));
  expect(logAnalyticsEvent).toHaveBeenCalledWith('evaluation_data_captured', expect.objectContaining({
    local_saved: true,
    firestore_saved: true,
  }));
});

it('keeps capturing for an anonymous user when local storage fails and skips Firestore', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'fixture-guest', isAnonymous: true } });
  const error = new Error('storage unavailable');
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(error);
  const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = renderHook(useEvaluationDataCapture);

  let capturedId: string | null = null;
  await act(async () => {
    capturedId = await result.current.captureUserInteraction({
      prompt: 'Manual dose',
      userIntent: 'manual_entry',
      inputParameters: {},
      result: { calculationError: 'Missing dose' },
    });
  });

  expect(capturedId).toEqual(expect.stringMatching(/^eval_/));
  expect(addDocWithEnv).not.toHaveBeenCalled();
  expect(logAnalyticsEvent).toHaveBeenCalledWith('evaluation_data_captured', expect.objectContaining({
    result_success: false,
    local_saved: false,
    firestore_saved: false,
  }));
  expect(logError).toHaveBeenCalledWith(
    '[useEvaluationDataCapture] Error saving evaluation data locally:',
    error
  );
});

it('exports only data meeting the quality threshold in the evaluation format', async () => {
  await AsyncStorage.setItem('evaluation_data_anonymous', JSON.stringify([
    {
      id: 'scan-high', userIntent: 'scan', prompt: 'Scan it', timestamp: 100,
      image: { uri: 'fixture-image' },
      inputParameters: {},
      result: { calculatedVolume: 0.4, recommendedMarking: '40', scanResult: { label: 'ok' }, success: true },
      evaluationMetadata: { qualityScore: 0.8, verified: true, corrected: false },
    },
    {
      id: 'manual-low', userIntent: 'manual_entry', prompt: 'Calculate it', timestamp: 200,
      inputParameters: {}, result: { success: true }, evaluationMetadata: { qualityScore: 0.5 },
    },
  ]));
  const { result } = renderHook(useEvaluationDataCapture);

  let exported: Awaited<ReturnType<typeof result.current.exportEvaluationData>>;
  await act(async () => { exported = await result.current.exportEvaluationData(0.8); });

  expect(exported!).toEqual([{
    id: 'scan-high',
    category: 'ai_scanning',
    description: 'User interaction: Scan it',
    image: 'fixture-image',
    prompt: 'Scan it',
    expected_output: {
      calculatedVolume: 0.4,
      recommendedMarking: '40',
      calculationError: undefined,
      scanResult: { label: 'ok' },
    },
    metadata: { timestamp: 100, quality_score: 0.8, verified: true, corrected: false },
  }]);
});

it('reports intent, quality, and recent-data statistics', async () => {
  const now = Date.now();
  await AsyncStorage.setItem('evaluation_data_anonymous', JSON.stringify([
    { userIntent: 'scan', timestamp: now, evaluationMetadata: { qualityScore: 0.9 } },
    { userIntent: 'manual_entry', timestamp: now - 8 * 24 * 60 * 60 * 1000, evaluationMetadata: { qualityScore: 0.7 } },
    { userIntent: 'scan', timestamp: now, evaluationMetadata: { qualityScore: 0.4 } },
    { userIntent: 'manual_entry', timestamp: now, evaluationMetadata: {} },
  ]));
  const { result } = renderHook(useEvaluationDataCapture);

  let stats: Awaited<ReturnType<typeof result.current.getDataStatistics>>;
  await act(async () => { stats = await result.current.getDataStatistics(); });

  expect(stats!).toEqual({
    total: 4,
    byIntent: { scan: 2, manual_entry: 2 },
    byQuality: { high: 1, medium: 2, low: 1 },
    recent: 3,
  });
});

it('returns safe fallbacks when stored evaluation data is missing or malformed', async () => {
  const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = renderHook(useEvaluationDataCapture);
  let exported: Awaited<ReturnType<typeof result.current.exportEvaluationData>>;
  await act(async () => { exported = await result.current.exportEvaluationData(); });
  expect(exported!).toBeNull();

  await AsyncStorage.setItem('evaluation_data_anonymous', '{not-json');
  let stats: Awaited<ReturnType<typeof result.current.getDataStatistics>>;
  await act(async () => { stats = await result.current.getDataStatistics(); });
  expect(stats!).toEqual({ total: 0, byIntent: {}, byQuality: {}, recent: 0 });
  expect(logError).toHaveBeenCalledWith(
    '[useEvaluationDataCapture] Error getting data statistics:',
    expect.any(SyntaxError)
  );
});
