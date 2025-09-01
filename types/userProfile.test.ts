import { UserProfile, getUserWarningLevel, getDisclaimerText, WarningLevel } from '../types/userProfile';

describe('User Profile Warning System', () => {
  test('licensed professional gets minimal warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: true,
      isProfessionalAthlete: false,
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
      isProfessionalAthlete: false,
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
      isProfessionalAthlete: false,
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
      isProfessionalAthlete: false,
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
      isProfessionalAthlete: false,
      isPersonalUse: false,
      isCosmeticUse: true,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MINIMAL);
    expect(getDisclaimerText(profile)).toContain('Professional use');
  });

  test('professional athlete gets moderate warnings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: false,
      isCosmeticUse: false,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MODERATE);
    expect(getDisclaimerText(profile)).toContain('Professional athlete use');
    expect(getDisclaimerText(profile)).toContain('sports medicine team');
  });

  test('professional athlete overrides personal use settings', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: true,
      isCosmeticUse: true,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MODERATE);
    expect(getDisclaimerText(profile)).toContain('Professional athlete use');
  });

  test('licensed professional takes precedence over professional athlete', () => {
    const profile: UserProfile = {
      isLicensedProfessional: true,
      isProfessionalAthlete: true,
      isPersonalUse: false,
      isCosmeticUse: false,
      dateCreated: '2024-01-01T00:00:00.000Z',
    };
    
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MINIMAL);
    expect(getDisclaimerText(profile)).toContain('Professional use');
    expect(getDisclaimerText(profile)).not.toContain('sports medicine');
  });
});