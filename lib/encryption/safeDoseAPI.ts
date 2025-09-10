/**
 * SafeDose API
 * Application-specific layer that uses the abstract SafeAPI for health/medical calculations
 * Designed to avoid medical device classification while ensuring user safety
 * Focuses on successful outcomes: accuracy, education, reminders, adherence, and schedules
 */

import { 
  SafeAPI, 
  PGPSafeAPI, 
  SecureData, 
  UserContext,
  EncryptionConfig,
  StorageConfig,
  ComplianceConfig
} from './safeAPI';
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
  successfulOutcomes: {
    accuracyAchieved: boolean;
    educationalValueProvided: boolean;
    safetyGuidelinesFollowed: boolean;
  };
}

export interface UserMode {
  isEducational: boolean;
  canSavePersonalData: boolean;
  encryptionEnabled: boolean;
  disclaimerLevel: 'strict' | 'moderate' | 'minimal';
  focusAreas: {
    dosageAccuracy: boolean;
    educationalResources: boolean;
    adherenceTracking: boolean;
    scheduleManagement: boolean;
  };
}

export interface ComplianceStatus {
  hasAcknowledgedDisclaimers: boolean;
  educationalPurposeConfirmed: boolean;
  requiresReverification: boolean;
  lastActivityDate?: string;
  legalStandardsMet: {
    dataProtection: boolean;
    informedConsent: boolean;
    disclaimerCompliance: boolean;
    auditTrailMaintained: boolean;
  };
}

// SafeDose-specific data structures that use SafeAPI
export interface SafeDoseCalculation extends SecureData {
  substanceName?: string; // Only for encrypted personal mode
  genericSubstance: string; // Always available for categorization
  doseAmount: number;
  unit: string;
  calculatedVolume: number;
  injectionArea?: string;
  notes?: string;
  disclaimerAcknowledged: boolean;
  successMetrics: {
    calculationAccuracy: 'verified' | 'unverified';
    educationalGoalMet: boolean;
    userConfidence: 'high' | 'medium' | 'low';
  };
}

export class SafeDoseAPI {
  private safeAPI: SafeAPI;
  private currentUser: { uid: string; isAnonymous: boolean } | null = null;
  private userMode: UserMode = {
    isEducational: true, // Default to educational mode
    canSavePersonalData: false,
    encryptionEnabled: false,
    disclaimerLevel: 'strict',
    focusAreas: {
      dosageAccuracy: true,
      educationalResources: true,
      adherenceTracking: false,
      scheduleManagement: false
    }
  };

  constructor(customConfig?: {
    encryption?: Partial<EncryptionConfig>,
    storage?: Partial<StorageConfig>,
    compliance?: Partial<ComplianceConfig>
  }) {
    // Configure SafeAPI for SafeDose-specific needs
    const encryptionConfig = {
      algorithm: 'PGP' as const,
      keyDerivationRounds: 100000,
      version: '1.0.0',
      ...customConfig?.encryption
    };

    const storageConfig = {
      collection: 'safedose_calculations',
      enableAuditTrail: true,
      enableAnalytics: true,
      retentionPolicyDays: 2555, // 7 years for medical calculation history
      ...customConfig?.storage
    };

    const complianceConfig = {
      enableHIPAA: true,
      enableGDPR: true,
      requireExplicitConsent: true,
      auditLogLevel: 'comprehensive' as const,
      disclaimerRequirements: [
        'educational_purpose_acknowledged',
        'professional_verification_required',
        'not_medical_device_understood',
        'calculation_accuracy_responsibility_accepted'
      ],
      ...customConfig?.compliance
    };

    this.safeAPI = new PGPSafeAPI(encryptionConfig, storageConfig, complianceConfig);
  }

