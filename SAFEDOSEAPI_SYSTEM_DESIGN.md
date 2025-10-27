# SafeDoseAPI System Design

**Version:** 2.0  
**Date:** January 2025  
**Status:** Design Planning Phase

---

## Overview

SafeDoseAPI represents **the next thing possible now because AGI exists** - a specialized healthcare dosing API that demonstrates how domain expertise can be layered on top of generic privacy infrastructure.

Built on SafeAPI's privacy foundation, SafeDoseAPI speaks the healthcare developer's language while handling medical device classification avoidance, educational positioning, and dose calculation workflows.

This is not the only future, just the first verticalized proof that privacy-first APIs can enable specialized healthcare applications without compromising compliance or user experience.

**What SafeDoseAPI does:**
- Educational dose calculations with medical device classification avoidance
- Schedule management and adherence tracking
- Healthcare-specific audit trails and compliance reporting
- Anonymous educational mode + encrypted personal mode
- Professional verification workflows

**Built on SafeAPI for:**
- Client-side PGP encryption
- HIPAA/GDPR-eligible deployment tooling
- Firebase scaling with privacy
- Automatic audit trails and consent management

---

## Core Architecture

SafeDoseAPI demonstrates how vertical applications can leverage horizontal privacy infrastructure:

```
SafeDoseAPI (Healthcare Layer)
├── Educational Positioning
│   ├── Medical device classification avoidance
│   ├── Professional verification requirements
│   ├── Educational language enforcement
│   └── Learning outcome tracking
├── Dose Calculation Engine
│   ├── Educational calculation workflows
│   ├── Syringe marking visualization
│   ├── Validation and error checking
│   └── Calculation history with context
├── Healthcare Compliance
│   ├── PHI handling with SafeAPI encryption
│   ├── Healthcare-specific audit trails
│   ├── Dosing schedule compliance tracking
│   └── Medical professional integration points
└── SafeAPI Integration
    ├── Anonymous educational data operations
    ├── Encrypted personal health data
    ├── Automatic compliance tooling
    └── Privacy-first data operations
```

### API Reference

#### Educational Dose Operations

```typescript
// Anonymous educational calculations (no PHI, no encryption needed)
const educationalResult = await safeDoseAPI.calculateEducationalDose({
  substanceConcentration: '10mg/ml',
  targetDose: '5mg',
  syringeSize: '3ml',
  calculationType: 'concentration_to_volume'
})

// Returns: {
//   result: '0.5ml',
//   syringeMarkings: ['0.1ml', '0.2ml', '0.3ml', '0.4ml', '0.5ml'],
//   visualReference: 'base64_syringe_image',
//   disclaimer: 'Educational calculation only. Professional verification required.',
//   educationalNotes: 'This represents a 50% concentration...'
// }

// Anonymous learning progress
await safeDoseAPI.recordLearningOutcome('concentration_calculations', {
  attemptedCorrectly: true,
  timeSpent: 45, // seconds
  confidenceLevel: 'high'
})
```

#### Personal Healthcare Operations (Encrypted via SafeAPI)

```typescript
// Authenticated personal dose tracking (PHI, automatically encrypted)
const calculationId = await safeDoseAPI.savePersonalCalculation({
  medicationName: 'Insulin', // PHI - encrypted by SafeAPI
  prescribedDose: '10 units', // PHI - encrypted
  calculationMethod: 'units_to_volume',
  syringeUsed: '0.5ml insulin syringe',
  injectionSite: 'abdomen', // PHI - encrypted
  notes: 'Morning dose with breakfast', // PHI - encrypted
  calculatedBy: 'patient_with_verification',
  verifiedBy: 'pharmacist_jane_doe'
})

// Schedule management with adherence tracking
const scheduleId = await safeDoseAPI.createDoseSchedule({
  medicationName: 'Metformin', // PHI - encrypted
  dosage: '500mg twice daily',
  schedule: ['08:00', '20:00'],
  startDate: '2025-01-15',
  duration: '90 days',
  adherenceTrackingEnabled: true
})

// Adherence tracking (encrypted)
await safeDoseAPI.recordDoseAdherence(scheduleId, {
  scheduledTime: '2025-01-15T08:00:00Z',
  actualTime: '2025-01-15T08:15:00Z',
  taken: true,
  notes: 'Taken with breakfast as prescribed' // PHI - encrypted
})
```

#### Medical Device Classification Avoidance

