# Sentry Error Monitoring Implementation

## Overview

This document describes the implementation of Sentry error monitoring and analytics across the SafeDose app. The integration provides real-time error monitoring, user interaction tracking, and debugging capabilities while maintaining strict privacy standards.

## Setup

### 1. SDK Installation
- `@sentry/react-native` - For React Native (iOS/Android) environments
- `@sentry/browser` - For web environments

### 2. Configuration
The Sentry DSN is configured via environment variables:
```bash
SENTRY_DSN=your_sentry_dsn_here
```

### 3. Initialization
Sentry is automatically initialized in `app/_layout.tsx` during app startup with:
- Platform-specific SDK selection (React Native for mobile, Browser for web)
- Data scrubbing for privacy protection
- Source map support for readable stack traces
- Environment-specific sampling rates (100% in dev, 10% in prod)

## Core Tracking Features

### Exception Tracking (`captureException`)

**Firebase Authentication Errors:**
- Sign-out failures
- Anonymous sign-in failures  
- Authentication state change errors
- Context includes error codes and user state

**Scan/Image Analysis Failures:**
- OpenAI API configuration errors
- Image processing failures
- Camera access errors
- Network failures during analysis
- Context includes platform, camera setup, and error details

**Network Failures:**
- Stripe checkout session creation failures
- API endpoint errors
- Network connectivity issues
- Context includes endpoint, request data, and error type

### Message Tracking (`captureMessage`)

**Manual Entry Completion:**
- Triggered when user completes manual dose calculation
- Includes dose details, medication info, and calculation results

**Scan Flow Completion:**
- Triggered when user completes full scan-to-result workflow
- Includes scan results, dose calculations, and user actions

**Upgrade Prompt Tracking:**
- Automatically triggered if user doesn't interact with upgrade modal after 30 seconds
- Includes user type (anonymous/authenticated) and modal context

### User Context (`setUser`)

**Login Events:**
- Sets user ID (UID from Firebase)
- Sets plan tier information
- **NO PII**: Email and other personal information are excluded

**Logout Events:**
- Clears user context from Sentry

### Breadcrumb Tracking (`addBreadcrumb`)

**Navigation Flow:**
- Screen transitions (Intro → Scan → Manual Entry)
- User action context (authenticated vs anonymous)

**Scan Process:**
- Scan attempt initiation
- Successful scan completion
- Platform and camera setup details

**User Interactions:**
- Upgrade process initiation
- Pricing page views
- Key user actions

## Privacy & Data Protection

### Data Scrubbing
The `beforeSend` function automatically scrubs sensitive data:

**User Data:**
- Only user ID is retained
- Email, name, and other PII are removed

**Breadcrumb Data:**
- Sensitive keys (`email`, `password`, `token`, `apiKey`, `uid`) are filtered out
- Only non-sensitive metadata is preserved

**Stack Traces:**
- Local file paths are shortened to filenames only
- Sensitive environment information is removed

**Error Context:**
- Exception details are sanitized
- Only relevant debugging information is preserved

## Integration Points

### Authentication (AuthContext)
- User context management
- Authentication error tracking
- Login/logout breadcrumbs

### Scan Processing (cameraUtils)
- Image analysis error tracking
- Scan attempt/completion breadcrumbs
- Platform-specific error handling

### Network Operations (pricing)
- Stripe API error tracking
- Checkout process monitoring
- Network failure detection

### Analytics Enhancement (analytics.ts)
- Extends Firebase Analytics with Sentry tracking
- Automatic event correlation
- Enhanced error context for key events

### User Interface (LimitModal)
- Upgrade prompt timeout tracking
- User interaction monitoring
- Modal behavior analysis

## Testing & Validation

### Manual Testing Checklist
1. **Error Monitoring**: Trigger authentication errors and verify Sentry capture
2. **Scan Failures**: Test image processing errors and network failures
3. **Privacy Validation**: Verify no PII appears in Sentry dashboard
4. **Source Maps**: Confirm readable stack traces in production
5. **User Context**: Test user login/logout context updates
6. **Breadcrumbs**: Verify navigation and interaction tracking

### Key Metrics to Monitor
1. **Error Rates**: Authentication, scan processing, network failures
2. **User Flows**: Scan completion rates, upgrade funnel performance
3. **Performance**: Error frequency and user impact
4. **Privacy Compliance**: Ensure no sensitive data leakage

## Environment Configuration

### Development
- Debug mode enabled
- 100% transaction sampling
- Verbose logging

### Production  
- Debug mode disabled
- 10% transaction sampling
- Error-only reporting

## Troubleshooting

### Common Issues
1. **Missing DSN**: Sentry will log warning but not crash app
2. **Platform Detection**: Automatic fallback between React Native and Browser SDKs
3. **Network Failures**: Graceful degradation when Sentry is unreachable
4. **Source Maps**: Automatic upload during build process

### Debugging
- Check browser/device console for Sentry initialization logs
- Verify environment variables are properly loaded
- Test with debug mode enabled in development

## Security Considerations

1. **No PII Collection**: Email, names, and personal data are excluded
2. **Minimal User Context**: Only user ID and plan tier are tracked
3. **Data Retention**: Configure appropriate retention policies in Sentry dashboard
4. **Access Control**: Limit Sentry dashboard access to development team only
5. **Compliance**: Ensure HIPAA/healthcare compliance for medical app context