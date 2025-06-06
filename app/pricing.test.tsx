import React from 'react';
import { render } from '@testing-library/react-native';
import PricingPage from './pricing';

// Mock the dependencies
jest.mock('../lib/stripeConfig', () => ({
  publishableKey: 'pk_test_mock',
  priceId: 'price_mock_id',
}));

jest.mock('../contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      isLicensedProfessional: false,
      isPersonalUse: true,
      isCosmeticUse: false,
    },
  }),
}));

jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    VIEW_PRICING_PAGE: 'view_pricing_page',
    INITIATE_UPGRADE: 'initiate_upgrade',
    UPGRADE_FAILURE: 'upgrade_failure',
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({
    redirectToCheckout: jest.fn(),
  }),
}));

describe('PricingPage', () => {
  it('should render mobile-first pricing layout', () => {
    const { getByText } = render(<PricingPage />);
    
    // Check personalized title
    expect(getByText('Safe Home Medication')).toBeTruthy();
    
    // Check feature list in header
    expect(getByText('AI-powered accuracy')).toBeTruthy();
    expect(getByText('Instant results')).toBeTruthy();
    expect(getByText('Professional-grade')).toBeTruthy();
  });

  it('should display two plan options with strike-through pricing', () => {
    const { getByText } = render(<PricingPage />);
    
    // Check both plans exist
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();
    
    // Check strike-through pricing exists
    expect(getByText('$12.99')).toBeTruthy(); // Original weekly price
    expect(getByText('$239.99')).toBeTruthy(); // Original yearly price
    
    // Check save percentages
    expect(getByText('Save 38%')).toBeTruthy();
    expect(getByText('Save 37%')).toBeTruthy();
  });

  it('should show trial notice for trial plans', () => {
    const { getByText } = render(<PricingPage />);
    
    // Should show trial notice since weekly plan is selected by default
    expect(getByText('No payment now • 7-day free trial')).toBeTruthy();
  });

  it('should display CTA button with friendly copy', () => {
    const { getByText } = render(<PricingPage />);
    
    // Check friendly CTA copy with emoji
    expect(getByText('🙌 Continue')).toBeTruthy();
  });

  it('should show trust elements in footer', () => {
    const { getByText } = render(<PricingPage />);
    
    // Check trust elements
    expect(getByText('Cancel anytime • App Store secured')).toBeTruthy();
    
    // Check legal links
    expect(getByText('Privacy Policy')).toBeTruthy();
    expect(getByText('EULA')).toBeTruthy();
    expect(getByText('Restore')).toBeTruthy();
  });

  it('should show close button', () => {
    const { getByText } = render(<PricingPage />);
    
    expect(getByText('Close')).toBeTruthy();
  });

  it('should display plan features correctly', () => {
    const { getByText } = render(<PricingPage />);
    
    // Check weekly plan features
    expect(getByText('• 12 AI scans/week')).toBeTruthy();
    expect(getByText('• Unlimited manual calculations')).toBeTruthy();
    
    // Check yearly plan features  
    expect(getByText('• Unlimited AI scans')).toBeTruthy();
    expect(getByText('• Priority support')).toBeTruthy();
  });
});