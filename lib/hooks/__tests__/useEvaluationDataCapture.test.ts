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
    image: interaction.image,
  })]);
  expect(id).toBe(stored[0].id);
  expect(addDocWithEnv).not.toHaveBeenCalled();
  expect(result.current.isCapturing).toBe(false);
});

it('sends image metadata for signed-in captures and records the outcome', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'fixture-user', isAnonymous: false } });
  (addDocWithEnv as jest.Mock).mockResolvedValue({ id: 'fixture-doc' });
  const { result } = renderHook(useEvaluationDataCapture);

  await act(async () => {
    await result.current.captureUserInteraction(interaction);
  });

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
