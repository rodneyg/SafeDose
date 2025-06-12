import { InjectionSite, DoseLog } from '../types/doseLog';

// Injection site metadata for display and rotation logic
export interface InjectionSiteInfo {
  id: InjectionSite;
  label: string;
  shortLabel: string;
  emoji: string;
}

// Injection site configuration matching the 2×4 grid layout
export const INJECTION_SITES: InjectionSiteInfo[] = [
  // Top row
  { id: 'abdomen_L', label: 'Abdomen Left', shortLabel: 'abdomen L', emoji: '🟢' },
  { id: 'abdomen_R', label: 'Abdomen Right', shortLabel: 'abdomen R', emoji: '🟢' },
  { id: 'thigh_L', label: 'Thigh Left', shortLabel: 'thigh L', emoji: '🔵' },
  { id: 'thigh_R', label: 'Thigh Right', shortLabel: 'thigh R', emoji: '🔵' },
  // Bottom row
  { id: 'glute_L', label: 'Glute Left', shortLabel: 'glute L', emoji: '🟡' },
  { id: 'glute_R', label: 'Glute Right', shortLabel: 'glute R', emoji: '🟡' },
  { id: 'arm_L', label: 'Arm Left', shortLabel: 'arm L', emoji: '🟠' },
  { id: 'arm_R', label: 'Arm Right', shortLabel: 'arm R', emoji: '🟠' },
];

// Get injection site info by ID
export function getInjectionSiteInfo(siteId: InjectionSite): InjectionSiteInfo {
  const site = INJECTION_SITES.find(s => s.id === siteId);
  if (!site) {
    throw new Error(`Unknown injection site: ${siteId}`);
  }
  return site;
}

// Find the least recently used injection site from dose history
export function getLeastRecentlyUsedSite(doseHistory: DoseLog[]): InjectionSite {
  // Get sites that have been used and when they were last used
  const siteUsage = new Map<InjectionSite, Date>();
  
  for (const log of doseHistory) {
    if (log.injectionSite) {
      const existing = siteUsage.get(log.injectionSite);
      const logDate = new Date(log.timestamp);
      
      if (!existing || logDate > existing) {
        siteUsage.set(log.injectionSite, logDate);
      }
    }
  }
  
  // Find unused sites first
  const unusedSites = INJECTION_SITES.filter(site => !siteUsage.has(site.id));
  if (unusedSites.length > 0) {
    // Return first unused site (abdomen_L by default)
    return unusedSites[0].id;
  }
  
  // All sites have been used, find the least recently used
  let oldestSite: InjectionSite = INJECTION_SITES[0].id;
  let oldestDate = siteUsage.get(oldestSite) || new Date(0);
  
  for (const [site, date] of siteUsage.entries()) {
    if (date < oldestDate) {
      oldestDate = date;
      oldestSite = site;
    }
  }
  
  return oldestSite;
}

// Check if a site was used within the last N days
export function wasSiteUsedRecently(
  siteId: InjectionSite, 
  doseHistory: DoseLog[], 
  daysThreshold: number = 7
): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  
  return doseHistory.some(log => 
    log.injectionSite === siteId && 
    new Date(log.timestamp) > cutoffDate
  );
}

// Get the last time a site was used
export function getLastUsedDate(siteId: InjectionSite, doseHistory: DoseLog[]): Date | null {
  let lastUsed: Date | null = null;
  
  for (const log of doseHistory) {
    if (log.injectionSite === siteId) {
      const logDate = new Date(log.timestamp);
      if (!lastUsed || logDate > lastUsed) {
        lastUsed = logDate;
      }
    }
  }
  
  return lastUsed;
}

// Format injection site for display in logs
export function formatInjectionSiteForDisplay(siteId: InjectionSite): string {
  const site = getInjectionSiteInfo(siteId);
  return site.shortLabel;
}