# SafeDose Medical Device Classification Mitigation & API Documentation

This document outlines SafeDose's strategy to avoid medical device classification while maintaining user value and regulatory compliance.

## Medical Device Classification Avoidance Strategy

### Current Risk Assessment

**High-Risk Elements Identified:**
- ✅ **Fixed**: Precise medical calculations → Educational demonstrations
- ✅ **Fixed**: PHI data collection → Encrypted personal data (optional) + anonymous educational mode
- ✅ **Fixed**: Medical terminology → Educational language
- ✅ **Fixed**: Professional medical use → Educational tool with verification requirements

### Language & Positioning Changes

**Before (Risky):**
- "A visual, AI-assisted dose calculator for injectable medications"
- "Professional use: Verify calculations independently for patient safety"
- "Injection sites", "medical supervision", "dose logging"

**After (Educational Focus):**
- "An educational, AI-assisted dose calculation learning tool for injectable compounds"
- "Educational calculation tool only. All results must be independently verified by qualified professionals"
- "Application areas", "educational purposes", "calculation history"

### Technical Mitigation Features

1. **Educational-First Mode**: Default to anonymous, educational calculations
2. **Mandatory Disclaimers**: All calculations require educational disclaimer acknowledgment
3. **Generic Substance Names**: PHI protection through substance categorization
4. **Verification Requirements**: Explicit requirements for professional verification
5. **No Clinical Claims**: Removed all diagnostic, therapeutic, or medical advice language

## SafeDose API Architecture

### Core Components

```typescript
// Main API Interface
SafeDoseAPI
├── Educational Mode (Default)
│   ├── Anonymous calculations
│   ├── Generic substance names
│   ├── Local-only storage
│   └── Strict disclaimers
└── Personal Mode (Optional)
    ├── Encrypted PHI storage
    ├── Authenticated users only
    ├── Client-side encryption
    └── HIPAA compliance features
```

### API Usage Examples

#### 1. Educational Calculation (Default Mode)

```typescript
import { safeDoseAPI } from '@/lib/encryption';

// Initialize in educational mode (default)
await safeDoseAPI.initialize(null); // Anonymous user

// Perform educational calculation
const params = {
  substanceName: "Semaglutide", // Will be converted to "GLP-1 Peptide"
  doseAmount: 0.25,
  doseUnit: "mg",
  concentrationAmount: 2.0,
  concentrationUnit: "mg/ml",
  syringeType: "insulin"
};

const result = await safeDoseAPI.calculateDoseEducational(params);

console.log(result);
// Output:
// {
//   calculatedVolume: 0.125,
//   syringeType: "insulin",
//   recommendedMarking: "12.5 units (educational example)",
//   confidence: "high",
//   warnings: [],
//   disclaimerText: "This is an educational calculation demonstration only...",
//   requiresVerification: true,
//   educationalNotes: ["Small volumes require insulin syringes for accurate measurement"]
// }
```

#### 2. Personal Mode (Encrypted PHI)

```typescript
// Initialize with authenticated user
const user = { uid: "user123", isAnonymous: false };
await safeDoseAPI.initialize(user);

// Switch to personal mode (requires compliance verification)
await safeDoseAPI.switchMode(false);

// Save personal calculation (encrypted)
const calculationId = await safeDoseAPI.saveCalculation(
  params,
  result,
  "abdomen_R", // injection area
  "Morning dose" // notes
);

// Get calculation history
const history = await safeDoseAPI.getCalculationHistory(10);
```

#### 3. Compliance Management

```typescript
// Check compliance status
const compliance = await safeDoseAPI.getComplianceStatus();
console.log(compliance);
// {
//   hasAcknowledgedDisclaimers: true,
//   educationalPurposeConfirmed: true,
//   requiresReverification: false,
//   lastActivityDate: "2025-01-15T10:30:00Z"
// }

// Export user data (GDPR compliance)
const userData = await safeDoseAPI.exportUserData();

// Delete all user data
await safeDoseAPI.deleteAllUserData();
```

### Firebase Integration

The API integrates with Firebase using three collections:

1. **`educational_calculations`**: Anonymous/educational calculations (no encryption needed)
2. **`personal_calculations`**: Encrypted personal calculations (PHI protected)
3. **`audit_logs`**: Compliance and security audit trail

### Encryption Details

**Client-Side Encryption:**
- **Algorithm**: AES-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Key Source**: User-specific + biometric seed (when available)
- **IV**: Random 12-byte IV for each encryption

**What Gets Encrypted:**
- Actual substance names (only generic categories stored unencrypted)
- Dosage amounts and calculations
- Personal notes and injection areas
- User-specific metadata

**What Stays Unencrypted:**
- Generic substance categories (for filtering/analytics)
- Timestamps (for sorting)
- User IDs (for access control)
- Compliance flags

### Compliance Features

#### HIPAA Compliance
- ✅ Client-side encryption of PHI
- ✅ Audit logging for all data access
- ✅ User consent management
- ✅ Data minimization principles
- ✅ Breach notification capabilities

#### GDPR Compliance
- ✅ Right to access (data export)
- ✅ Right to erasure (data deletion)
- ✅ Data portability
- ✅ Consent management
- ✅ Privacy by design architecture

#### Educational Use Compliance
- ✅ Clear educational disclaimers
- ✅ Mandatory verification requirements
- ✅ No medical claims or advice
- ✅ Professional consultation requirements
- ✅ Risk mitigation through anonymization

## Implementation Timeline

### Phase 1: Core API (Weeks 1-2) ✅
- [x] SafeDoseEncryption class
- [x] SafeDoseFirebaseService
- [x] SafeDoseAPI main interface
- [x] Educational mode implementation
- [x] Updated disclaimers and language

### Phase 2: Integration (Weeks 3-4)
- [ ] Update existing components to use new API
- [ ] Implement mode switching UI
- [ ] Add compliance verification flows
- [ ] Update onboarding for educational focus

### Phase 3: Testing & Validation (Weeks 5-6)
- [ ] Comprehensive testing of encryption
- [ ] Medical device classification review
- [ ] Security audit and penetration testing
- [ ] User experience validation

### Phase 4: Deployment (Weeks 7-8)
- [ ] App store preparation
- [ ] Final compliance documentation
- [ ] Production deployment
- [ ] Monitoring and analytics setup

## Security Considerations

### Threat Model
1. **Data Breach**: Client-side encryption protects PHI even if Firebase is compromised
2. **Man-in-the-Middle**: HTTPS and authenticated encryption prevent tampering
3. **Device Compromise**: Keys derived from user-specific data, limited exposure
4. **Legal/Regulatory**: Educational positioning and disclaimers reduce liability

### Key Management
- Keys never stored on server
- User-specific key derivation
- Biometric integration where available
- Secure key recovery through backup phrases

### Audit Trail
- All data access logged
- Compliance monitoring
- Breach detection capabilities
- Regulatory reporting features

## Migration Strategy

### Existing Data
1. **Identify PHI**: Scan existing data for personal health information
2. **Encrypt in Place**: Apply encryption to existing personal data
3. **Anonymize Educational**: Convert appropriate data to educational format
4. **Verify Compliance**: Ensure all data meets new classification standards

### User Communication
1. **Educational Focus**: Communicate the educational positioning
2. **Enhanced Privacy**: Highlight encryption and privacy improvements
3. **Continued Functionality**: Assure users of maintained features
4. **Optional Personal Mode**: Explain benefits of authenticated personal mode

This architecture ensures SafeDose remains a valuable educational tool while significantly reducing medical device classification risk and maintaining regulatory compliance.