  /**
   * Initialize API with user context - focuses on successful outcomes from the start
   */
  async initialize(user: { uid: string; isAnonymous: boolean } | null): Promise<void> {
    this.currentUser = user;
    
    // Create user context for SafeAPI
    const userContext: UserContext = {
      uid: user?.uid || 'anonymous',
      isAnonymous: user?.isAnonymous ?? true,
      consentLevel: 'none', // Will be upgraded during onboarding
      encryptionEnabled: false, // Default to educational mode
      complianceFlags: {}
    };

    // Initialize the underlying SafeAPI
    await this.safeAPI.initialize(userContext);
    
    if (user && !user.isAnonymous) {
      // Check if user has opted into personal mode and their focus areas
      const userPrefs = await AsyncStorage.getItem(`safedose_prefs_${user.uid}`);
      if (userPrefs) {
        const prefs = JSON.parse(userPrefs);
        this.userMode = {
          isEducational: prefs.isEducational ?? true,
          canSavePersonalData: !prefs.isEducational,
          encryptionEnabled: !prefs.isEducational,
          disclaimerLevel: prefs.isEducational ? 'strict' : 'moderate',
          focusAreas: prefs.focusAreas || {
            dosageAccuracy: true,
            educationalResources: true,
            adherenceTracking: prefs.adherenceTracking || false,
            scheduleManagement: prefs.scheduleManagement || false
          }
        };

        // Update SafeAPI user context if personal mode is enabled
        if (!prefs.isEducational) {
          userContext.encryptionEnabled = true;
          userContext.consentLevel = 'full';
          await this.safeAPI.initialize(userContext);
        }
      }
    } else {
      // Anonymous users always use educational mode with focus on learning
      this.userMode = {
        isEducational: true,
        canSavePersonalData: false,
        encryptionEnabled: false,
        disclaimerLevel: 'strict',
        focusAreas: {
          dosageAccuracy: true,
          educationalResources: true,
          adherenceTracking: false,
          scheduleManagement: false
        }
      };
    }
  }

  /**
   * Educational dose calculation focused on successful learning outcomes
   * Emphasizes accuracy, education, and safety without medical device classification
   */
  async calculateDoseEducational(params: DoseCalculationParams): Promise<CalculationResult> {
    try {
      // Perform the mathematical calculation
      const calculatedVolume = params.doseAmount / params.concentrationAmount;
      
      // Determine syringe type based on volume for accuracy
      const syringeType = calculatedVolume <= 1.0 ? 'insulin' : 'standard';
      
      // Generate warnings and educational notes focused on successful outcomes
      const warnings: string[] = [];
      const educationalNotes: string[] = [];
      
      // Success-oriented feedback
      let accuracyAchieved = true;
      let educationalValueProvided = true;
      let safetyGuidelinesFollowed = true;
      
      if (calculatedVolume < 0.05) {
        warnings.push('Small volume detected - educational note: insulin syringes provide optimal accuracy for precise measurements');
        educationalNotes.push('✓ Success tip: Small volumes require insulin syringes for accurate measurement');
        educationalNotes.push('✓ Learning outcome: Understanding syringe selection improves dosing accuracy');
      } else {
        educationalNotes.push('✓ Volume range is within standard measurement capabilities');
      }
      
      if (calculatedVolume > 3.0) {
        warnings.push('Large volume calculated - educational note: consider concentration adjustment or divided application');
        educationalNotes.push('✓ Success strategy: Large volumes may benefit from higher concentrations or multiple applications');
        educationalNotes.push('✓ Learning outcome: Volume optimization is key to practical application success');
      }
      
      // Add educational success principles
      educationalNotes.push('✓ Educational goal: Understanding calculation principles builds confidence');
      educationalNotes.push('✓ Success factor: Always verify calculations independently for optimal safety');
      educationalNotes.push('✓ Learning outcome: Consistent calculation practice improves accuracy over time');
      
      // Educational confidence assessment focused on learning success
      let confidence: 'high' | 'medium' | 'low' = 'high';
      if (params.concentrationAmount <= 0 || params.doseAmount <= 0) {
        confidence = 'low';
        accuracyAchieved = false;
        warnings.push('Invalid parameters detected - educational opportunity to review input validation');
        educationalNotes.push('✓ Learning opportunity: Parameter validation is crucial for calculation success');
      } else if (calculatedVolume < 0.01 || calculatedVolume > 5.0) {
        confidence = 'medium';
        warnings.push('Result outside typical ranges - educational opportunity to explore edge cases');
        educationalNotes.push('✓ Success insight: Understanding edge cases improves overall calculation competency');
      } else {
        educationalNotes.push('✓ Calculation success: Result falls within typical expected ranges');
      }

      const result: CalculationResult = {
        calculatedVolume,
        syringeType,
        recommendedMarking: this.generateRecommendedMarking(calculatedVolume, syringeType),
        confidence,
        warnings,
        disclaimerText: this.getEducationalDisclaimer(),
        requiresVerification: true,
        educationalNotes,
        successfulOutcomes: {
          accuracyAchieved,
          educationalValueProvided,
          safetyGuidelinesFollowed
        }
      };

      // Log educational calculation for analytics (anonymized, focused on success metrics)
      await this.logEducationalCalculation(params, result);

      return result;
    } catch (error) {
      console.error('[SafeDoseAPI] Educational calculation failed:', error);
      
      // Even in failure, provide educational value
      return {
        calculatedVolume: 0,
        syringeType: 'standard',
        confidence: 'low',
        warnings: ['Calculation error occurred - educational opportunity to review input parameters'],
        disclaimerText: this.getEducationalDisclaimer(),
        requiresVerification: true,
        educationalNotes: [
          '✓ Learning opportunity: Calculation errors help identify input validation needs',
          '✓ Success principle: Error handling is part of safe calculation practices'
        ],
        successfulOutcomes: {
          accuracyAchieved: false,
          educationalValueProvided: true, // Error provides educational value
          safetyGuidelinesFollowed: true
        }
      };
    }
  }

