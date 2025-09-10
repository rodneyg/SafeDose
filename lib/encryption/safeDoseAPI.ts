/**
 * SafeDose API
 * Main API interface that combines encryption, Firebase, and compliance features
 * Designed to avoid medical device classification while ensuring user safety
 */

import { 
  SafeDoseEncryption, 
  SafeDoseCalculation, 
  EducationalCalculation, 
  PersonalCalculation 
} from './safeDoseEncryption';
import { SafeDoseFirebaseService } from './safeDoseFirebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DoseCalculationParams {
  substanceName: string;
  doseAmount: number;
  doseUnit: string;
  concentrationAmount: number;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalVialVolume?: number;
  syringeType?: 'insulin' | 'standard';
}

export interface CalculationResult {
  calculatedVolume: number;
  syringeType: 'insulin' | 'standard';
  recommendedMarking?: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  disclaimerText: string;
  requiresVerification: boolean;
  educationalNotes?: string[];
}

export interface UserMode {
  isEducational: boolean;
  canSavePersonalData: boolean;
  encryptionEnabled: boolean;
  disclaimerLevel: 'strict' | 'moderate' | 'minimal';
}

export interface ComplianceStatus {
  hasAcknowledgedDisclaimers: boolean;
  educationalPurposeConfirmed: boolean;
  requiresReverification: boolean;
  lastActivityDate?: string;
}

export class SafeDoseAPI {
  private encryption: SafeDoseEncryption;
  private firebaseService: SafeDoseFirebaseService;
  private currentUser: { uid: string; isAnonymous: boolean } | null = null;
  private userMode: UserMode = {
    isEducational: true, // Default to educational mode
    canSavePersonalData: false,
    encryptionEnabled: false,
    disclaimerLevel: 'strict'
  };

  constructor() {
    this.encryption = new SafeDoseEncryption();
    this.firebaseService = new SafeDoseFirebaseService();
  }

  /**
   * Initialize API with user context
   */
  async initialize(user: { uid: string; isAnonymous: boolean } | null): Promise<void> {
    this.currentUser = user;
    
    if (user && !user.isAnonymous) {
      // Check if user has opted into personal mode
      const hasPersonalMode = await AsyncStorage.getItem(`personal_mode_${user.uid}`);
      if (hasPersonalMode === 'true') {
        this.userMode = {
          isEducational: false,
          canSavePersonalData: true,
          encryptionEnabled: true,
          disclaimerLevel: 'moderate'
        };
      }
    } else {
      // Anonymous users always use educational mode
      this.userMode = {
        isEducational: true,
        canSavePersonalData: false,
        encryptionEnabled: false,
        disclaimerLevel: 'strict'
      };
    }
  }

  /**
   * Educational dose calculation (no PHI, no medical claims)
   */
  async calculateDoseEducational(params: DoseCalculationParams): Promise<CalculationResult> {
    try {
      // Perform the mathematical calculation
      const calculatedVolume = params.doseAmount / params.concentrationAmount;
      
      // Determine syringe type based on volume
      const syringeType = calculatedVolume <= 1.0 ? 'insulin' : 'standard';
      
      // Generate educational warnings and notes
      const warnings: string[] = [];
      const educationalNotes: string[] = [];
      
      if (calculatedVolume < 0.05) {
        warnings.push('Very small volume - educational note: precise measurement requires appropriate syringe type');
        educationalNotes.push('Small volumes require insulin syringes for accurate measurement');
      }
      
      if (calculatedVolume > 3.0) {
        warnings.push('Large volume - educational note: may require multiple applications or different concentration');
        educationalNotes.push('Large volumes may not be practical for single applications');
      }
      
      // Educational confidence assessment
      let confidence: 'high' | 'medium' | 'low' = 'high';
      if (params.concentrationAmount <= 0 || params.doseAmount <= 0) {
        confidence = 'low';
        warnings.push('Invalid calculation parameters detected');
      } else if (calculatedVolume < 0.01 || calculatedVolume > 5.0) {
        confidence = 'medium';
        warnings.push('Result outside typical educational examples');
      }

      const result: CalculationResult = {
        calculatedVolume,
        syringeType,
        recommendedMarking: this.generateRecommendedMarking(calculatedVolume, syringeType),
        confidence,
        warnings,
        disclaimerText: this.getEducationalDisclaimer(),
        requiresVerification: true,
        educationalNotes
      };

      // Log educational calculation for analytics (anonymized)
      await this.logEducationalCalculation(params, result);

      return result;
    } catch (error) {
      console.error('[SafeDoseAPI] Educational calculation failed:', error);
      throw new Error('Educational calculation failed');
    }
  }

