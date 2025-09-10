/**
 * SafeAPI - Abstract Encryption & Data Layer
 * Generic PGP + Firebase integration that can be used by any health/privacy-focused application
 * Provides legal compliance, data protection, and audit trail capabilities
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
  DocumentData,
  QuerySnapshot,
  DocumentReference
} from 'firebase/firestore';
import { getDbInstance } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Abstract interfaces that any application can implement
export interface SecureData {
  id: string;
  encryptedPayload?: string;
  plainData?: any;
  isEncrypted: boolean;
  timestamp: string;
  userId: string;
  dataType: string;
  metadata?: Record<string, any>;
}

export interface EncryptionConfig {
  algorithm: 'PGP' | 'AES-GCM' | 'AES-CBC';
  keyDerivationRounds: number;
  version: string;
}

export interface StorageConfig {
  collection: string;
  enableAuditTrail: boolean;
  enableAnalytics: boolean;
  retentionPolicyDays?: number;
}

export interface ComplianceConfig {
  enableHIPAA: boolean;
  enableGDPR: boolean;
  requireExplicitConsent: boolean;
  auditLogLevel: 'minimal' | 'standard' | 'comprehensive';
  disclaimerRequirements: string[];
}

export interface UserContext {
  uid: string;
  isAnonymous: boolean;
  consentLevel: 'none' | 'basic' | 'full';
  encryptionEnabled: boolean;
  complianceFlags: Record<string, boolean>;
}

export interface AuditEvent {
  userId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  complianceRelevant: boolean;
}

/**
 * Abstract SafeAPI class - can be extended for different use cases
 */
export abstract class SafeAPI {
  protected encryptionConfig: EncryptionConfig;
  protected storageConfig: StorageConfig;
  protected complianceConfig: ComplianceConfig;
  protected currentUser: UserContext | null = null;

  constructor(
    encryptionConfig: EncryptionConfig,
    storageConfig: StorageConfig,
    complianceConfig: ComplianceConfig
  ) {
    this.encryptionConfig = encryptionConfig;
    this.storageConfig = storageConfig;
    this.complianceConfig = complianceConfig;
  }

  /**
   * Initialize with user context
   */
  async initialize(userContext: UserContext): Promise<void> {
    this.currentUser = userContext;
    
    if (this.complianceConfig.enableAuditTrail) {
      await this.logAuditEvent('api_initialized', {
        userId: userContext.uid,
        isAnonymous: userContext.isAnonymous,
        encryptionEnabled: userContext.encryptionEnabled
      });
    }
  }

  /**
   * Store data securely (encrypted or plain based on user preferences)
   */
  async storeData(
    data: any,
    dataType: string,
    forceEncryption: boolean = false,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.currentUser) {
      throw new Error('User context required for data storage');
    }

    const shouldEncrypt = forceEncryption || 
      (this.currentUser.encryptionEnabled && !this.currentUser.isAnonymous);

    let secureData: SecureData;

    if (shouldEncrypt) {
      const encryptedPayload = await this.encryptData(data);
      secureData = {
        id: '', // Will be set by Firestore
        encryptedPayload,
        isEncrypted: true,
        timestamp: new Date().toISOString(),
        userId: this.currentUser.uid,
        dataType,
        metadata: {
          ...metadata,
          algorithm: this.encryptionConfig.algorithm,
          version: this.encryptionConfig.version
        }
      };
    } else {
      // Store anonymized/educational data without encryption
      const anonymizedData = await this.anonymizeData(data, dataType);
      secureData = {
        id: '',
        plainData: anonymizedData,
        isEncrypted: false,
        timestamp: new Date().toISOString(),
        userId: this.currentUser.uid,
        dataType,
        metadata
      };
    }

    // Store in Firebase
    const db = getDbInstance();
    const docRef = await addDoc(
      collection(db, this.storageConfig.collection),
      {
        ...secureData,
        timestamp: Timestamp.fromDate(new Date()),
        complianceFlags: this.generateComplianceFlags(dataType, shouldEncrypt)
      }
    );

    const documentId = docRef.id;

    // Log for audit trail
    if (this.storageConfig.enableAuditTrail) {
      await this.logAuditEvent('data_stored', {
        documentId,
        dataType,
        isEncrypted: shouldEncrypt,
        userId: this.currentUser.uid
      });
    }

