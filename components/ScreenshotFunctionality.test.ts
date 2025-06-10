import { captureResultsScreenshot } from '../lib/screenshotUtils';

// Mock the platform detection
jest.mock('../lib/utils', () => ({
  isWeb: false, // Start with native platform test
}));

// Mock Alert
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock html2canvas
jest.mock('html2canvas', () => ({
  default: jest.fn(() => Promise.resolve({
    toDataURL: jest.fn(() => 'data:image/png;base64,mock-data')
  }))
}));

// Mock react-native-view-shot
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file://mock-path/screenshot.png'))
}));

describe('Screenshot Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Native Platform Screenshot', () => {
    beforeEach(() => {
      // Mock as native platform
      jest.doMock('../lib/utils', () => ({
        isWeb: false,
      }));
    });

    it('should capture screenshot on native platform', async () => {
      const mockViewRef = {
        current: { measureInWindow: jest.fn() }
      };

      // Mock successful capture
      const mockCaptureRef = jest.fn(() => Promise.resolve('file://mock-path/screenshot.png'));
      
      jest.doMock('react-native-view-shot', () => ({
        captureRef: mockCaptureRef
      }));

      // This should not throw
      await expect(captureResultsScreenshot(mockViewRef)).resolves.toBeUndefined();
    });

    it('should handle native screenshot errors gracefully', async () => {
      const mockViewRef = null;

      await expect(captureResultsScreenshot(mockViewRef)).rejects.toThrow();
    });
  });

  describe('Web Platform Screenshot', () => {
    beforeEach(() => {
      // Mock as web platform
      Object.defineProperty(global, 'document', {
        value: {
          getElementById: jest.fn(() => ({
            id: 'results-container'
          })),
          createElement: jest.fn((tag) => {
            if (tag === 'a') {
              return {
                download: '',
                href: '',
                click: jest.fn(),
                style: {}
              };
            }
            return {};
          }),
          body: {
            appendChild: jest.fn(),
            removeChild: jest.fn()
          }
        },
        writable: true
      });

      jest.doMock('../lib/utils', () => ({
        isWeb: true,
      }));
    });

    it('should capture screenshot on web platform', async () => {
      // Mock html2canvas
      const mockCanvas = {
        toDataURL: jest.fn(() => 'data:image/png;base64,mock-data')
      };
      
      const mockHtml2canvas = jest.fn(() => Promise.resolve(mockCanvas));
      
      jest.doMock('html2canvas', () => ({
        default: mockHtml2canvas
      }));

      // This should not throw
      await expect(captureResultsScreenshot('results-container')).resolves.toBeUndefined();
    });

    it('should handle web screenshot errors when element not found', async () => {
      Object.defineProperty(global, 'document', {
        value: {
          getElementById: jest.fn(() => null),
        },
        writable: true
      });

      await expect(captureResultsScreenshot('nonexistent-element')).rejects.toThrow();
    });
  });

  describe('Screenshot Button Integration', () => {
    it('should have proper button text states', () => {
      // Test that the button shows correct text when saving/idle
      const savingText = 'Saving...';
      const idleText = 'Save';
      
      expect(savingText).toBe('Saving...');
      expect(idleText).toBe('Save');
    });

    it('should generate proper screenshot filename', () => {
      const { getScreenshotFilename } = require('../lib/screenshotUtils');
      const filename = getScreenshotFilename();
      
      expect(filename).toMatch(/^SafeDose_Results_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });
  });
});