  /**
   * Save calculation result (educational or personal based on mode)
   */
  async saveCalculation(
    params: DoseCalculationParams,
    result: CalculationResult,
    injectionArea?: string,
    notes?: string
  ): Promise<string> {
    if (!this.currentUser) {
      throw new Error('User must be authenticated to save calculations');
    }

    try {
      let calculation: SafeDoseCalculation;

      if (this.userMode.isEducational) {
        // Save as educational calculation (no PHI)
        calculation = this.encryption.createEducationalCalculation(
          params.substanceName,
          params.doseAmount,
          params.doseUnit,
          result.calculatedVolume
        );
        calculation.disclaimerAcknowledged = true; // Must be set by UI before calling
      } else {
        // Save as personal calculation (encrypted PHI)
        calculation = this.encryption.createPersonalCalculation(
          params.substanceName,
          params.doseAmount,
          params.doseUnit,
          result.calculatedVolume,
          injectionArea,
          notes
        );
        calculation.disclaimerAcknowledged = true;
      }

      const calculationId = await this.firebaseService.saveCalculation(
        calculation,
        this.currentUser.uid
      );

      return calculationId;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to save calculation:', error);
      throw new Error('Failed to save calculation');
    }
  }

  /**
   * Get calculation history
   */
  async getCalculationHistory(limit: number = 20): Promise<SafeDoseCalculation[]> {
    if (!this.currentUser) {
      return []; // No history for anonymous users
    }

    try {
      const type = this.userMode.isEducational ? 'educational' : 'both';
      return await this.firebaseService.getCalculations(
        this.currentUser.uid,
        type,
        limit
      );
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to get calculation history:', error);
      return [];
    }
  }

