/**
 * SafeDose Encryption API
 * Provides client-side encryption for PHI data while maintaining educational focus
 * Designed to support HIPAA compliance while avoiding medical device classification
 */

export interface EncryptedData {
  payload: string;
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyId: string;
  timestamp: number;
  version: string;
}

export interface EducationalCalculation {
  id: string;
  genericSubstance: string; // Generic names to avoid PHI
  doseAmount: number;
  unit: string;
  calculatedVolume: number;
  timestamp: string;
  isEducational: true; // Always true for educational mode
  disclaimerAcknowledged: boolean;
}

export interface PersonalCalculation {
  id: string;
  genericSubstance: string;
  actualSubstanceName?: string; // Only stored encrypted
  doseAmount: number;
  unit: string;
  calculatedVolume: number;
  injectionArea?: string; // Renamed from "injectionSite" to be less medical
  notes?: string;
  timestamp: string;
  isEducational: false;
  disclaimerAcknowledged: boolean;
}

export type SafeDoseCalculation = EducationalCalculation | PersonalCalculation;

export class SafeDoseEncryption {
  private static readonly ENCRYPTION_VERSION = '1.0.0';
  private static readonly KEY_DERIVATION_ROUNDS = 100000;
  
  /**
   * Derives encryption key from user-specific data and biometrics
   * Uses PBKDF2 for key derivation to ensure consistent keys across sessions
   */
  private async deriveUserKey(userId: string, biometricSeed?: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(`safedose_${userId}_${biometricSeed || 'default'}`),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = encoder.encode(`safedose_salt_${userId}`);
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: SafeDoseEncryption.KEY_DERIVATION_ROUNDS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts data using AES-GCM for authenticated encryption
   */
  async encryptData(data: any, userId: string): Promise<EncryptedData> {
    try {
      const key = await this.deriveUserKey(userId);
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(JSON.stringify(data));
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        plaintext
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to hex string with padding
      const hexArray: string[] = [];
      for (let i = 0; i < combined.length; i++) {
        const hex = combined[i].toString(16);
        hexArray.push(hex.length === 1 ? '0' + hex : hex);
      }
      return {
        payload: hexArray.join(''),
        algorithm: 'AES-GCM',
        keyId: `user_${userId}`,
        timestamp: Date.now(),
        version: SafeDoseEncryption.ENCRYPTION_VERSION
      };
    } catch (error) {
      console.error('[SafeDoseEncryption] Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data using AES-GCM
   */
  async decryptData(encryptedData: EncryptedData, userId: string): Promise<any> {
    try {
      const key = await this.deriveUserKey(userId);
      
      // Convert hex string back to bytes
      const combined = new Uint8Array(
        encryptedData.payload.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('[SafeDoseEncryption] Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Anonymizes data for analytics while preserving utility
   */
  anonymizeForAnalytics(calculation: SafeDoseCalculation) {
    return {
      id: 'anon_' + Date.now(),
      substanceType: this.categorizeSubstance(calculation.genericSubstance),
      doseRange: this.quantizeDose(calculation.doseAmount),
      unit: calculation.unit,
      volumeRange: this.quantizeVolume(calculation.calculatedVolume),
      timestamp: calculation.timestamp,
      userType: calculation.isEducational ? 'educational' : 'personal'
    };
  }

  /**
   * Categorizes substances into broad categories for analytics
   */
  private categorizeSubstance(substance: string): string {
    const categories: { [key: string]: string[] } = {
      'peptide': ['peptide', 'hormone', 'growth'],
      'vitamin': ['vitamin', 'b12', 'b-12'],
      'medication': ['insulin', 'medicine', 'rx'],
      'compound': ['compound', 'custom', 'mixture']
    };

    const lowerSubstance = substance.toLowerCase();
    const categoryNames = Object.keys(categories);
    for (let i = 0; i < categoryNames.length; i++) {
      const category = categoryNames[i];
      const keywords = categories[category];
      for (let j = 0; j < keywords.length; j++) {
        if (lowerSubstance.indexOf(keywords[j]) !== -1) {
          return category;
        }
      }
    }
    return 'other';
  }

  /**
   * Quantizes doses into ranges for privacy protection
   */
  private quantizeDose(dose: number): string {
    if (dose < 1) return '<1';
    if (dose < 5) return '1-5';
    if (dose < 10) return '5-10';
    if (dose < 50) return '10-50';
    if (dose < 100) return '50-100';
    return '>100';
  }

  /**
   * Quantizes volumes into ranges for privacy protection
   */
  private quantizeVolume(volume: number): string {
    if (volume < 0.1) return '<0.1ml';
    if (volume < 0.5) return '0.1-0.5ml';
    if (volume < 1) return '0.5-1ml';
    if (volume < 2) return '1-2ml';
    return '>2ml';
  }

  /**
   * Creates educational-mode calculation (no PHI)
   */
  createEducationalCalculation(
    substance: string,
    dose: number,
    unit: string,
    volume: number
  ): EducationalCalculation {
    return {
      id: `edu_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      genericSubstance: this.makeGeneric(substance),
      doseAmount: dose,
      unit: unit,
      calculatedVolume: volume,
      timestamp: new Date().toISOString(),
      isEducational: true,
      disclaimerAcknowledged: false // Must be set to true by UI
    };
  }

  /**
   * Creates personal-mode calculation (encrypted PHI)
   */
  createPersonalCalculation(
    substance: string,
    dose: number,
    unit: string,
    volume: number,
    injectionArea?: string,
    notes?: string
  ): PersonalCalculation {
    return {
      id: `personal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      genericSubstance: this.makeGeneric(substance),
      actualSubstanceName: substance,
      doseAmount: dose,
      unit: unit,
      calculatedVolume: volume,
      injectionArea: injectionArea,
      notes: notes,
      timestamp: new Date().toISOString(),
      isEducational: false,
      disclaimerAcknowledged: false
    };
  }

  /**
   * Converts specific substance names to generic categories
   */
  private makeGeneric(substance: string): string {
    const genericMappings: { [key: string]: string } = {
      // Peptides
      'semaglutide': 'GLP-1 Peptide',
      'tirzepatide': 'Dual Hormone Peptide',
      'bpc-157': 'Healing Peptide',
      'tb-500': 'Recovery Peptide',
      'ipamorelin': 'Growth Hormone Peptide',
      'cjc-1295': 'Growth Hormone Peptide',
      
      // Vitamins
      'cyanocobalamin': 'Vitamin B12',
      'methylcobalamin': 'Vitamin B12',
      'vitamin d3': 'Vitamin D',
      'vitamin d': 'Vitamin D',
      
      // Common medications (generic names only)
      'insulin': 'Insulin',
      'testosterone': 'Hormone Therapy',
      'estrogen': 'Hormone Therapy',
    };

    const lowerSubstance = substance.toLowerCase();
    const mappingKeys = Object.keys(genericMappings);
    for (let i = 0; i < mappingKeys.length; i++) {
      const specific = mappingKeys[i];
      if (lowerSubstance.indexOf(specific) !== -1) {
        return genericMappings[specific];
      }
    }

    // Default to generic category
    return 'Injectable Compound';
  }

  /**
   * Validates that calculation includes proper disclaimers
   */
  validateEducationalUse(calculation: SafeDoseCalculation): boolean {
    return calculation.isEducational && calculation.disclaimerAcknowledged;
  }

  /**
   * Gets appropriate disclaimer text based on calculation type
   */
  getDisclaimerText(calculation: SafeDoseCalculation): string {
    const baseDisclaimer = "This is an educational calculation tool only. All results must be independently verified by qualified professionals. SafeDose is not intended for direct medical use and should not replace professional medical judgment.";
    
    if (calculation.isEducational) {
      return baseDisclaimer + " This calculation is for educational purposes and uses generic substance categories.";
    } else {
      return baseDisclaimer + " Personal calculations are encrypted and stored locally for your convenience only.";
    }
  }
}

export const safeDoseEncryption = new SafeDoseEncryption();