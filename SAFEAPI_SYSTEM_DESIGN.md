# SafeAPI System Design

**Version:** 2.0  
**Date:** January 2025  
**Status:** Design Planning Phase

---

## Overview

SafeAPI is a horizontal privacy-first API platform built on Firebase with PGP encryption. Think of it as the privacy layer that any developer can drop into their application when they need client-side encryption, compliance tooling, and audit trails.

The core philosophy: **Always make an API, good things happen when you do.** SafeAPI provides the privacy and compliance primitives that developers can compose into domain-specific solutions.

**What it does:**
- Client-side PGP encryption for any data type
- Compliance tooling (HIPAA/GDPR-eligible deployment possible)  
- Firebase integration with privacy layer
- Audit trails and consent management
- Anonymous and authenticated data operations

**What it doesn't do:**
- Domain-specific business logic
- UI components or user experience
- Industry-specific features
- Compliance guarantees (provides tools, not promises)

---

## Core Architecture

SafeAPI is designed as a composable set of privacy primitives that work with any Firebase project:

```
SafeAPI Core
├── Privacy Layer
│   ├── Client-side PGP encryption/decryption
│   ├── Key management and rotation
│   ├── Anonymous data operations
│   └── Encrypted field-level operations
├── Compliance Tools
│   ├── Audit trail generation
│   ├── Consent tracking
│   ├── Data classification helpers
│   └── Retention policy automation
├── Firebase Integration
│   ├── Encrypted Firestore operations
│   ├── Authentication wrappers
│   ├── Real-time sync with encryption
│   └── Cloud Functions integration
└── Developer Tools
    ├── Usage analytics (privacy-preserving)
    ├── Testing utilities
    ├── Performance monitoring
    └── Error reporting (PII-sanitized)
```

### API Reference

#### Core Privacy Operations

```typescript
// Basic encryption/decryption
const encrypted = await safeAPI.encrypt({ 
  name: "John", 
  email: "john@example.com" 
})
const decrypted = await safeAPI.decrypt(encrypted)

// Anonymous data (no encryption needed)
const anonId = await safeAPI.createAnonymous('calculations', {
  type: 'demo',
  result: '2 + 2 = 4',
  timestamp: Date.now()
})

// Encrypted personal data
const encryptedId = await safeAPI.createEncrypted('personal_notes', {
  content: "Private medical notes",
  tags: ["important", "review"]
})

// Query operations (works with encrypted data)
const results = await safeAPI.query('personal_notes', [
  where('userId', '==', currentUser.uid),
  orderBy('timestamp', 'desc'),
  limit(10)
])
```

#### Compliance Tools

```typescript
// Audit trails (automatic for all operations)
await safeAPI.logAction('data_created', 'personal_notes', recordId)
const auditTrail = await safeAPI.getAuditTrail({
  userId: currentUser.uid,
  startDate: lastMonth,
  actions: ['data_created', 'data_updated', 'data_deleted']
})

// Consent management
await safeAPI.recordConsent('data_processing', true, {
  method: 'explicit_click',
  timestamp: Date.now()
})

// Data classification
const classification = await safeAPI.classifyData({
  email: "john@example.com",
  notes: "Patient shows improvement"
})
// Returns: { containsPII: true, containsPHI: true, riskLevel: 'high' }
```

---

## Quickstart

**Step 1: Install**
```bash
npm install @safeapi/sdk
```

**Step 2: Initialize** 
```typescript
import { SafeAPI } from '@safeapi/sdk'

const api = new SafeAPI({
  apiKey: 'sk_test_...',
  firebaseConfig: yourFirebaseConfig // or use shared instance
})
```

**Step 3: First encrypted record**
```typescript
// Anonymous mode (no keys needed)
const recordId = await api.createAnonymous('demo_data', {
  message: "Hello world",
  public: true
})

// Authenticated mode (auto-generates keys)
await api.auth.signIn('google')
const encryptedId = await api.createEncrypted('private_data', {
  secret: "This will be encrypted",
  personal: true
})
```

That's it. You now have encrypted storage with audit trails.

---

## What Stands Out

### 1. **Encryption Without Complexity**
Most developers avoid encryption because it's complicated. SafeAPI makes it a one-liner:

```typescript
// Traditional approach: 50+ lines of PGP setup, key management, etc.
// SafeAPI approach: 
const encrypted = await safeAPI.encrypt(sensitiveData)
```

The encryption happens client-side, keys are managed automatically, and Firebase never sees unencrypted data.

### 2. **Compliance as Code** 
Instead of manual compliance processes, SafeAPI makes it programmable:

```typescript
// Audit trails happen automatically
await safeAPI.createEncrypted('user_profile', profileData)
// ^ This automatically logs: user_created, data_encrypted, consent_verified

// Generate compliance reports programmatically  
const hipaaReport = await safeAPI.generateAuditReport('HIPAA', lastQuarter)
```

### 3. **Firebase + Privacy**
Firebase is great for scaling, terrible for privacy. SafeAPI fixes that:

```typescript
// Firebase operations, but encrypted
const results = await safeAPI.query('encrypted_health_data', [
  where('patientId', '==', 'encrypted_id'),
  orderBy('timestamp', 'desc')
]) // Firebase scales to millions, data stays encrypted
```

### 4. **Anonymous + Authenticated Modes**
Many apps need both anonymous experimentation and authenticated storage:

```typescript
// Anonymous user exploring features
await safeAPI.createAnonymous('demo_calculations', demoData)

// Same user, now authenticated, wants to save personal data
await safeAPI.auth.signIn()
await safeAPI.createEncrypted('personal_calculations', personalData)
```

The API is identical, encryption happens seamlessly.

---

## Rate Limiting & Pricing

| Plan | API Calls/min | Storage | Features |
|------|---------------|---------|----------|
| **Playground** | 100 | 1GB | Basic encryption, audit logs |
| **Production** | 1,000 | 10GB | Full compliance tools, BAA available |
| **Scale** | 10,000 | 100GB | Advanced analytics, custom retention |
| **Enterprise** | Custom | Custom | On-premises, custom compliance |

**Pricing**: $0 → $99 → $299 → Custom  
**Overage**: $0.001/call, $0.10/GB

---

## Integration Patterns

### Pattern 1: Drop-in Privacy Layer
```typescript
// Existing Firebase app
const userData = { name, email, phone }
await setDoc(doc(db, 'users', uid), userData) // ❌ Unencrypted

// With SafeAPI
await safeAPI.createEncrypted('users', userData) // ✅ Encrypted + audited
```

### Pattern 2: Hybrid Anonymous/Personal
```typescript
class MyApp {
  // Anonymous features (no encryption needed)
  async createDemo() {
    return safeAPI.createAnonymous('demos', demoData)
  }
  
  // Personal features (automatic encryption)
  async savePersonal() {
    return safeAPI.createEncrypted('personal', personalData)
  }
}
```

### Pattern 3: Compliance Automation
```typescript
// Manual compliance
await logAuditEvent('user_login', userId, timestamp)
await checkConsentStatus(userId)
await classifyDataSensitivity(userData)

// SafeAPI compliance
await safeAPI.auth.signIn() // Audit, consent, classification automatic
```

---

SafeAPI gives you the privacy and compliance foundation. Build your domain logic on top.