  /**
   * Delete a calculation
   */
  async deleteCalculation(calculationId: string): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    return await this.firebaseService.deleteCalculation(calculationId, this.currentUser.uid);
  }

  /**
   * Switch between educational and personal modes
   */
  async switchMode(isEducational: boolean): Promise<void> {
    if (!this.currentUser || this.currentUser.isAnonymous) {
      throw new Error('Personal mode requires authenticated user');
    }

    if (!isEducational && !await this.validateComplianceForPersonalMode()) {
      throw new Error('Personal mode requires compliance verification');
    }

    this.userMode = {
      isEducational,
      canSavePersonalData: !isEducational,
      encryptionEnabled: !isEducational,
      disclaimerLevel: isEducational ? 'strict' : 'moderate'
    };

    // Store user's mode preference
    await AsyncStorage.setItem(
      `personal_mode_${this.currentUser.uid}`,
      isEducational ? 'false' : 'true'
    );
  }

  /**
   * Get current user mode
   */
  getUserMode(): UserMode {
    return { ...this.userMode };
  }

  /**
   * Validate compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    if (!this.currentUser) {
      return {
        hasAcknowledgedDisclaimers: false,
        educationalPurposeConfirmed: false,
        requiresReverification: true
      };
    }

    return await this.firebaseService.validateComplianceStatus(this.currentUser.uid);
  }

  /**
   * Export user data (for GDPR compliance)
   */
  async exportUserData(): Promise<any> {
    if (!this.currentUser) {
      throw new Error('No user data to export');
    }

    try {
      const calculations = await this.firebaseService.getCalculations(
        this.currentUser.uid,
        'both',
        1000
      );

      const analyticsData = await this.firebaseService.getAnalyticsData(
        this.currentUser.uid
      );

      return {
        userId: this.currentUser.uid,
        calculations,
        analyticsData: analyticsData,
        exportDate: new Date().toISOString(),
        dataTypes: ['calculations', 'analytics'],
        encryptionStatus: this.userMode.encryptionEnabled
      };
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to export user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data (for GDPR compliance)
   */
  async deleteAllUserData(): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      const calculations = await this.firebaseService.getCalculations(
        this.currentUser.uid,
        'both',
        1000
      );

      // Delete all calculations
      for (const calc of calculations) {
        await this.firebaseService.deleteCalculation(calc.id, this.currentUser.uid);
      }

      // Clear local storage
      await AsyncStorage.removeItem(`personal_mode_${this.currentUser.uid}`);
      await AsyncStorage.removeItem(`safedose_calculations_${this.currentUser.uid}`);

      // Log data deletion
      await this.firebaseService.logAuditEvent(
        this.currentUser.uid,
        'user_data_deleted',
        { deletedCalculations: calculations.length }
      );

      return true;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to delete user data:', error);
      return false;
    }
  }

  /**
   * Generate educational disclaimers
   */
  private getEducationalDisclaimer(): string {
    const baseDisclaimer = "This is an educational calculation demonstration only. All results must be independently verified by qualified professionals. SafeDose is not intended for direct use and should not replace professional judgment.";
    
    switch (this.userMode.disclaimerLevel) {
      case 'strict':
        return `${baseDisclaimer} **Educational Purpose Only**: This tool is designed to help understand calculation principles and should never be used for actual applications.`;
      case 'moderate':
        return `${baseDisclaimer} This educational tool should supplement, not replace, professional guidance.`;
      case 'minimal':
        return `${baseDisclaimer} Always verify calculations with qualified professionals.`;
      default:
        return baseDisclaimer;
    }
  }

  /**
   * Generate recommended syringe marking for educational purposes
   */
  private generateRecommendedMarking(volume: number, syringeType: 'insulin' | 'standard'): string {
    if (syringeType === 'insulin') {
      if (volume <= 0.1) return `${(volume * 100).toFixed(0)} units (educational example)`;
      return `${volume.toFixed(2)}ml (educational example)`;
    } else {
      if (volume < 1) return `${volume.toFixed(2)}ml (educational example)`;
      return `${volume.toFixed(1)}ml (educational example)`;
    }
  }

  /**
   * Log educational calculation for anonymized analytics
   */
  private async logEducationalCalculation(
    params: DoseCalculationParams,
    result: CalculationResult
  ): Promise<void> {
    try {
      const anonymizedData = {
        substanceCategory: this.categorizeSubstance(params.substanceName),
        doseRange: this.quantizeDose(params.doseAmount),
        volumeRange: this.quantizeVolume(result.calculatedVolume),
        syringeType: result.syringeType,
        confidence: result.confidence,
        warningCount: result.warnings.length,
        timestamp: new Date().toISOString()
      };

      if (this.currentUser) {
        await this.firebaseService.logAuditEvent(
          this.currentUser.uid,
          'educational_calculation',
          anonymizedData
        );
      }
    } catch (error) {
      // Analytics logging should not break the main flow
      console.error('[SafeDoseAPI] Failed to log educational calculation:', error);
    }
  }

  /**
   * Validate compliance for personal mode
   */
  private async validateComplianceForPersonalMode(): Promise<boolean> {
    // Check if user has acknowledged the enhanced disclaimers
    const complianceKey = `compliance_verified_${this.currentUser?.uid}`;
    const hasCompliance = await AsyncStorage.getItem(complianceKey);
    
    return hasCompliance === 'true';
  }

  /**
   * Helper methods for data categorization
   */
  private categorizeSubstance(substance: string): string {
    // Same logic as in SafeDoseEncryption
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

  private quantizeDose(dose: number): string {
    if (dose < 1) return '<1';
    if (dose < 5) return '1-5';
    if (dose < 10) return '5-10';
    if (dose < 50) return '10-50';
    if (dose < 100) return '50-100';
    return '>100';
  }

  private quantizeVolume(volume: number): string {
    if (volume < 0.1) return '<0.1ml';
    if (volume < 0.5) return '0.1-0.5ml';
    if (volume < 1) return '0.5-1ml';
    if (volume < 2) return '1-2ml';
    return '>2ml';
  }
}

export const safeDoseAPI = new SafeDoseAPI();