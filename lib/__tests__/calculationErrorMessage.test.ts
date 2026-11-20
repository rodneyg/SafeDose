import { calculationErrorMessage } from '../calculationErrorMessage';

it('removes the internal threshold code and whitespace from a visible error', () => {
  expect(calculationErrorMessage('VOLUME_THRESHOLD_ERROR: \t Check the selected syringe.'))
    .toBe('Check the selected syringe.');
});

it.each([
  'Enter a valid amount.',
  'Diagnostic: VOLUME_THRESHOLD_ERROR: details',
  '',
])('preserves other messages as written (%p)', (message) => {
  expect(calculationErrorMessage(message)).toBe(message);
});
