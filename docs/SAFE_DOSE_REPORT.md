# SafeDose CV/ML Pipeline & Safety Report

## Executive Summary

SafeDose is a CV/ML-powered dose calculation assistant that processes syringe and vial images to extract medication data and provide dosing guidance. This report documents the system architecture, safety guardrails, data handling practices, and monetization boundaries that ensure the product operates as a calculation tool rather than practicing medicine.

## 1. System Architecture & Data Flow

### On-Device vs Server Processing

**On-Device Operations:**
- Camera capture and image pre-processing (`lib/cameraUtils.ts:52-350`)
- Local data validation and unit conversion (`lib/doseUtils.ts:89-287`) 
- Form state management (`lib/hooks/useDoseCalculator.ts:1-1006`)
- Local storage of dose logs (`lib/hooks/useDoseLogging.ts:81-226`)

**Server-Side Operations:**
- OpenAI Vision API calls for OCR/CV processing (`lib/cameraUtils.ts:274-291`)
- Firebase authentication and user management (`contexts/AuthContext.tsx`)
- Stripe payment processing (`api/create-checkout-session.js`, `api/stripe-webhook.js`)
- Usage analytics and telemetry (`lib/analytics.ts:1-50`)

### System Flow Sequence Diagram

```
User -> Camera -> Image Processing -> OCR/CV -> Validation -> Calculation -> Display

1. User captures image (ScanScreen.tsx:133-146)
2. Image encoded to base64 (cameraUtils.ts:216-264)
3. Sent to OpenAI Vision API (cameraUtils.ts:274-291)
4. JSON response parsed and validated (cameraUtils.ts:324-335)
5. Data flows to dose calculator (useDoseCalculator.ts:641-819)
6. Units validated and converted (doseUtils.ts:36-65)
7. Safety checks applied (doseUtils.ts:89-287)
8. Results displayed with disclaimers (PreDoseConfirmationStep.tsx:84-128)
```

### File Paths and Queues

**Key Processing Files:**
- Image capture: `lib/cameraUtils.ts:52-350`
- Dose calculations: `lib/doseUtils.ts:89-287`  
- State management: `lib/hooks/useDoseCalculator.ts:1-1006`
- UI screens: `components/ScanScreen.tsx`, `components/ManualEntryScreen.tsx`
- Analytics: `lib/analytics.ts:6-50`

**No persistent queues** - all processing is synchronous with 45-second timeouts (`cameraUtils.ts:295`).

## 2. CV Pipeline Parsing Fidelity

### OCR/Vision Processing

**Image Analysis Chain:**
1. Camera capture with 0.5 quality compression (`cameraUtils.ts:218`)
2. Base64 encoding with MIME type detection (`cameraUtils.ts:238-257`)
3. OpenAI GPT-4V vision model processing (`cameraUtils.ts:275`)
4. Structured JSON extraction with validation (`cameraUtils.ts:324-335`)

**Syringe Recognition:**
- Type detection: "Insulin" | "Standard" | "unreadable" | null
- Volume parsing: graduated markings (e.g., "1 ml", "0.5 ml")
- Marking extraction: increment values for guidance

**Vial OCR Capabilities:**
- Substance name identification
- Total amount parsing (e.g., "20 mg", "1000 units")
- Concentration extraction (e.g., "100 units/ml", "10 mg/ml") 
- Expiration date reading (YYYY-MM-DD format)

**Error Handling:**
- "unreadable" flag for illegible but present text
- `null` values for completely absent information
- API timeout protection (45 seconds) (`cameraUtils.ts:295`)
- Automatic retry logic with exponential backoff (`lib/hooks/useUsageTracking.ts:54-63`)

### Unit Conversion Accuracy

**Supported Unit Pairs:**
- mg ↔ mcg conversions with 1000x factor (`doseUtils.ts:76-87`)
- Direct unit matching (mg/ml, mcg/ml, units/ml)
- Volume-based dosing (mL as dose unit)

**Validation Logic:**
```typescript
// lib/doseUtils.ts:36-65
export function validateUnitCompatibility(
  doseUnit: 'mg' | 'mcg' | 'units' | 'mL',
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'
): { isValid: boolean; errorMessage?: string }
```

## 3. Safety Guardrails & Validation

### Input Validation Checkpoints

**Volume Safety Thresholds** (`doseUtils.test.ts:23-100`):
- Minimum volume: 0.005 mL (prevents micro-dosing errors)
- Maximum volume: 2.0 mL (prevents over-dosing)
- Threshold violations return `VOLUME_THRESHOLD_ERROR`

