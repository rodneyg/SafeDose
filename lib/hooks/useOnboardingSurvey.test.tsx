import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingSurvey } from './useOnboardingSurvey';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../analytics';
import { addDocWithEnv } from '../firestoreWithEnv';

let mockUser: { uid: string; isAnonymous: boolean } | null;
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('firebase/firestore', () => ({ getFirestore: () => ({}), collection: (_db: unknown, name: string) => name }));
jest.mock('../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));
jest.mock('../analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    PMF_SURVEY_SHOWN: 'pmf_survey_shown',
    PMF_SURVEY_COMPLETED: 'pmf_survey_completed',
    PMF_SURVEY_SKIPPED: 'pmf_survey_skipped',
    PMF_SURVEY_DISMISSED: 'pmf_survey_dismissed',
    WHY_HERE_PROMPT_SHOWN: 'why_here_prompt_shown',
    WHY_HERE_PROMPT_RESPONSE: 'why_here_prompt_response',
    WHY_HERE_PROMPT_SKIPPED: 'why_here_prompt_skipped',
  },
}));

const pmf = {
  disappointment: 'somewhat_disappointed' as const,
  benefitPerson: 'People keeping a dose log',
  mainBenefit: 'Ease of use',
  improvements: 'Larger text',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUser = { uid: 'test-user', isAnonymous: false };
});

it('claims the prompt once on the second saved dose and preserves both data formats', async () => {
  const { result, unmount } = renderHook(useOnboardingSurvey);
  await act(async () => result.current.offerSurvey(1, 'manual'));
  expect(result.current.prompt).toBeNull();
  await act(async () => {
    await Promise.all([result.current.offerSurvey(2, 'scan'), result.current.offerSurvey(2, 'scan')]);
  });
  expect(result.current.prompt).toMatchObject({ sessionCount: 2, includeWhyHere: true });
  expect(logAnalyticsEvent).toHaveBeenCalledTimes(2);

  await act(async () => result.current.finishSurvey({
    whyHere: { response: 'other', customText: 'A forum' }, pmf, questionIndex: 3,
  }));
  expect(result.current.prompt).toBeNull();
  expect(JSON.parse((await AsyncStorage.getItem('whyAreYouHereResponse_test-user'))!)).toMatchObject({
    response: 'other', customText: 'A forum', userId: 'test-user', isAnonymous: false,
  });
  expect(addDocWithEnv).toHaveBeenCalledWith('pmf_survey_responses', expect.objectContaining({
    userId: 'test-user', responses: pmf, metadata: expect.objectContaining({ sessionCount: 2, scanFlow: true }),
  }));
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PMF_SURVEY_COMPLETED, expect.objectContaining({
    hasDisappointmentResponse: true, hasBenefitPersonResponse: true, hasMainBenefitResponse: true, hasImprovementsResponse: true,
  }));
  unmount();

  const reopened = renderHook(useOnboardingSurvey);
  await act(async () => reopened.result.current.offerSurvey(2, 'manual'));
  expect(reopened.result.current.prompt).toBeNull();
});

it('skips without a remote write and leaves the account ineligible for a repeat', async () => {
  mockUser = null;
  const { result } = renderHook(useOnboardingSurvey);
  await act(async () => result.current.offerSurvey(2, 'manual'));
  await act(async () => result.current.finishSurvey({ questionIndex: 0 }));
  expect(result.current.prompt).toBeNull();
  expect(addDocWithEnv).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('whyAreYouHerePromptShown_anonymous')).toBe('true');
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PMF_SURVEY_SKIPPED, expect.objectContaining({ isAnonymous: true }));
  await act(async () => result.current.offerSurvey(2, 'manual'));
  expect(result.current.prompt).toBeNull();
});

it('honors legacy PMF dismissal and keeps the account’s earlier reason response', async () => {
  await AsyncStorage.setItem('pmf_survey_data_test-user', JSON.stringify({ hasShownBefore: true }));
  await AsyncStorage.setItem('whyAreYouHerePromptShown_returning', 'true');
  await AsyncStorage.setItem('whyAreYouHereResponse_returning', JSON.stringify({ response: 'reddit' }));

  const { result, rerender } = renderHook(useOnboardingSurvey);
  await act(async () => result.current.offerSurvey(2, 'manual'));
  expect(result.current.prompt).toBeNull();
  mockUser = { uid: 'returning', isAnonymous: false };
  rerender({});
  await act(async () => result.current.offerSurvey(2, 'manual'));
  expect(result.current.prompt).toMatchObject({ includeWhyHere: false, userId: 'returning' });
  await act(async () => result.current.finishSurvey({ pmf, questionIndex: 3 }));
  expect(await AsyncStorage.getItem('whyAreYouHereResponse_returning')).toBe('{"response":"reddit"}');
});

it('drops an old account’s prompt on sign-in and uses only the current account’s dose count', async () => {
  mockUser = { uid: 'guest', isAnonymous: true };
  const { result, rerender } = renderHook(useOnboardingSurvey);
  await act(async () => result.current.offerSurvey(2, 'manual'));
  const staleFinish = result.current.finishSurvey;
  const staleOffer = result.current.offerSurvey;

  mockUser = { uid: 'returning', isAnonymous: false };
  rerender({});
  expect(result.current.prompt).toBeNull();
  await act(async () => staleFinish({ pmf, questionIndex: 3 }));
  await act(async () => staleOffer(2, 'scan'));
  await act(async () => result.current.offerSurvey(1, 'scan'));
  expect(result.current.prompt).toBeNull();
  expect(addDocWithEnv).not.toHaveBeenCalled();
  await act(async () => result.current.offerSurvey(2, 'scan'));
  expect(result.current.prompt).toMatchObject({ userId: 'returning', lastSessionType: 'scan' });
});
