import { isWeb, isMobileWeb, isMobileDevice } from './utils';

// Mock global variables to simulate different environments
const mockWindow = (userAgent: string = '', platformOS: string = 'web') => {
  // Mock window and navigator
  Object.defineProperty(global, 'window', {
    value: typeof window !== 'undefined' ? window : {},
    writable: true,
  });
  
  Object.defineProperty(global, 'document', {
    value: typeof document !== 'undefined' ? document : {},
    writable: true,
  });
  
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent,
    },
    writable: true,
  });

  // Mock Platform.OS
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platformOS,
    },
  }));
};

describe('Platform Detection Utils', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isWeb', () => {
    it('should be true when window and document are defined', () => {
      mockWindow();
      expect(isWeb).toBe(true);
    });
  });

  describe('isMobileDevice detection', () => {
    it('should detect Android as mobile', () => {
      mockWindow('Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36');
      const { isMobileDevice: androidMobile } = require('./utils');
      expect(androidMobile).toBe(true);
    });

    it('should detect iPhone as mobile', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
      const { isMobileDevice: iPhoneMobile } = require('./utils');
      expect(iPhoneMobile).toBe(true);
    });

    it('should detect desktop Chrome as not mobile', () => {
      mockWindow('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      const { isMobileDevice: desktopMobile } = require('./utils');
      expect(desktopMobile).toBe(false);
    });

    it('should detect desktop Safari as not mobile', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      const { isMobileDevice: desktopSafari } = require('./utils');
      expect(desktopSafari).toBe(false);
    });
  });

  describe('isMobileWeb', () => {
    it('should be true for mobile device on web platform', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15', 'web');
      const { isMobileWeb: mobileiOS } = require('./utils');
      expect(mobileiOS).toBe(true);
    });

    it('should be false for desktop device on web platform', () => {
      mockWindow('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'web');
      const { isMobileWeb: desktopWeb } = require('./utils');
      expect(desktopWeb).toBe(false);
    });

    it('should be false for mobile device on native platform', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15', 'ios');
      const { isMobileWeb: nativeiOS } = require('./utils');
      expect(nativeiOS).toBe(false);
    });
  });
});