  /**
   * Save calculation result using SafeAPI (educational or personal based on mode)
   * Focuses on building successful calculation habits and adherence tracking
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
      // Create SafeDose-specific calculation data
      const calculationData: Partial<SafeDoseCalculation> = {
        genericSubstance: this.categorizeSubstance(params.substanceName),
        doseAmount: params.doseAmount,
        unit: params.doseUnit,
        calculatedVolume: result.calculatedVolume,
        disclaimerAcknowledged: true, // Must be set by UI before calling
        successMetrics: {
          calculationAccuracy: result.confidence === 'high' ? 'verified' : 'unverified',
          educationalGoalMet: result.successfulOutcomes.educationalValueProvided,
          userConfidence: result.confidence
        },
        metadata: {
          syringeType: result.syringeType,
          warningCount: result.warnings.length,
          focusAreas: this.userMode.focusAreas,
          educationalNotes: result.educationalNotes
        }
      };

      // Add personal data only if in personal mode (will be encrypted by SafeAPI)
      if (!this.userMode.isEducational) {
        calculationData.substanceName = params.substanceName;
        calculationData.injectionArea = injectionArea;
        calculationData.notes = notes;
      }

      // Determine data type for SafeAPI storage
      const dataType = this.userMode.isEducational ? 'educational_calculation' : 'personal_calculation';
      
      // Use SafeAPI to store the calculation
      const calculationId = await this.safeAPI.storeData(
        calculationData,
        dataType,
        !this.userMode.isEducational, // Force encryption for personal mode
        {
          userMode: this.userMode.isEducational ? 'educational' : 'personal',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      );

      // Track successful save for adherence and habit building
      if (this.userMode.focusAreas.adherenceTracking) {
        await this.trackAdherenceEvent('calculation_saved', {
          calculationId,
          successMetrics: calculationData.successMetrics
        });
      }

      return calculationId;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to save calculation:', error);
      throw new Error('Failed to save calculation - this affects your calculation history and adherence tracking');
    }
  }

  /**
   * Get calculation history using SafeAPI with focus on successful outcomes tracking
   */
  async getCalculationHistory(limit: number = 20): Promise<SafeDoseCalculation[]> {
    if (!this.currentUser) {
      return []; // No history for anonymous users
    }

    try {
      // Retrieve both educational and personal calculations
      const educationalData = await this.safeAPI.retrieveData('educational_calculation', limit);
      const personalData = this.userMode.isEducational ? [] : 
        await this.safeAPI.retrieveData('personal_calculation', limit);

      // Combine and convert to SafeDoseCalculation format
      const allData = [...educationalData, ...personalData];
      const calculations: SafeDoseCalculation[] = [];

      for (const data of allData) {
        const calc: SafeDoseCalculation = {
          ...data,
          ...(data.plainData || {}),
          // Ensure SafeDoseCalculation structure
          genericSubstance: data.plainData?.genericSubstance || 'unknown',
          doseAmount: data.plainData?.doseAmount || 0,
          unit: data.plainData?.unit || '',
          calculatedVolume: data.plainData?.calculatedVolume || 0,
          disclaimerAcknowledged: data.plainData?.disclaimerAcknowledged || false,
          successMetrics: data.plainData?.successMetrics || {
            calculationAccuracy: 'unverified',
            educationalGoalMet: false,
            userConfidence: 'low'
          }
        };

        calculations.push(calc);
        if (calculations.length >= limit) break;
      }

      // Sort by timestamp (most recent first)
      calculations.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return calculations;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to get calculation history:', error);
      return [];
    }
  }

