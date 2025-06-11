import { 
  INJECTION_SITES, 
  getInjectionSiteInfo, 
  getLeastRecentlyUsedSite, 
  wasSiteUsedRecently, 
  getLastUsedDate,
  formatInjectionSiteForDisplay 
} from '../injectionSites';
import { InjectionSite, DoseLog } from '../../types/doseLog';

describe('Injection Sites', () => {
  const createMockLog = (
    site: InjectionSite, 
    daysAgo: number, 
    id: string = `log-${Date.now()}`
  ): DoseLog => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    return {
      id,
      substanceName: 'Test Substance',
      doseValue: 10,
      unit: 'mg',
      calculatedVolume: 0.5,
      injectionSite: site,
      timestamp: date.toISOString(),
    };
  };

  describe('getInjectionSiteInfo', () => {
    it('should return info for valid injection sites', () => {
      const info = getInjectionSiteInfo('abdomen_L');
      expect(info.id).toBe('abdomen_L');
      expect(info.label).toBe('Abdomen Left');
      expect(info.shortLabel).toBe('abdomen L');
      expect(info.emoji).toBe('🟢');
    });

    it('should throw error for invalid injection site', () => {
      expect(() => {
        getInjectionSiteInfo('invalid_site' as InjectionSite);
      }).toThrow('Unknown injection site: invalid_site');
    });
  });

  describe('getLeastRecentlyUsedSite', () => {
    it('should return first site (abdomen_L) when no history', () => {
      const result = getLeastRecentlyUsedSite([]);
      expect(result).toBe('abdomen_L');
    });

    it('should return first unused site when some sites have been used', () => {
      const history = [
        createMockLog('abdomen_L', 1),
        createMockLog('thigh_R', 2),
      ];
      
      const result = getLeastRecentlyUsedSite(history);
      expect(result).toBe('abdomen_R'); // First unused site
    });

    it('should return least recently used site when all sites have been used', () => {
      const history = [
        createMockLog('abdomen_L', 1),
        createMockLog('abdomen_R', 2),
        createMockLog('thigh_L', 3),
        createMockLog('thigh_R', 4),
        createMockLog('glute_L', 5),
        createMockLog('glute_R', 6),
        createMockLog('arm_L', 7),
        createMockLog('arm_R', 8), // Oldest usage
      ];
      
      const result = getLeastRecentlyUsedSite(history);
      expect(result).toBe('arm_R');
    });

    it('should handle multiple logs for same site correctly', () => {
      const history = [
        createMockLog('abdomen_L', 1),
        createMockLog('abdomen_L', 3), // Earlier log for same site
        createMockLog('thigh_R', 2),
      ];
      
      const result = getLeastRecentlyUsedSite(history);
      expect(result).toBe('abdomen_R'); // First unused site
    });
  });

  describe('wasSiteUsedRecently', () => {
    it('should return true if site was used within threshold', () => {
      const history = [
        createMockLog('abdomen_L', 3), // 3 days ago
      ];
      
      const result = wasSiteUsedRecently('abdomen_L', history, 7);
      expect(result).toBe(true);
    });

    it('should return false if site was used outside threshold', () => {
      const history = [
        createMockLog('abdomen_L', 10), // 10 days ago
      ];
      
      const result = wasSiteUsedRecently('abdomen_L', history, 7);
      expect(result).toBe(false);
    });

    it('should return false if site was never used', () => {
      const history = [
        createMockLog('thigh_R', 3),
      ];
      
      const result = wasSiteUsedRecently('abdomen_L', history, 7);
      expect(result).toBe(false);
    });

    it('should use most recent usage for multiple logs', () => {
      const history = [
        createMockLog('abdomen_L', 3),  // More recent
        createMockLog('abdomen_L', 10), // Older
      ];
      
      const result = wasSiteUsedRecently('abdomen_L', history, 7);
      expect(result).toBe(true); // Based on 3 days ago, not 10
    });
  });

  describe('getLastUsedDate', () => {
    it('should return null if site was never used', () => {
      const history = [
        createMockLog('thigh_R', 3),
      ];
      
      const result = getLastUsedDate('abdomen_L', history);
      expect(result).toBeNull();
    });

    it('should return most recent date for site', () => {
      const history = [
        createMockLog('abdomen_L', 3),  // More recent
        createMockLog('abdomen_L', 10), // Older
        createMockLog('thigh_R', 1),    // Different site
      ];
      
      const result = getLastUsedDate('abdomen_L', history);
      expect(result).not.toBeNull();
      
      if (result) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        // Allow for small time differences due to test execution time
        const timeDiff = Math.abs(result.getTime() - threeDaysAgo.getTime());
        expect(timeDiff).toBeLessThan(10000); // Within 10 seconds
      }
    });
  });

  describe('formatInjectionSiteForDisplay', () => {
    it('should format all injection sites correctly', () => {
      expect(formatInjectionSiteForDisplay('abdomen_L')).toBe('abdomen L');
      expect(formatInjectionSiteForDisplay('abdomen_R')).toBe('abdomen R');
      expect(formatInjectionSiteForDisplay('thigh_L')).toBe('thigh L');
      expect(formatInjectionSiteForDisplay('thigh_R')).toBe('thigh R');
      expect(formatInjectionSiteForDisplay('glute_L')).toBe('glute L');
      expect(formatInjectionSiteForDisplay('glute_R')).toBe('glute R');
      expect(formatInjectionSiteForDisplay('arm_L')).toBe('arm L');
      expect(formatInjectionSiteForDisplay('arm_R')).toBe('arm R');
    });
  });

  describe('INJECTION_SITES configuration', () => {
    it('should have exactly 8 injection sites', () => {
      expect(INJECTION_SITES).toHaveLength(8);
    });

    it('should have all required sites with correct structure', () => {
      const expectedSites = [
        'abdomen_L', 'abdomen_R', 'thigh_L', 'thigh_R',
        'glute_L', 'glute_R', 'arm_L', 'arm_R'
      ];

      expectedSites.forEach(siteId => {
        const site = INJECTION_SITES.find(s => s.id === siteId);
        expect(site).toBeDefined();
        expect(site?.label).toBeTruthy();
        expect(site?.shortLabel).toBeTruthy();
        expect(site?.emoji).toBeTruthy();
      });
    });

    it('should have unique IDs', () => {
      const ids = INJECTION_SITES.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});