**Unit Compatibility Validation** (`doseUtils.ts:36-65`):
- Cross-validation between dose units and concentration units
- Prevents incompatible calculations (e.g., units dose with mg/ml concentration)
- Returns specific error messages for user guidance

**Syringe Capacity Checks**:
- Validates calculated volume against selected syringe capacity
- Prevents overfilling recommendations
- Error message: "Required volume (X ml) exceeds syringe capacity (Y ml)"

### Overdose Prevention Mechanisms

**Multi-Layer Validation:**
1. **Calculation validation** - Invalid inputs rejected before processing (`useDoseCalculator.ts:300-320`)
2. **Volume thresholds** - Extreme doses flagged automatically (`doseUtils.test.ts:23-43`)
3. **User confirmation** - Pre-dose confirmation screen with warnings (`PreDoseConfirmationStep.tsx:84-128`)
4. **Visual warnings** - Volume >1mL triggers warning icon and message

**User Confirmation Requirements:**
- Mandatory review of all calculated parameters
- Explicit safety reminder: "Always double-check calculations with a healthcare professional before administration"
- Warning indicators for volumes exceeding 1mL

### Ambiguous Reading Handling

**OCR Confidence Management:**
- "unreadable" classification for unclear text
- Manual entry fallback option always available
- No automated substitution of unclear readings
- Users can retake photos for better clarity

## 4. Privacy & PII Protection

### Image Retention Policy

**No Local Storage:** Images are not persisted on device or server after processing
- Base64 conversion happens in memory (`cameraUtils.ts:216-264`)
- Images sent directly to OpenAI API without intermediate storage
- Temporary DOM elements cleaned up immediately (`cameraUtils.ts:98-100`)

**Third-Party Processing:** 
- OpenAI Vision API processes images according to their data policies
- No image data returned in API responses, only extracted text/data
- 45-second processing timeout ensures no hanging requests

### Data Redaction & Anonymization

**User Identification:**
- Anonymous users supported with limited functionality (3 scans)
- User IDs stored as Firebase UIDs (pseudonymized)
- No PII collected beyond email for authentication

**Telemetry Data Minimization:**
- Analytics track user actions, not personal data (`analytics.ts:6-50`)
- Dose logs store calculation parameters, not patient information
- No image data in analytics or logs

## 5. Failure Modes & Error Handling

### Potential Misread Scenarios

**Vision API Failures:**
- Network timeouts: 45-second limit with graceful fallback
- Invalid JSON responses: Parser validation prevents crashes  
- API quota exceeded: Usage limits prevent service interruption

**User-Visible Error States:**
1. **"OpenAI configuration error"** - Missing API key
2. **"API error: Network issue"** - Connectivity problems
3. **"Could not parse analysis result"** - Malformed API response
4. **"Camera permission required"** - Access denied

### Mitigation Strategies

**Graceful Degradation:**
- Manual entry mode always available as fallback
- Local calculation validation independent of CV pipeline
- Cached data for offline dose history review

**Error Recovery:**
- Automatic retry logic with exponential backoff (`useUsageTracking.ts:54-63`)
- State reset functions prevent stuck UI states (`useDoseCalculator.ts:820-850`)
- Processing timeout safeguards (20 seconds) (`ScanScreen.tsx:109-126`)

### Test Case Coverage

**Volume Threshold Tests** (`doseUtils.test.ts`):
- Below minimum: 0.001 mL → `VOLUME_THRESHOLD_ERROR`
- Above maximum: 3 mL → `VOLUME_THRESHOLD_ERROR`  
- Boundary values: 0.005 mL and 2.0 mL pass validation
- Syringe overflow: 1.5 mL dose with 1 mL syringe → capacity error

### Guardrail Test Vectors