  /**
   * Delete a calculation using SafeAPI
   */
  async deleteCalculation(calculationId: string): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    return await this.safeAPI.deleteData(calculationId, 'user_requested_deletion');
  }

  /**
   * Switch between educational and personal modes with focus area configuration
   * Designed to guide users toward successful outcomes
   */
  async switchMode(
    isEducational: boolean, 
    focusAreas?: Partial<UserMode['focusAreas']>
  ): Promise<void> {
    if (!this.currentUser || this.currentUser.isAnonymous) {
      throw new Error('Personal mode requires authenticated user');
    }

    if (!isEducational && !await this.validateComplianceForPersonalMode()) {
      throw new Error('Personal mode requires compliance verification and legal standards acceptance');
    }

    // Update focus areas based on user preferences
    const updatedFocusAreas = {
      ...this.userMode.focusAreas,
      ...focusAreas
    };

    this.userMode = {
      isEducational,
      canSavePersonalData: !isEducational,
      encryptionEnabled: !isEducational,
      disclaimerLevel: isEducational ? 'strict' : 'moderate',
      focusAreas: updatedFocusAreas
    };

    // Store user's preferences including focus areas
    const userPrefs = {
      isEducational,
      focusAreas: updatedFocusAreas,
      adherenceTracking: updatedFocusAreas.adherenceTracking,
      scheduleManagement: updatedFocusAreas.scheduleManagement,
      lastUpdated: new Date().toISOString()
    };

    await AsyncStorage.setItem(
      `safedose_prefs_${this.currentUser.uid}`,
      JSON.stringify(userPrefs)
    );

    // Update SafeAPI user context if switching to personal mode
    if (!isEducational) {
      const userContext: UserContext = {
        uid: this.currentUser.uid,
        isAnonymous: false,
        consentLevel: 'full',
        encryptionEnabled: true,
        complianceFlags: {
          hipaaAcknowledged: true,
          gdprConsented: true,
          educationalPurposeUnderstood: true
        }
      };
      await this.safeAPI.initialize(userContext);
    }
  }

  /**
   * Get current user mode
   */
  getUserMode(): UserMode {
    return { ...this.userMode };
  }

  /**
   * Get compliance status including legal standards (as a lawyer would review)
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    if (!this.currentUser) {
      return {
        hasAcknowledgedDisclaimers: false,
        educationalPurposeConfirmed: false,
        requiresReverification: true,
        legalStandardsMet: {
          dataProtection: false,
          informedConsent: false,
          disclaimerCompliance: false,
          auditTrailMaintained: false
        }
      };
    }

    // Get compliance status from SafeAPI
    const safeAPICompliance = await this.safeAPI.getComplianceStatus();
    
    // Check SafeDose-specific compliance requirements
    const safeDoseCompliance = await this.validateSafeDoseCompliance();

    return {
      hasAcknowledgedDisclaimers: safeDoseCompliance.disclaimersAcknowledged,
      educationalPurposeConfirmed: safeDoseCompliance.educationalPurposeConfirmed,
      requiresReverification: this.shouldRequireReverification(),
      lastActivityDate: safeDoseCompliance.lastActivityDate,
      legalStandardsMet: {
        dataProtection: safeAPICompliance.hipaaCompliant && safeAPICompliance.gdprCompliant,
        informedConsent: safeAPICompliance.consentLevel !== 'none',
        disclaimerCompliance: safeDoseCompliance.disclaimersAcknowledged,
        auditTrailMaintained: safeAPICompliance.auditTrailEnabled
      }
    };
  }

  /**
   * Export user data using SafeAPI (for GDPR compliance)
   */
  async exportUserData(): Promise<any> {
    if (!this.currentUser) {
      throw new Error('No user data to export');
    }

    try {
      // Use SafeAPI's export functionality
      const exportData = await this.safeAPI.exportUserData();
      
      // Add SafeDose-specific metadata
      return {
        ...exportData,
        safeDoseVersion: '1.0.0',
        userMode: this.userMode,
        focusAreas: this.userMode.focusAreas,
        exportType: 'safedose_complete_export',
        complianceNote: 'Export includes all SafeDose calculation data and user preferences'
      };
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to export user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data using SafeAPI (for GDPR compliance)
   */
  async deleteAllUserData(): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      // Use SafeAPI's deletion functionality
      const success = await this.safeAPI.deleteAllUserData();
      
      if (success) {
        // Clear SafeDose-specific local storage
        await AsyncStorage.removeItem(`safedose_prefs_${this.currentUser.uid}`);
        await AsyncStorage.removeItem(`safedose_compliance_${this.currentUser.uid}`);
        await AsyncStorage.removeItem(`safedose_onboarding_${this.currentUser.uid}`);
      }

      return success;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to delete user data:', error);
      return false;
    }
  }

  /**
   * Track adherence events for users focused on habit building
   */
  private async trackAdherenceEvent(eventType: string, metadata: any): Promise<void> {
    if (!this.currentUser || !this.userMode.focusAreas.adherenceTracking) {
      return;
    }

    try {
      await this.safeAPI.storeData(
        {
          eventType,
          ...metadata,
          timestamp: new Date().toISOString()
        },
        'adherence_event',
        false, // Adherence data can be anonymous for analytics
        { userFocusAreas: this.userMode.focusAreas }
      );
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to track adherence event:', error);
      // Don't throw - adherence tracking shouldn't break main functionality
    }
  }

  /**
   * Validate SafeDose-specific compliance requirements
   */
  private async validateSafeDoseCompliance(): Promise<{
    disclaimersAcknowledged: boolean;
    educationalPurposeConfirmed: boolean;
    lastActivityDate?: string;
  }> {
    if (!this.currentUser) {
      return {
        disclaimersAcknowledged: false,
        educationalPurposeConfirmed: false
      };
    }

    try {
      const complianceKey = `safedose_compliance_${this.currentUser.uid}`;
      const complianceData = await AsyncStorage.getItem(complianceKey);
      
      if (complianceData) {
        const compliance = JSON.parse(complianceData);
        return {
          disclaimersAcknowledged: compliance.disclaimersAcknowledged || false,
          educationalPurposeConfirmed: compliance.educationalPurposeConfirmed || false,
          lastActivityDate: compliance.lastActivityDate
        };
      }
      
      return {
        disclaimersAcknowledged: false,
        educationalPurposeConfirmed: false
      };
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to validate SafeDose compliance:', error);
      return {
        disclaimersAcknowledged: false,
        educationalPurposeConfirmed: false
      };
    }
  }

  /**
   * Check if compliance reverification is required
   */
  private shouldRequireReverification(): boolean {
    if (!this.currentUser || this.currentUser.isAnonymous) {
      return false; // Anonymous users don't need reverification
    }

    // For now, require reverification every 30 days for personal mode users
    if (!this.userMode.isEducational) {
      // Logic would check last verification date
      return true; // Simplified for now
    }

    return false;
  }
  /**
   * Generate educational disclaimers designed to avoid medical device classification
   * Emphasizes educational purpose and legal compliance
   */
  private getEducationalDisclaimer(): string {
    const baseDisclaimer = "SafeDose is an educational calculation tool designed to help users understand dosing principles and calculation methods. This application is not a medical device and is not intended for direct use in any application. All calculations must be independently verified by qualified professionals before any use.";
    
    const legalCompliance = "Legal Notice: By using SafeDose, you acknowledge that this tool is for educational purposes only and should not replace professional judgment or consultation.";
    
    switch (this.userMode.disclaimerLevel) {
      case 'strict':
        return `${baseDisclaimer} ${legalCompliance} **Educational Learning Tool Only**: SafeDose is designed to demonstrate calculation principles and build understanding. This tool should never be used for actual applications. Success in education comes from understanding principles, not from direct application. Always consult qualified professionals for any actual use case.`;
        
      case 'moderate':
        return `${baseDisclaimer} ${legalCompliance} **Educational Support Tool**: This tool is designed to supplement professional education and should not replace qualified guidance. Success in dosing accuracy comes from proper education and professional oversight.`;
        
      case 'minimal':
        return `${baseDisclaimer} ${legalCompliance} Always verify all calculations with qualified professionals. Success depends on professional verification and proper education.`;
        
      default:
        return `${baseDisclaimer} ${legalCompliance}`;
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
   * Log educational calculation for anonymized analytics using SafeAPI
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
        successfulOutcomes: result.successfulOutcomes,
        focusAreas: this.userMode.focusAreas,
        timestamp: new Date().toISOString()
      };

      // Use SafeAPI to store anonymous analytics data
      if (this.currentUser) {
        await this.safeAPI.storeData(
          anonymizedData,
          'educational_analytics',
          false, // Don't encrypt analytics data
          {
            analyticsType: 'educational_calculation',
            userMode: 'educational',
            version: '1.0.0'
          }
        );
      }
    } catch (error) {
      // Analytics logging should not break the main flow
      console.error('[SafeDoseAPI] Failed to log educational calculation:', error);
    }
  }

  /**
   * Validate compliance for personal mode with legal standards
   */
  private async validateComplianceForPersonalMode(): Promise<boolean> {
    if (!this.currentUser) {
      return false;
    }

    try {
      // Check if user has acknowledged enhanced disclaimers and legal requirements
      const complianceKey = `safedose_compliance_${this.currentUser.uid}`;
      const complianceData = await AsyncStorage.getItem(complianceKey);
      
      if (complianceData) {
        const compliance = JSON.parse(complianceData);
        return (
          compliance.disclaimersAcknowledged &&
          compliance.educationalPurposeConfirmed &&
          compliance.legalStandardsAccepted &&
          compliance.hipaaUnderstanding &&
          compliance.notMedicalDeviceUnderstood
        );
      }
      
      return false;
    } catch (error) {
      console.error('[SafeDoseAPI] Failed to validate personal mode compliance:', error);
      return false;
    }
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