```typescript
// Educational language enforcement (prevents medical device classification)
const languageCheck = await safeDoseAPI.validateLanguageCompliance(
  "This calculates the exact dose for your medication"
)
// Returns: {
//   compliant: false,
//   suggestedText: "This demonstrates educational dose calculation principles",
//   issues: ["implies medical decision-making", "suggests direct patient use"]
// }

// Professional verification requirement
const verificationRequired = await safeDoseAPI.checkVerificationRequirement({
  calculationType: 'insulin_dosing',
  userType: 'patient',
  calculationContext: 'personal_use'
})
// Returns: {
//   verificationRequired: true,
//   requiredVerifierType: 'licensed_healthcare_provider',
//   reason: 'Insulin dosing requires professional oversight for patient safety'
// }

// Educational disclaimer enforcement (automatic)
const calculation = await safeDoseAPI.performCalculation(params)
// Every result automatically includes educational disclaimers and verification requirements
```

#### Healthcare-Specific Audit Trails

```typescript
// Specialized healthcare audit events (built on SafeAPI's audit system)
await safeDoseAPI.logHealthcareEvent('dose_calculation_verified', {
  calculationId: 'calc_123',
  verifierLicense: 'pharmacist_license_456',
  verificationMethod: 'manual_review',
  complianceLevel: 'full_professional_oversight'
})

// Healthcare compliance reporting
const hipaaAuditReport = await safeDoseAPI.generateHealthcareAuditReport({
  timeframe: 'last_quarter',
  includeVerificationChain: true,
  includePHIAccessLog: true,
  format: 'regulatory_submission'
})
```

---

## Quickstart

**Step 1: SafeAPI Foundation**
```bash
npm install @safeapi/sdk @safedose/api
```

**Step 2: Initialize with Healthcare Configuration**
```typescript
import { SafeAPI } from '@safeapi/sdk'
import { SafeDoseAPI } from '@safedose/api'

// SafeAPI handles privacy/compliance
const safeAPI = new SafeAPI({
  apiKey: 'sk_prod_...',
  complianceLevel: 'healthcare'
})

// SafeDoseAPI handles healthcare logic
const safeDoseAPI = new SafeDoseAPI({
  safeAPI: safeAPI,
  medicalDeviceAvoidance: true,
  professionalVerificationRequired: true
})
```

**Step 3: First dose calculation**
```typescript
// Anonymous educational calculation (no encryption needed)
const eduResult = await safeDoseAPI.calculateEducationalDose({
  concentration: '250mg/5ml',
  targetDose: '100mg'
})
console.log(eduResult.result) // "2ml"
console.log(eduResult.disclaimer) // "Educational only. Professional verification required."

// Authenticated personal calculation (automatically encrypted)
await safeDoseAPI.auth.signIn('google')
const personalId = await safeDoseAPI.savePersonalCalculation({
  medication: 'Amoxicillin', // PHI - encrypted
  dose: eduResult.result,
  notes: 'Verified by Dr. Smith' // PHI - encrypted
})
```

That's it. You now have healthcare-specific dose calculations with educational positioning, professional verification, and automatic PHI encryption.

---

## What Stands Out

### 1. **Medical Device Classification Avoidance Built-In**
Most healthcare APIs either ignore medical device classification or over-engineer compliance. SafeDoseAPI automates the avoidance:

```typescript
// Traditional approach: Manual disclaimer management, compliance review
// SafeDoseAPI approach:
const result = await safeDoseAPI.performCalculation(params)
// ^ Automatically enforces educational language, requires professional verification,
//   logs educational intent, prevents direct medical use language
```

Every calculation automatically includes educational framing, professional verification requirements, and compliance logging designed to avoid medical device classification.

### 2. **Healthcare Developer Language**
Instead of generic data operations, SafeDoseAPI speaks healthcare:

```typescript
// Generic API (SafeAPI):
await safeAPI.createEncrypted('user_records', medicalData)

// Healthcare API (SafeDoseAPI):
await safeDoseAPI.savePersonalCalculation(doseCalculation)
await safeDoseAPI.createDoseSchedule(medicationSchedule)
await safeDoseAPI.recordDoseAdherence(scheduleId, adherenceData)
```

Healthcare developers think in medications, doses, schedules, and adherence. SafeDoseAPI provides those primitives while SafeAPI handles the encryption underneath.

### 3. **Anonymous + Personal Healthcare Workflows**
Healthcare apps need both anonymous exploration and encrypted personal data:

```typescript
// Anonymous educational exploration (no PHI, no encryption)
await safeDoseAPI.calculateEducationalDose(educationalParams)
await safeDoseAPI.recordLearningOutcome('insulin_basics', success)

// Personal healthcare tracking (PHI, automatic encryption via SafeAPI)
await safeDoseAPI.savePersonalCalculation(personalDose)
await safeDoseAPI.recordDoseAdherence(scheduleId, adherenceData)
```