| Test Case | Input Parameters | Expected Result | File Reference |
|-----------|------------------|-----------------|----------------|
| **Volume Safety Thresholds** | | | |
| Micro-dose safety | dose: 0.1mg, conc: 100mg/ml | VOLUME_THRESHOLD_ERROR (0.001 mL) | `doseUtils.test.ts:23-32` |
| Over-dose safety | dose: 30mg, conc: 10mg/ml | VOLUME_THRESHOLD_ERROR (3 mL) | `doseUtils.test.ts:34-43` |
| Lower boundary | dose: 0.5mg, conc: 100mg/ml | Valid (0.005 mL) | `doseUtils.test.ts:45-55` |
| Upper boundary | dose: 20mg, conc: 10mg/ml | Valid (2.0 mL) | `doseUtils.test.ts:57-66` |
| **Unit Validation** | | | |
| Compatible units | dose: mg, conc: mg/ml | Valid calculation | `doseUtils.ts:46-52` |
| Unit conversion | dose: mcg, conc: mg/ml | Valid with 1000x conversion | `doseUtils.ts:55-60` |
| Incompatible units | dose: units, conc: mg/ml | Unit compatibility error | `doseUtils.ts:63-65` |
| **Syringe Capacity** | | | |
| Capacity overflow | dose: 1.5mg, conc: 1mg/ml, syringe: 1ml | Syringe capacity error | `doseUtils.test.ts:80-89` |
| Direct mL dosing | dose: 3mL (direct volume) | VOLUME_THRESHOLD_ERROR | `doseUtils.test.ts:92-100` |
| **Input Validation** | | | |
| Invalid dose value | dose: null/≤0 | "Invalid dose value" error | `useDoseCalculator.ts:300-306` |
| Invalid syringe | syringe: null/invalid | "Invalid syringe selection" error | `useDoseCalculator.ts:308-314` |
| Missing concentration | concentration: null, mode: concentration | "Invalid concentration" error | `useDoseCalculator.ts:318-324` |

## 6. Compliance & Logging

### Analytics & Telemetry Limits

**Event Categories** (`analytics.ts:6-50`):
- User authentication flows
- Feature usage metrics  
- Error occurrence tracking
- Subscription/upgrade events
- No personal health information logged

**Data Retention:**
- Local dose logs: User-controlled deletion
- Analytics: Standard Firebase retention policies
- No long-term image storage

### Consent & Regional Restrictions

**User Consent:**
- Camera permissions explicitly requested
- Optional analytics participation
- Clear data usage disclaimers

**Geographic Compliance:**
- No region-specific restrictions implemented
- Firebase handles data residency requirements
- GDPR-compatible data practices (no PII collection)

### Audit Trail Capabilities

**Dose Calculation Logging:**
- Complete parameter set stored for each calculation
- Timestamp and user ID association
- Original input values preserved for "Use Last Dose" feature
- Local storage with optional cloud backup

## 7. Product Packaging & Boundaries

### SDK/Plugin Architecture

**Current Boundaries:**
- Self-contained React Native/Expo application
- Firebase backend integration
- OpenAI API dependency for CV functionality

**Proposed SDK Separation:**

**Open Source Core:**
- Dose calculation engine (`doseUtils.ts`)
- Unit validation logic
- Basic UI components
- Manual entry modes

**Professional Add-ons:**
- CV/OCR processing capability
- Advanced analytics dashboard
- Multi-user organization features
- Audit trail export functionality

### OSS vs Pro Feature Split

| Feature Category | Open Source | Professional |
|------------------|-------------|--------------|
| Manual dose calculation | ✅ Full access | ✅ Enhanced UI |
| Camera OCR scanning | ❌ Not included | ✅ Full feature |
| Usage analytics | ❌ Basic only | ✅ Advanced dashboard |
| Dose history | ✅ Local only | ✅ Cloud sync + export |
| User management | ✅ Single user | ✅ Organization accounts |
| API integrations | ❌ Limited | ✅ EMR/EHR connectors |

## 8. Revenue Model & Non-Medical SKUs

### Product SKU Structure

**1. Dose Read Assist SDK** ($49/month)
- CV-powered OCR for syringe/vial reading
- 500 scans per month
- API access for integration
- No medical advice or recommendations
- Constraint: "For calculation assistance only"

**2. Audit Trail Add-on** ($19/month)  
- Advanced logging and export features
- Compliance reporting dashboard
- Usage analytics and insights
- Organization-level user management
- Constraint: "Documentation tool only, not medical records"

**3. Enterprise Integration Package** ($199/month)
- High-volume API access (5000 scans)
- Custom branding options
- EMR/EHR integration connectors
- Dedicated support channel
- Constraint: "Calculation tool integration only"

### Non-Medical Positioning

**Explicit Constraints:**
- All products labeled as "calculation assistance tools"
- No medical advice, diagnosis, or treatment claims
- Required professional review disclaimers
- Educational and reference use positioning
- Clear liability limitations in terms of service

**Revenue Boundary Enforcement:**
- Usage limits prevent medical-grade dependency
- Calculation-only functionality (no prescribing)
- Professional review requirements maintained
- No patient data collection or management

## Conclusion

SafeDose operates as a bounded calculation assistance tool with robust safety guardrails, privacy protections, and clear non-medical positioning. The CV pipeline provides OCR assistance while maintaining manual entry alternatives. Safety mechanisms prevent dangerous calculations, and the revenue model focuses on productivity tools rather than medical decision support.

The system's architecture ensures that it remains a calculation aid requiring professional medical oversight, not a replacement for medical judgment or training.