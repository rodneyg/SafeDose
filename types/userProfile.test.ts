import { UserProfile, getUserWarningLevel, getDisclaimerText, WarningLevel } from '../types/userProfile';

describe('User Profile Warning System', () => {
  test('licensed professional gets minimal warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: true,
      isPersonalUse: false,
      isCosmeticUse: false,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MINIMAL);
    expect(getDisclaimerText(profile)).toContain('Professional use');
    expect(getDisclaimerText(profile)).toContain('Verify calculations independently');
  });

  test('personal prescribed use gets moderate warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isPersonalUse: true,
      isCosmeticUse: false,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MODERATE);
    expect(getDisclaimerText(profile)).toContain('Personal use');
    expect(getDisclaimerText(profile)).toContain('consult your healthcare provider');
  });

  test('cosmetic use gets strict warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isPersonalUse: true,
      isCosmeticUse: true,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.STRICT);
    expect(getDisclaimerText(profile)).toContain('**Critical**');
    expect(getDisclaimerText(profile)).toContain('educational purposes only');
  });

  test('non-professional non-personal use gets strict warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isPersonalUse: false,
      isCosmeticUse: false,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.STRICT);
    expect(getDisclaimerText(profile)).toContain('**Critical**');
  });

  test('professional status overrides other settings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: true,
      isPersonalUse: false,
      isCosmeticUse: true,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MINIMAL);
    expect(getDisclaimerText(profile)).toContain('Professional use');
  });
});