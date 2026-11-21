import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection } from 'firebase/firestore';
import { useEvaluationDataCapture } from './useEvaluationDataCapture';
import { addDocWithEnv } from '../firestoreWithEnv';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../analytics';

let mockUser: { uid: string; isAnonymous: boolean } | null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ id: 'db' })),
  collection: jest.fn((_db, name) => ({ name })),
}));
jest.mock('../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: { EVALUATION_DATA_CAPTURED: 'evaluation_data_captured' },
}));
jest.mock('expo-file-system', () => ({}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockAddDocWithEnv = addDocWithEnv as jest.MockedFunction<typeof addDocWithEnv>;
const mockLogAnalyticsEvent = logAnalyticsEvent as jest.MockedFunction<typeof logAnalyticsEvent>;

describe('useEvaluationDataCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUser = { uid: 'user-123', isAnonymous: false };
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
    mockAddDocWithEnv.mockResolvedValue({ id: 'firestore-id' } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('stores recent data first, trims local history, and removes image contents from Firestore', async () => {
    const oldData = Array.from({ length: 500 }, (_, index) => ({ id: `old-${index}` }));
    storage.getItem.mockResolvedValueOnce(JSON.stringify(oldData));
    const { result } = renderHook(useEvaluationDataCapture);

    let capturedId: string | null = null;
    await act(async () => {
      capturedId = await result.current.captureUserInteraction({
        image: { uri: 'file://dose.jpg', base64: 'private-image-data', mimeType: 'image/jpeg', size: 42 },
        prompt: 'Read this syringe',
        userIntent: 'scan',
        inputParameters: {
          doseValue: 10,
          substanceName: 'Medicine',
          concentration: 20,
          concentrationUnit: 'mg/mL',
          syringeType: 'U-100',
          syringeVolume: '1 mL',
        },
        result: { success: true, calculatedVolume: 0.5, recommendedMarking: '50 units' },
        sessionId: 'session-fixed',
        verified: true,
      });
    });

    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(storage.setItem).toHaveBeenCalledWith('evaluation_data_user-123', expect.any(String));
    expect(saved).toHaveLength(500);
    expect(saved[0]).toMatchObject({
      id: capturedId,
      userId: 'user-123',
      sessionId: 'session-fixed',
      result: { success: true },
      evaluationMetadata: { qualityScore: 1, verified: true },
    });
    expect(saved[499].id).toBe('old-498');
    expect(mockCollection).toHaveBeenCalledWith({ id: 'db' }, 'evaluation_data');
    expect(mockAddDocWithEnv).toHaveBeenCalledWith(
      { name: 'evaluation_data' },
      expect.objectContaining({
        id: capturedId,
        image: { hasImage: true, mimeType: 'image/jpeg', size: 42 },
      })
    );
    expect(mockAddDocWithEnv.mock.calls[0][1]).not.toEqual(
      expect.objectContaining({ image: expect.objectContaining({ base64: expect.anything() }) })
    );
    expect(mockLogAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.EVALUATION_DATA_CAPTURED, {
      user_intent: 'scan',
      has_image: true,
      result_success: true,
      quality_score: 1,
      local_saved: true,
      firestore_saved: true,
    });
  });

  it('keeps capturing for an anonymous user when local storage fails and skips Firestore', async () => {
    mockUser = { uid: 'guest', isAnonymous: true };
    storage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));
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
    expect(mockAddDocWithEnv).not.toHaveBeenCalled();
    expect(mockLogAnalyticsEvent).toHaveBeenCalledWith('evaluation_data_captured', expect.objectContaining({
      result_success: false,
      local_saved: false,
      firestore_saved: false,
    }));
    expect(mockLogAnalyticsEvent.mock.calls[0][1]?.quality_score).toBeCloseTo(0.2);
    expect(console.error).toHaveBeenCalledWith(
      '[useEvaluationDataCapture] Error saving evaluation data locally:',
      expect.any(Error)
    );
  });

  it('exports only data meeting the quality threshold in the evaluation format', async () => {
    storage.getItem.mockResolvedValueOnce(JSON.stringify([
      {
        id: 'scan-high', userIntent: 'scan', prompt: 'Scan it', timestamp: 100,
        image: { uri: 'file://scan.jpg' },
        inputParameters: {},
        result: { calculatedVolume: 0.4, recommendedMarking: '40', scanResult: { label: 'ok' }, success: true },
        evaluationMetadata: { qualityScore: 0.9, verified: true, corrected: false },
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
      image: 'file://scan.jpg',
      prompt: 'Scan it',
      expected_output: {
        calculatedVolume: 0.4,
        recommendedMarking: '40',
        calculationError: undefined,
        scanResult: { label: 'ok' },
      },
      metadata: { timestamp: 100, quality_score: 0.9, verified: true, corrected: false },
    }]);
  });

  it('reports intent, quality, and recent-data statistics', async () => {
    const now = Date.now();
    storage.getItem.mockResolvedValueOnce(JSON.stringify([
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
    const { result } = renderHook(useEvaluationDataCapture);
    let exported: Awaited<ReturnType<typeof result.current.exportEvaluationData>>;
    await act(async () => { exported = await result.current.exportEvaluationData(); });
    expect(exported!).toBeNull();

    storage.getItem.mockResolvedValueOnce('{not-json');
    let stats: Awaited<ReturnType<typeof result.current.getDataStatistics>>;
    await act(async () => { stats = await result.current.getDataStatistics(); });
    expect(stats!).toEqual({ total: 0, byIntent: {}, byQuality: {}, recent: 0 });
    expect(console.error).toHaveBeenCalledWith(
      '[useEvaluationDataCapture] Error getting data statistics:',
      expect.any(SyntaxError)
    );
  });
});
