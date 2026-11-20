import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import OnboardingSurvey from './OnboardingSurvey';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../lib/analytics';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../__mocks__/react-native'));
jest.mock('lucide-react-native', () => ({ ChevronLeft: 'ChevronLeft', ChevronRight: 'ChevronRight' }));
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: { PMF_SURVEY_QUESTION_ANSWERED: 'pmf_survey_question_answered' },
}));

let renderer: ReactTestRenderer;
const complete = jest.fn();
const text = (label: string) => renderer.root.findAllByType('Text' as any).find(node =>
  (Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children) === label
);
const button = (label: string) => text(label)!.parent!;
const press = (label: string) => act(() => button(label).props.onPress());
const input = () => renderer.root.findByType('TextInput' as any);
const enter = (value: string) => act(() => input().props.onChangeText(value));

function render(includeWhyHere = true) {
  act(() => { renderer = create(<OnboardingSurvey includeWhyHere={includeWhyHere} sessionCount={2} onComplete={complete} />); });
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => act(() => renderer.unmount()));

it('collects all required PMF fields and optional reason with progress and editable answers', () => {
  render();
  expect(text('1 of 5')).toBeDefined();
  for (const label of [
    'Reddit', 'Twitter / X', 'Heard from a friend', 'Needed a clean calculator',
    'Trying the AI scan', 'Curious about dose logs', 'Comparing tools / other peptide site', 'Other',
  ]) expect(text(label)).toBeDefined();
  press('Other');
  expect(input().props.maxLength).toBe(200);
  enter('  A community forum  ');
  press('Next');
  expect(text('2 of 5')).toBeDefined();
  expect(button('Next').props.disabled).toBe(true);
  press('Very disappointed');
  press('Next');
  enter('   ');
  expect(button('Next').props.disabled).toBe(true);
  enter('People keeping a dose log');
  press('Next');
  enter('A clearer workflow');
  press('Back');
  expect(input().props.value).toBe('People keeping a dose log');
  press('Next');
  expect(input().props.value).toBe('A clearer workflow');
  press('Next');
  expect(text('5 of 5')).toBeDefined();
  expect(button('Complete').props.disabled).toBe(true);
  enter('  Larger text  ');
  press('Complete');

  expect(complete).toHaveBeenCalledWith({
    whyHere: { response: 'other', customText: 'A community forum' },
    questionIndex: 3,
    pmf: {
      disappointment: 'very_disappointed',
      benefitPerson: 'People keeping a dose log',
      mainBenefit: 'A clearer workflow',
      improvements: 'Larger text',
    },
  });
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
    questionIndex: 3, questionId: 'improvements', answerType: 'text', answerLength: 11, sessionCount: 2,
  });
});

it('lets users pass the optional reason and skip the rest from any question', () => {
  render();
  press('Next');
  press('Skip survey');
  expect(complete).toHaveBeenCalledWith({ questionIndex: 0, whyHere: undefined });
});

it('starts directly at PMF when the user already handled the reason prompt', () => {
  render(false);
  expect(text('1 of 4')).toBeDefined();
  expect(text('How would you feel if you could no longer use SafeDose?')).toBeDefined();
  expect(text('What brought you here today? (Optional)')).toBeUndefined();
});