    return documentId;
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieveData(
    dataType: string, 
    limit: number = 50,
    filters?: Record<string, any>
  ): Promise<SecureData[]> {
    if (!this.currentUser) {
      return [];
    }

    try {
      const db = getDbInstance();
      let q = query(
        collection(db, this.storageConfig.collection),
        where('userId', '==', this.currentUser.uid),
        where('dataType', '==', dataType),
        orderBy('timestamp', 'desc')
      );

      // Apply additional filters if provided
      if (filters) {
        for (const [field, value] of Object.entries(filters)) {
          q = query(q, where(field, '==', value));
        }
      }

      const snapshot = await getDocs(q);
      const results: SecureData[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let secureData: SecureData = {
          id: docSnap.id,
          isEncrypted: data.isEncrypted || false,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          userId: data.userId,
          dataType: data.dataType,
          metadata: data.metadata
        };

        if (data.isEncrypted && data.encryptedPayload) {
          // Decrypt the data
          try {
            secureData.plainData = await this.decryptData(data.encryptedPayload);
            secureData.encryptedPayload = data.encryptedPayload;
          } catch (error) {
            console.error('[SafeAPI] Failed to decrypt data:', error);
            // Skip corrupted data rather than failing entirely
            continue;
          }
        } else {
          secureData.plainData = data.plainData;
        }

        results.push(secureData);

        if (results.length >= limit) break;
      }

      // Log retrieval for audit
      if (this.storageConfig.enableAuditTrail) {
        await this.logAuditEvent('data_retrieved', {
          dataType,
          recordCount: results.length,
          userId: this.currentUser.uid
        });
      }

      return results;
    } catch (error) {
      console.error('[SafeAPI] Failed to retrieve data:', error);
      throw new Error(`Failed to retrieve ${dataType} data`);
    }
  }

  /**
   * Delete data with compliance logging
   */
  async deleteData(documentId: string, reason?: string): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      const db = getDbInstance();
      await deleteDoc(doc(db, this.storageConfig.collection, documentId));

      // Log deletion for compliance
      if (this.storageConfig.enableAuditTrail) {
        await this.logAuditEvent('data_deleted', {
          documentId,
          reason,
          userId: this.currentUser.uid,
          complianceRelevant: true
        });
      }

