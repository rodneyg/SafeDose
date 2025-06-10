import { useWhyAreYouHereTracking } from '../hooks/useWhyAreYouHereTracking';

describe('useWhyAreYouHereTracking', () => {
  it('should export the hook function', () => {
    expect(typeof useWhyAreYouHereTracking).toBe('function');
  });
});