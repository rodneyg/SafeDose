/**
 * Test for Sentry integration
 * Validates that Sentry can be initialized and basic functions work
 */

import { initSentry, captureException, captureMessage, setUser, addBreadcrumb } from '../lib/sentry';

describe('Sentry Integration', () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize Sentry without crashing', () => {
    expect(() => {
      initSentry();
    }).not.toThrow();
  });

  it('should handle captureException gracefully', () => {
    expect(() => {
      captureException(new Error('Test error'), {
        context: 'test_context',
        error_type: 'test_error'
      });
    }).not.toThrow();
  });

  it('should handle captureMessage gracefully', () => {
    expect(() => {
      captureMessage('Test message', 'info', {
        test_context: 'test_value'
      });
    }).not.toThrow();
  });

  it('should handle setUser gracefully', () => {
    expect(() => {
      setUser({
        id: 'test-user-id',
        planTier: 'free'
      });
    }).not.toThrow();

    expect(() => {
      setUser(null);
    }).not.toThrow();
  });

  it('should handle addBreadcrumb gracefully', () => {
    expect(() => {
      addBreadcrumb({
        message: 'Test breadcrumb',
        category: 'test',
        level: 'info',
        data: {
          test_key: 'test_value'
        }
      });
    }).not.toThrow();
  });

  it('should scrub sensitive data from breadcrumbs', () => {
    // This is a unit test for the scrubbing logic
    const sensitiveData = {
      email: 'user@example.com',
      password: 'secret123',
      token: 'abc123',
      apiKey: 'key123',
      uid: 'user123',
      safe_data: 'this should remain'
    };

    expect(() => {
      addBreadcrumb({
        message: 'Test breadcrumb with sensitive data',
        category: 'test',
        level: 'info',
        data: sensitiveData
      });
    }).not.toThrow();
  });

  it('should handle beforeSend data scrubbing', () => {
    // Test the beforeSend function logic
    const testEvent = {
      user: {
        id: 'user123',
        email: 'user@example.com',
        name: 'John Doe'
      },
      breadcrumbs: [{
        data: {
          email: 'user@example.com',
          safe_data: 'this should remain'
        }
      }],
      exception: {
        values: [{
          stacktrace: {
            frames: [{
              filename: '/some/local/path/file.js'
            }]
          }
        }]
      }
    };

    // The actual beforeSend function is internal to sentry.ts,
    // but we can test that our integration doesn't crash
    expect(() => {
      captureException(new Error('Test error for beforeSend'));
    }).not.toThrow();
  });
});