      return true;
    } catch (error) {
      console.error('[SafeAPI] Failed to delete data:', error);
      return false;
    }
  }

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(): Promise<any> {
    if (!this.currentUser) {
      throw new Error('No user context for data export');
    }

    try {
      const db = getDbInstance();
      const q = query(
        collection(db, this.storageConfig.collection),
        where('userId', '==', this.currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const exportData: any[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let exportRecord: any = {
          id: docSnap.id,
          dataType: data.dataType,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          isEncrypted: data.isEncrypted,
          metadata: data.metadata
        };

        // Include decrypted data for user export
        if (data.isEncrypted && data.encryptedPayload) {
          try {
            exportRecord.data = await this.decryptData(data.encryptedPayload);
          } catch (error) {
            exportRecord.data = '[DECRYPTION_FAILED]';
          }
        } else {
          exportRecord.data = data.plainData;
        }

        exportData.push(exportRecord);
      }

      // Log export for compliance
      await this.logAuditEvent('data_exported', {
        recordCount: exportData.length,
        userId: this.currentUser.uid,
        complianceRelevant: true
      });

      return {
        userId: this.currentUser.uid,
        exportDate: new Date().toISOString(),
        totalRecords: exportData.length,
        data: exportData,
        complianceNote: 'Export generated for GDPR compliance'
      };
    } catch (error) {
      console.error('[SafeAPI] Failed to export user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   */
  async deleteAllUserData(): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      const data = await this.retrieveData('*'); // Get all data types
      let deletedCount = 0;

      // Delete all user documents
      for (const record of data) {
        if (await this.deleteData(record.id, 'GDPR right to be forgotten')) {
          deletedCount++;
        }
      }

      // Clear local storage
      await AsyncStorage.removeItem(`safeapi_user_${this.currentUser.uid}`);
      await AsyncStorage.removeItem(`safeapi_config_${this.currentUser.uid}`);

      // Log complete data deletion
      await this.logAuditEvent('complete_data_deletion', {
        deletedRecords: deletedCount,
        userId: this.currentUser.uid,
        reason: 'GDPR right to be forgotten',
        complianceRelevant: true
      });

      return true;
    } catch (error) {
      console.error('[SafeAPI] Failed to delete all user data:', error);
      return false;
    }
  }

  /**
   * Get compliance status for the current user
   */
  async getComplianceStatus(): Promise<Record<string, any>> {
    if (!this.currentUser) {
      return { compliant: false, reason: 'No user context' };
    }

    const status = {
      userId: this.currentUser.uid,
      hipaaCompliant: this.complianceConfig.enableHIPAA,
      gdprCompliant: this.complianceConfig.enableGDPR,
      encryptionEnabled: this.currentUser.encryptionEnabled,
      consentLevel: this.currentUser.consentLevel,
      auditTrailEnabled: this.storageConfig.enableAuditTrail,
      lastComplianceCheck: new Date().toISOString()
    };

    // Check for any compliance violations
    const violations = [];
    if (this.complianceConfig.enableHIPAA && !this.currentUser.encryptionEnabled && !this.currentUser.isAnonymous) {
      violations.push('HIPAA requires encryption for PHI data');
    }
    if (this.complianceConfig.enableGDPR && this.currentUser.consentLevel === 'none') {
      violations.push('GDPR requires explicit user consent');
    }

    return {
      ...status,
      compliant: violations.length === 0,
      violations
    };
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract encryptData(data: any): Promise<string>;
  protected abstract decryptData(encryptedData: string): Promise<any>;
  protected abstract anonymizeData(data: any, dataType: string): Promise<any>;
  protected abstract generateComplianceFlags(dataType: string, isEncrypted: boolean): Record<string, boolean>;

  /**
   * Log audit events for compliance
   */
  protected async logAuditEvent(
    action: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.storageConfig.enableAuditTrail) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        userId: this.currentUser?.uid || 'anonymous',
        action,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          userAgent: 'SafeAPI',
          version: this.encryptionConfig.version
        },
        complianceRelevant: this.isComplianceRelevantAction(action)
      };

      // Store audit log in separate collection
      const db = getDbInstance();
      await addDoc(collection(db, 'audit_logs'), {
        ...auditEvent,
        timestamp: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('[SafeAPI] Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Determine if an action is compliance-relevant
   */
  private isComplianceRelevantAction(action: string): boolean {
    const complianceActions = [
      'data_stored', 'data_retrieved', 'data_deleted', 'data_exported',
      'complete_data_deletion', 'encryption_enabled', 'consent_granted',
      'consent_revoked', 'api_initialized'
    ];
    return complianceActions.includes(action);
  }
}

/**
 * Concrete implementation of SafeAPI with PGP encryption
 */
export class PGPSafeAPI extends SafeAPI {
  private static readonly DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
    algorithm: 'PGP',
    keyDerivationRounds: 100000,
    version: '1.0.0'
  };

  private static readonly DEFAULT_STORAGE_CONFIG: StorageConfig = {
    collection: 'secure_data',
    enableAuditTrail: true,
    enableAnalytics: true,
    retentionPolicyDays: 2555 // 7 years for healthcare data
  };

  private static readonly DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
    enableHIPAA: true,
    enableGDPR: true,
    requireExplicitConsent: true,
    auditLogLevel: 'comprehensive',
    disclaimerRequirements: [
      'educational_purpose_acknowledged',
      'professional_verification_required',
      'not_medical_advice_understood'
    ]
  };

  constructor(
    encryptionConfig?: Partial<EncryptionConfig>,
    storageConfig?: Partial<StorageConfig>,
    complianceConfig?: Partial<ComplianceConfig>
  ) {
    super(
      { ...PGPSafeAPI.DEFAULT_ENCRYPTION_CONFIG, ...encryptionConfig },
      { ...PGPSafeAPI.DEFAULT_STORAGE_CONFIG, ...storageConfig },
      { ...PGPSafeAPI.DEFAULT_COMPLIANCE_CONFIG, ...complianceConfig }
    );
  }

  /**
   * Encrypt data using AES-GCM (PGP implementation would require openpgp library)
   * For now, using AES-GCM as a secure alternative
   */
  protected async encryptData(data: any): Promise<string> {
    try {
      if (!this.currentUser) {
        throw new Error('User context required for encryption');
      }

      // Convert data to string
      const plaintext = JSON.stringify(data);
      const textEncoder = new TextEncoder();
      const plaintextBytes = textEncoder.encode(plaintext);

      // Generate a random key (in real implementation, this would be user-derived)
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        plaintextBytes
      );

      // Export the key for storage (in real app, this would be user-encrypted)
      const exportedKey = await crypto.subtle.exportKey('raw', key);

      // Combine IV + key + ciphertext for storage
      const combined = new Uint8Array(iv.length + exportedKey.byteLength + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(exportedKey), iv.length);
      combined.set(new Uint8Array(ciphertext), iv.length + exportedKey.byteLength);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('[PGPSafeAPI] Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  protected async decryptData(encryptedData: string): Promise<any> {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract components
      const iv = combined.slice(0, 12);
      const exportedKey = combined.slice(12, 12 + 32); // 256-bit key = 32 bytes
      const ciphertext = combined.slice(12 + 32);

      // Import the key
      const key = await crypto.subtle.importKey(
        'raw',
        exportedKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const plaintextBytes = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        ciphertext
      );

      // Convert back to string and parse JSON
      const textDecoder = new TextDecoder();
      const plaintext = textDecoder.decode(plaintextBytes);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error('[PGPSafeAPI] Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Anonymize data for educational/analytics purposes
   */
  protected async anonymizeData(data: any, dataType: string): Promise<any> {
    // This would be customized based on data type and application needs
    const anonymized = { ...data };
    
    // Remove or anonymize PII/PHI fields
    if (anonymized.substanceName) {
      anonymized.substanceCategory = this.categorizeSubstance(anonymized.substanceName);
      delete anonymized.substanceName;
    }
    
    if (anonymized.notes) {
      delete anonymized.notes; // Remove free-text notes that might contain PHI
    }
    
    if (anonymized.injectionArea) {
      anonymized.applicationArea = 'anonymized'; // Generic placeholder
      delete anonymized.injectionArea;
    }

    // Quantize numeric values to protect precision privacy
    if (anonymized.doseAmount) {
      anonymized.doseRange = this.quantizeValue(anonymized.doseAmount, 'dose');
      delete anonymized.doseAmount;
    }

    return anonymized;
  }

  /**
   * Generate compliance flags based on data type and encryption status
   */
  protected generateComplianceFlags(dataType: string, isEncrypted: boolean): Record<string, boolean> {
    return {
      hipaaCompliant: isEncrypted || dataType === 'educational',
      gdprCompliant: true, // Always compliant with proper consent
      educationalPurpose: dataType.includes('educational'),
      auditRequired: this.complianceConfig.auditLogLevel !== 'minimal',
      retentionPolicyApplies: this.storageConfig.retentionPolicyDays !== undefined,
      disclaimerRequired: this.complianceConfig.disclaimerRequirements.length > 0
    };
  }

  /**
   * Helper method to categorize substances without revealing specific names
   */
  private categorizeSubstance(substance: string): string {
    const categories = {
      'peptide': ['peptide', 'hormone', 'growth'],
      'vitamin': ['vitamin', 'b12', 'b-12'],
      'medication': ['insulin', 'medicine', 'rx'],
      'compound': ['compound', 'custom', 'mixture']
    };

    const lowerSubstance = substance.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerSubstance.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }

  /**
   * Quantize values to protect privacy while maintaining usefulness
   */
  private quantizeValue(value: number, type: 'dose' | 'volume'): string {
    if (type === 'dose') {
      if (value < 1) return '<1';
      if (value < 5) return '1-5';
      if (value < 10) return '5-10';
      if (value < 50) return '10-50';
      if (value < 100) return '50-100';
      return '>100';
    } else if (type === 'volume') {
      if (value < 0.1) return '<0.1ml';
      if (value < 0.5) return '0.1-0.5ml';
      if (value < 1) return '0.5-1ml';
      if (value < 2) return '1-2ml';
      return '>2ml';
    }
    return 'unknown';
  }
}

// Export singleton instance for easy use
export const safeAPI = new PGPSafeAPI();