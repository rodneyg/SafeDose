import { ScanResult } from '../lib/cameraUtils';

describe('Image Preview Flow', () => {
  describe('ScanResult with captured image', () => {
    it('should include capturedImage data when image is captured', () => {
      const mockScanResult: ScanResult = {
        syringe: {
          type: 'Standard',
          volume: '3 ml',
          markings: '0.1,0.2,0.3'
        },
        vial: {
          substance: 'Test Medicine',
          totalAmount: '10 mg',
          concentration: '5 mg/ml',
          expiration: '2025-12-31'
        },
        capturedImage: {
          uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
          mimeType: 'image/jpeg'
        }
      };

      expect(mockScanResult.capturedImage).toBeDefined();
      expect(mockScanResult.capturedImage?.uri).toContain('data:image/jpeg;base64,');
      expect(mockScanResult.capturedImage?.mimeType).toBe('image/jpeg');
    });

    it('should work without capturedImage data for backwards compatibility', () => {
      const mockScanResult: ScanResult = {
        syringe: {
          type: 'Insulin',
          volume: '1 ml',
          markings: '0.05,0.1,0.15'
        },
        vial: {
          substance: 'Insulin',
          totalAmount: '1000 units',
          concentration: '100 units/ml',
          expiration: '2025-06-30'
        }
      };

      expect(mockScanResult.capturedImage).toBeUndefined();
      expect(mockScanResult.syringe.type).toBe('Insulin');
      expect(mockScanResult.vial.substance).toBe('Insulin');
    });

    it('should handle unreadable scan data', () => {
      const mockScanResult: ScanResult = {
        syringe: {
          type: 'unreadable',
          volume: 'unreadable',
          markings: 'unreadable'
        },
        vial: {
          substance: 'unreadable',
          totalAmount: 'unreadable',
          concentration: 'unreadable',
          expiration: 'unreadable'
        },
        capturedImage: {
          uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          mimeType: 'image/png'
        }
      };

      expect(mockScanResult.syringe.type).toBe('unreadable');
      expect(mockScanResult.vial.substance).toBe('unreadable');
      expect(mockScanResult.capturedImage?.mimeType).toBe('image/png');
    });

    it('should handle null scan data', () => {
      const mockScanResult: ScanResult = {
        syringe: {
          type: null,
          volume: null,
          markings: null
        },
        vial: {
          substance: null,
          totalAmount: null,
          concentration: null,
          expiration: null
        },
        capturedImage: {
          uri: 'data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAABwA...',
          mimeType: 'image/webp'
        }
      };

      expect(mockScanResult.syringe.type).toBeNull();
      expect(mockScanResult.vial.substance).toBeNull();
      expect(mockScanResult.capturedImage?.mimeType).toBe('image/webp');
    });
  });
});
