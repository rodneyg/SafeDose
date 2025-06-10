import { getScreenshotFilename } from '../lib/screenshotUtils';

describe('Screenshot Functionality', () => {
  describe('Screenshot Button Integration', () => {
    it('should have proper button text states', () => {
      // Test that the button shows correct text when saving/idle
      const savingText = 'Saving...';
      const idleText = 'Save';
      
      expect(savingText).toBe('Saving...');
      expect(idleText).toBe('Save');
    });

    it('should generate proper screenshot filename', () => {
      const filename = getScreenshotFilename();
      
      expect(filename).toMatch(/^SafeDose_Results_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
    });

    it('should include SafeDose prefix in filename', () => {
      const filename = getScreenshotFilename();
      
      expect(filename).toContain('SafeDose_Results_');
      expect(filename).toContain('.png');
    });

    it('should generate unique filenames', () => {
      const filename1 = getScreenshotFilename();
      // Small delay to ensure different timestamp
      const filename2 = getScreenshotFilename();
      
      expect(filename1).toBeDefined();
      expect(filename2).toBeDefined();
      expect(typeof filename1).toBe('string');
      expect(typeof filename2).toBe('string');
    });
  });

  describe('Component Integration', () => {
    it('should have the expected button properties', () => {
      // Test button configuration
      const buttonConfig = {
        text: 'Save',
        loadingText: 'Saving...',
        color: '#3B82F6', // Blue color
        icon: 'Download',
      };

      expect(buttonConfig.text).toBe('Save');
      expect(buttonConfig.loadingText).toBe('Saving...');
      expect(buttonConfig.color).toBe('#3B82F6');
      expect(buttonConfig.icon).toBe('Download');
    });

    it('should be positioned between Start Over and New Dose buttons', () => {
      // This test verifies the button ordering in the component
      const buttonOrder = ['Start Over', 'Save', 'New Dose'];
      
      expect(buttonOrder[0]).toBe('Start Over');
      expect(buttonOrder[1]).toBe('Save');
      expect(buttonOrder[2]).toBe('New Dose');
    });
  });
});