The API is identical, but SafeAPI automatically handles encryption for personal data while leaving educational data unencrypted for better performance.

### 4. **AGI-Enabled Compliance Intelligence**
This represents what becomes possible when AI can understand regulatory context:

```typescript
// AI-powered language compliance checking
const check = await safeDoseAPI.validateLanguageCompliance(
  "Calculate your insulin dose"
)
// Returns: { compliant: false, reason: "implies direct medical use" }

// AI-powered professional verification requirements
const verification = await safeDoseAPI.checkVerificationRequirement(userCalculation)
// Returns specific verification requirements based on calculation risk profile
```

This level of automated compliance intelligence wasn't practical before AGI. Now it can be built into the API layer.

---

## Integration Patterns

### Pattern 1: Educational-First Onboarding
```typescript
class DoseEducationFlow {
  async startLearning() {
    // Anonymous educational calculations build confidence
    const examples = await safeDoseAPI.getEducationalExamples('insulin_basics')
    
    // User practices without PHI
    for (const example of examples) {
      const result = await safeDoseAPI.calculateEducationalDose(example.params)
      await safeDoseAPI.recordLearningOutcome(example.topic, userSuccess)
    }
    
    // When ready, offer personal mode
    if (userWantsPersonalMode) {
      await safeDoseAPI.auth.signIn()
      // Now all operations are encrypted via SafeAPI
    }
  }
}
```

### Pattern 2: Professional Verification Workflows
```typescript
class ProfessionalVerification {
  async verifyCalculation(calculationId: string, verifierCredentials: VerifierInfo) {
    // Verify professional credentials
    const credentialsValid = await safeDoseAPI.validateProfessionalCredentials(verifierCredentials)
    
    if (credentialsValid) {
      // Log verification for compliance
      await safeDoseAPI.logProfessionalVerification(calculationId, verifierCredentials)
      
      // Update calculation status
      await safeDoseAPI.markCalculationVerified(calculationId, verifierCredentials.licenseNumber)
      
      return { verified: true, verifier: verifierCredentials.name }
    }
  }
}
```

### Pattern 3: Adherence-Focused Personal Mode
```typescript
class AdherenceTracking {
  async setupPersonalDosing(userId: string) {
    // Create encrypted medication schedules
    const schedule = await safeDoseAPI.createDoseSchedule({
      medication: 'Metformin', // PHI - encrypted by SafeAPI
      dosage: '500mg twice daily',
      times: ['08:00', '20:00']
    })
    
    // Track adherence with encrypted notes
    await safeDoseAPI.recordDoseAdherence(schedule.id, {
      taken: true,
      actualTime: new Date(),
      notes: 'Taken with breakfast' // PHI - encrypted
    })
    
    // Generate adherence reports (encrypted)
    const report = await safeDoseAPI.getAdherenceStats(userId, 'last_30_days')
    return report // Automatically decrypted for authorized user
  }
}
```

---

## AGI Integration Examples

SafeDoseAPI demonstrates healthcare applications that become possible with AI assistance:

### Intelligent Dose Verification
```typescript
// AI analyzes calculation for potential errors
const verification = await safeDoseAPI.aiVerifyCalculation({
  calculation: userCalculation,
  patientContext: patientSafetyProfile, // if available
  medicationDatabase: currentMedications
})

// Returns: {
//   riskLevel: 'low' | 'medium' | 'high',
//   potentialIssues: ['dose_too_high', 'interaction_risk'],
//   suggestedVerification: 'pharmacist_review_required'
// }
```

### Educational Content Generation
```typescript
// AI generates personalized educational content
const education = await safeDoseAPI.generateEducationalContent({
  topic: 'insulin_timing',
  userLevel: 'beginner',
  calculationType: 'units_to_volume'
})

// Returns contextualized educational material that reinforces 
// non-medical device positioning while teaching dose calculation principles
```

### Compliance Language Optimization
```typescript
// AI optimizes language to avoid medical device classification
const optimized = await safeDoseAPI.optimizeLanguageForCompliance({
  originalText: "Calculate the correct dose for your medication",
  targetCompliance: 'medical_device_avoidance'
})

// Returns: "Learn dose calculation principles for educational purposes"
```

---

SafeDoseAPI shows what becomes possible when you combine horizontal privacy infrastructure (SafeAPI) with vertical healthcare expertise and AGI-enabled compliance intelligence. This is just the first proof - the pattern can extend to any specialized healthcare domain.