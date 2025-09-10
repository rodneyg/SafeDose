/**
 * SafeDose Firebase Service
 * Integrates Firebase with client-side encryption for HIPAA compliance
 * Supports both educational and personal modes
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { getDbInstance } from '../firebase';
import { 
  SafeDoseEncryption, 
  EncryptedData, 
  SafeDoseCalculation, 
  EducationalCalculation, 
  PersonalCalculation 
} from './safeDoseEncryption';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredCalculation {
  id: string;
  userId: string;
  encryptedData?: EncryptedData; // Only for personal calculations
  educationalData?: EducationalCalculation; // For educational calculations
  calculationType: 'educational' | 'personal';
  timestamp: Timestamp;
  genericCategory: string; // For analytics/filtering
  complianceFlags: {
    disclaimerAcknowledged: boolean;
    educationalPurpose: boolean;
    requiresVerification: boolean;
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  timestamp: Timestamp;
  metadata?: {
    calculationType?: 'educational' | 'personal';
    genericCategory?: string;
    userAgent?: string;
    ipHash?: string; // Hashed IP for privacy
  };
}

export class SafeDoseFirebaseService {
  private encryption: SafeDoseEncryption;
  private db: any;

  constructor() {
    this.encryption = new SafeDoseEncryption();
    this.db = getDbInstance();
  }

  /**
   * Saves calculation with appropriate encryption based on type
   */
  async saveCalculation(
    calculation: SafeDoseCalculation, 
    userId: string
  ): Promise<string> {
    try {
      // Always save locally first as fallback
      await this.saveCalculationLocally(calculation, userId);

      // Determine storage approach based on calculation type
      if (calculation.isEducational) {
        return await this.saveEducationalCalculation(calculation, userId);
      } else {
        return await this.savePersonalCalculation(calculation as PersonalCalculation, userId);
      }
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to save calculation:', error);
      // Local storage serves as fallback
      await this.logAuditEvent(userId, 'calculation_save_fallback_local', {
        calculationType: calculation.isEducational ? 'educational' : 'personal',
        genericCategory: calculation.genericSubstance
      });
      return 'local_only';
    }
  }

  /**
   * Saves educational calculation (no encryption needed, no PHI)
   */
  private async saveEducationalCalculation(
    calculation: EducationalCalculation,
    userId: string
  ): Promise<string> {
    const calculationsCollection = collection(this.db, 'educational_calculations');
    
    const storedData: Partial<StoredCalculation> = {
      userId,
      educationalData: calculation,
      calculationType: 'educational',
      timestamp: Timestamp.fromDate(new Date()),
      genericCategory: calculation.genericSubstance,
      complianceFlags: {
        disclaimerAcknowledged: calculation.disclaimerAcknowledged,
        educationalPurpose: true,
        requiresVerification: true
      }
    };

    const docRef = await addDoc(calculationsCollection, storedData);
    
    await this.logAuditEvent(userId, 'educational_calculation_saved', {
      calculationType: 'educational',
      genericCategory: calculation.genericSubstance
    });

    return docRef.id;
  }

  /**
   * Saves personal calculation (encrypted PHI)
   */
  private async savePersonalCalculation(
    calculation: PersonalCalculation,
    userId: string
  ): Promise<string> {
    // Encrypt the PHI data
    const encryptedData = await this.encryption.encryptData(calculation, userId);
    
    const calculationsCollection = collection(this.db, 'personal_calculations');
    
    const storedData: Partial<StoredCalculation> = {
      userId,
      encryptedData,
      calculationType: 'personal',
      timestamp: Timestamp.fromDate(new Date()),
      genericCategory: calculation.genericSubstance, // Generic category not encrypted
      complianceFlags: {
        disclaimerAcknowledged: calculation.disclaimerAcknowledged,
        educationalPurpose: false,
        requiresVerification: true
      }
    };

    const docRef = await addDoc(calculationsCollection, storedData);
    
    await this.logAuditEvent(userId, 'personal_calculation_saved', {
      calculationType: 'personal',
      genericCategory: calculation.genericSubstance
    });

    return docRef.id;
  }

  /**
   * Retrieves calculations for a user
   */
  async getCalculations(
    userId: string, 
    type?: 'educational' | 'personal' | 'both',
    limit: number = 50
  ): Promise<SafeDoseCalculation[]> {
    try {
      const calculations: SafeDoseCalculation[] = [];

      // Get educational calculations if requested
      if (type === 'educational' || type === 'both' || !type) {
        const educationalCalcs = await this.getEducationalCalculations(userId, limit);
        calculations.push(...educationalCalcs);
      }

      // Get personal calculations if requested
      if (type === 'personal' || type === 'both' || !type) {
        const personalCalcs = await this.getPersonalCalculations(userId, limit);
        calculations.push(...personalCalcs);
      }

      // Sort by timestamp (most recent first)
      calculations.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Log access event
      await this.logAuditEvent(userId, 'calculations_retrieved', {
        calculationType: type || 'both'
      });

      return calculations.slice(0, limit);
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to get calculations:', error);
      
      // Fallback to local storage
      const localCalcs = await this.getCalculationsLocally(userId);
      await this.logAuditEvent(userId, 'calculations_retrieved_fallback_local');
      
      return localCalcs;
    }
  }

  /**
   * Gets educational calculations from Firestore
   */
  private async getEducationalCalculations(
    userId: string, 
    limit: number
  ): Promise<EducationalCalculation[]> {
    const calculationsCollection = collection(this.db, 'educational_calculations');
    const q = query(
      calculationsCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const calculations: EducationalCalculation[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as StoredCalculation;
      if (data.educationalData) {
        calculations.push(data.educationalData);
      }
    });

    return calculations.slice(0, limit);
  }

  /**
   * Gets personal calculations from Firestore (decrypts them)
   */
  private async getPersonalCalculations(
    userId: string, 
    limit: number
  ): Promise<PersonalCalculation[]> {
    const calculationsCollection = collection(this.db, 'personal_calculations');
    const q = query(
      calculationsCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const calculations: PersonalCalculation[] = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data() as StoredCalculation;
      if (data.encryptedData) {
        try {
          const decrypted = await this.encryption.decryptData(data.encryptedData, userId);
          calculations.push(decrypted);
        } catch (error) {
          console.error('[SafeDoseFirebaseService] Failed to decrypt calculation:', error);
          // Skip this calculation but continue with others
        }
      }
    }

    return calculations.slice(0, limit);
  }

  /**
   * Deletes a calculation
   */
  async deleteCalculation(calculationId: string, userId: string): Promise<boolean> {
    try {
      // Try to delete from both collections (we don't know which one it's in)
      await this.tryDeleteFromCollection('educational_calculations', calculationId, userId);
      await this.tryDeleteFromCollection('personal_calculations', calculationId, userId);
      
      // Also remove from local storage
      await this.deleteCalculationLocally(calculationId, userId);

      await this.logAuditEvent(userId, 'calculation_deleted', {
        calculationType: 'unknown' // We don't know the type during deletion
      });

      return true;
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to delete calculation:', error);
      return false;
    }
  }

  /**
   * Helper to try deleting from a specific collection
   */
  private async tryDeleteFromCollection(
    collectionName: string, 
    calculationId: string, 
    userId: string
  ): Promise<void> {
    try {
      const calculationsCollection = collection(this.db, collectionName);
      const q = query(
        calculationsCollection,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const storedCalcId = data.educationalData?.id || data.encryptedData?.payload;
        
        if (storedCalcId && storedCalcId.includes(calculationId)) {
          await deleteDoc(doc.ref);
          break;
        }
      }
    } catch (error) {
      // Silently fail - this is expected if the calculation isn't in this collection
    }
  }

  /**
   * Local storage operations for fallback and offline support
   */
  private async saveCalculationLocally(
    calculation: SafeDoseCalculation, 
    userId: string
  ): Promise<void> {
    try {
      const storageKey = `safedose_calculations_${userId}`;
      const existing = await AsyncStorage.getItem(storageKey);
      const calculations: SafeDoseCalculation[] = existing ? JSON.parse(existing) : [];
      
      calculations.unshift(calculation);
      
      // Keep only last 100 calculations locally
      if (calculations.length > 100) {
        calculations.splice(100);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(calculations));
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to save calculation locally:', error);
    }
  }

  private async getCalculationsLocally(userId: string): Promise<SafeDoseCalculation[]> {
    try {
      const storageKey = `safedose_calculations_${userId}`;
      const stored = await AsyncStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to get calculations locally:', error);
      return [];
    }
  }

  private async deleteCalculationLocally(calculationId: string, userId: string): Promise<void> {
    try {
      const storageKey = `safedose_calculations_${userId}`;
      const existing = await AsyncStorage.getItem(storageKey);
      if (existing) {
        const calculations: SafeDoseCalculation[] = JSON.parse(existing);
        const filtered = calculations.filter(calc => calc.id !== calculationId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to delete calculation locally:', error);
    }
  }

  /**
   * Audit logging for compliance
   */
  async logAuditEvent(
    userId: string, 
    action: string, 
    metadata?: AuditLogEntry['metadata']
  ): Promise<void> {
    try {
      const auditCollection = collection(this.db, 'audit_logs');
      
      const auditEntry: Partial<AuditLogEntry> = {
        userId,
        action,
        timestamp: Timestamp.fromDate(new Date()),
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }
      };

      await addDoc(auditCollection, auditEntry);
    } catch (error) {
      // Audit logging failures shouldn't break the main flow
      console.error('[SafeDoseFirebaseService] Failed to log audit event:', error);
    }
  }

  /**
   * Gets anonymized analytics data (no PHI)
   */
  async getAnalyticsData(userId: string): Promise<any[]> {
    try {
      const calculations = await this.getCalculations(userId, 'both');
      return calculations.map(calc => this.encryption.anonymizeForAnalytics(calc));
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to get analytics data:', error);
      return [];
    }
  }

  /**
   * Validates user's compliance with educational disclaimers
   */
  async validateComplianceStatus(userId: string): Promise<{
    hasAcknowledgedDisclaimers: boolean;
    educationalPurposeConfirmed: boolean;
    requiresReverification: boolean;
  }> {
    try {
      const recentCalculations = await this.getCalculations(userId, 'both', 10);
      
      const hasAcknowledgedDisclaimers = recentCalculations.every(calc => 
        calc.disclaimerAcknowledged
      );
      
      const educationalPurposeConfirmed = recentCalculations.some(calc => 
        calc.isEducational
      );
      
      // Require reverification if no activity in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const requiresReverification = recentCalculations.length === 0 || 
        recentCalculations.every(calc => 
          new Date(calc.timestamp) < thirtyDaysAgo
        );

      return {
        hasAcknowledgedDisclaimers,
        educationalPurposeConfirmed,
        requiresReverification
      };
    } catch (error) {
      console.error('[SafeDoseFirebaseService] Failed to validate compliance:', error);
      return {
        hasAcknowledgedDisclaimers: false,
        educationalPurposeConfirmed: false,
        requiresReverification: true
      };
    }
  }
}

export const safeDoseFirebaseService = new SafeDoseFirebaseService();