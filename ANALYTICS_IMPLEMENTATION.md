# Analytics Implementation Guide

## Overview
This document outlines the comprehensive analytics system implemented for SafeDose to improve revenue and retention tracking.

## Key Features Implemented

### 1. Enhanced Analytics Events
- **Revenue Events**: subscription_started, subscription_renewed, revenue_generated, subscription_cancelled
- **User Engagement**: app_opened, session_started, session_ended, feature_used, screen_view
- **Retention Events**: user_retention_day_1, user_retention_day_7, user_retention_day_30
- **Conversion Funnel**: trial_started, trial_ended, trial_converted, free_to_paid_conversion

### 2. User Properties Tracking
- Plan type and subscription status
- Customer lifetime value
- Days since signup
- Total scans performed
- Last active date
- Retention cohort
- Churn risk score

### 3. Automatic Session Tracking
- App open/close events
- Session duration tracking
- Screen view tracking
- Background/foreground state changes

### 4. Revenue Analytics
- Real-time revenue tracking via Stripe webhooks
- Subscription lifecycle management
- Customer lifetime value calculation
- Cohort retention analysis
- Churn rate monitoring

### 5. Analytics Dashboard
- Revenue metrics display (monthly revenue, total revenue, ARPU, CLV)
- User metrics (total users, active users, trial users, churn rate)
- Conversion rate tracking
- Cohort retention visualization

## Files Added/Modified

### New Files
- `lib/analytics/revenueAnalytics.ts` - Revenue calculation and tracking utilities
- `lib/hooks/useSessionTracking.ts` - Automatic session tracking hook
- `components/analytics/AnalyticsDashboard.tsx` - Analytics dashboard component
- `app/analytics.tsx` - Analytics screen for admin users

### Modified Files
- `lib/analytics.ts` - Enhanced with new events and helper functions
- `api/stripe-webhook.js` - Enhanced webhook handling for subscription lifecycle
- `lib/hooks/useUsageTracking.ts` - Integrated with enhanced analytics
- `app/_layout.tsx` - Added session tracking
- `app/(tabs)/_layout.tsx` - Added screen view tracking
- `app/login.tsx` - Added conversion funnel tracking
- `app/success.tsx` - Enhanced subscription success tracking

## Usage

### Tracking Custom Events
```typescript
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

// Track a feature usage
logAnalyticsEvent(ANALYTICS_EVENTS.FEATURE_USED, {
  feature_name: 'manual_entry',
  context: 'dose_calculation'
});
```

### Tracking Revenue
```typescript
import { trackRevenue } from '../lib/analytics';

// Track revenue from a subscription
trackRevenue(29.99, 'USD', 'txn_12345', 'subscription');
```

### Updating User Properties
```typescript
import { updateUserAnalyticsProperties } from '../lib/analytics';

// Update user analytics properties
updateUserAnalyticsProperties({
  planType: 'plus',
  subscriptionStatus: 'active',
  totalScans: 150,
  lastActiveDate: new Date(),
});
```

### Accessing Analytics Dashboard
Navigate to `/analytics` - admin access required (currently limited to specific email addresses).

## Data Flow

1. **User Actions** → Firebase Analytics Events
2. **Stripe Webhooks** → Revenue Collection → Firestore
3. **Session Changes** → Automatic Event Tracking
4. **Screen Navigation** → Screen View Events
5. **Subscription Changes** → Conversion Funnel Updates

## Revenue Metrics Calculated

- **Monthly Revenue**: Sum of all revenue in the current month
- **Total Revenue**: Lifetime revenue across all users
- **ARPU**: Average Revenue Per User
- **Customer Lifetime Value**: Revenue per user / churn rate
- **Churn Rate**: Percentage of users who cancelled in the period
- **Conversion Rate**: Percentage of free users who convert to paid

## Retention Analysis

- Day 1, 7, and 30 retention tracking
- Cohort analysis by signup month
- User engagement scoring
- Churn risk identification

## Admin Dashboard Access

The analytics dashboard is restricted to admin users. Currently, admin access is granted to:
- admin@safedoseai.com
- rodneyg@gmail.com

## Future Enhancements

1. **Advanced Segmentation**: User behavior segmentation for targeted campaigns
2. **Predictive Analytics**: Machine learning for churn prediction
3. **A/B Testing Framework**: Built-in experimentation platform
4. **Custom Event Tracking**: Business-specific event definitions
5. **Real-time Alerts**: Automated alerts for critical metrics
6. **Export Capabilities**: CSV/Excel export for detailed analysis

## Environment Variables Required

For full functionality, ensure these environment variables are set:
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `STRIPE_PRICE_ID_PLUS` - Plus plan price ID
- `STRIPE_PRICE_ID_PRO` - Pro plan price ID

## Monitoring and Maintenance

- Monitor Firebase Analytics console for event volume
- Review Firestore usage for analytics collections
- Regularly validate webhook processing
- Monitor dashboard performance with large datasets