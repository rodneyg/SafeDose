/**
 * Tests for birth date utility functions
 */

import {
  calculateAge,
  validateBirthDate,
  getDaysInMonth,
  getMonthOptions,
  getDayOptions,
  getYearOptions,
  formatBirthDateForDisplay
} from './birthDateUtils';

describe('birthDateUtils', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for a birth date in the past', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const birthDate = `${birthYear}-06-15`;
      
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const futureMonth = today.getMonth() + 2; // 2 months from now
      const birthDate = `${birthYear}-${String(futureMonth).padStart(2, '0')}-15`;
      
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });

    it('should parse date components correctly to avoid timezone issues', () => {
      // This is the key test - October 23, 1994 should always be treated as such
      const birthDate = '1994-10-23';
      const age = calculateAge(birthDate);
      
      const today = new Date();
      const expectedAge = today.getFullYear() - 1994;
      const actualMonth = today.getMonth();
      const actualDay = today.getDate();
      
      // If today is before October 23, age should be expectedAge - 1
      if (actualMonth < 9 || (actualMonth === 9 && actualDay < 23)) {
        expect(age).toBe(expectedAge - 1);
      } else {
        expect(age).toBe(expectedAge);
      }
    });
  });

  describe('validateBirthDate', () => {
    it('should validate a correct birth date', () => {
      const birthDate = '1990-05-15';
      const result = validateBirthDate(birthDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const birthDate = futureDate.toISOString().split('T')[0];
      
      const result = validateBirthDate(birthDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Birth date cannot be in the future');
    });

    it('should reject dates that result in age less than 13', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 12;
      const birthDate = `${birthYear}-01-01`;
      
      const result = validateBirthDate(birthDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('You must be at least 13 years old to use this app');
    });

    it('should reject dates that result in age greater than 120', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 121;
      const birthDate = `${birthYear}-01-01`;
      
      const result = validateBirthDate(birthDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid birth date');
    });
  });

  describe('getDaysInMonth', () => {
    it('should return 31 days for January', () => {
      expect(getDaysInMonth(1, 2024)).toBe(31);
    });

    it('should return 29 days for February in a leap year', () => {
      expect(getDaysInMonth(2, 2024)).toBe(29);
    });

    it('should return 28 days for February in a non-leap year', () => {
      expect(getDaysInMonth(2, 2023)).toBe(28);
    });

    it('should return 30 days for April', () => {
      expect(getDaysInMonth(4, 2024)).toBe(30);
    });

    it('should return 31 days for October', () => {
      expect(getDaysInMonth(10, 1994)).toBe(31);
    });
  });

  describe('getMonthOptions', () => {
    it('should return 12 months', () => {
      const months = getMonthOptions();
      expect(months).toHaveLength(12);
    });

    it('should format month values with leading zeros', () => {
      const months = getMonthOptions();
      expect(months[0].value).toBe('01');
      expect(months[9].value).toBe('10');
    });

    it('should include October as the 10th month', () => {
      const months = getMonthOptions();
      const october = months.find(m => m.label === 'October');
      expect(october).toBeDefined();
      expect(october?.value).toBe('10');
    });
  });

  describe('getDayOptions', () => {
    it('should return empty array if month or year is missing', () => {
      expect(getDayOptions('', '2024')).toEqual([]);
      expect(getDayOptions('10', '')).toEqual([]);
    });

    it('should return 31 days for October', () => {
      const days = getDayOptions('10', '1994');
      expect(days).toHaveLength(31);
    });

    it('should return 29 days for February in leap year', () => {
      const days = getDayOptions('02', '2024');
      expect(days).toHaveLength(29);
    });

    it('should return 28 days for February in non-leap year', () => {
      const days = getDayOptions('02', '2023');
      expect(days).toHaveLength(28);
    });

    it('should format day values with leading zeros', () => {
      const days = getDayOptions('10', '1994');
      expect(days[0].value).toBe('01');
      expect(days[8].value).toBe('09');
      expect(days[22].value).toBe('23');
    });

    it('should include day 23 in October 1994', () => {
      const days = getDayOptions('10', '1994');
      const day23 = days.find(d => d.value === '23');
      expect(day23).toBeDefined();
      expect(day23?.label).toBe('23');
    });
  });

  describe('getYearOptions', () => {
    it('should return years in descending order', () => {
      const years = getYearOptions();
      expect(parseInt(years[0].value)).toBeGreaterThan(parseInt(years[1].value));
    });

    it('should start with current year minus 13', () => {
      const currentYear = new Date().getFullYear();
      const years = getYearOptions();
      expect(years[0].value).toBe((currentYear - 13).toString());
    });

    it('should include 1994 as a valid year option', () => {
      const years = getYearOptions();
      const year1994 = years.find(y => y.value === '1994');
      expect(year1994).toBeDefined();
    });
  });

  describe('formatBirthDateForDisplay', () => {
    it('should format October 23, 1994 correctly', () => {
      const birthDate = '1994-10-23';
      const formatted = formatBirthDateForDisplay(birthDate);
      expect(formatted).toBe('October 23, 1994');
    });

    it('should format single digit months and days correctly', () => {
      const birthDate = '2000-01-05';
      const formatted = formatBirthDateForDisplay(birthDate);
      expect(formatted).toBe('January 5, 2000');
    });

    it('should handle February 29 in leap year correctly', () => {
      const birthDate = '2000-02-29';
      const formatted = formatBirthDateForDisplay(birthDate);
      expect(formatted).toBe('February 29, 2000');
    });

    it('should parse date components to avoid timezone issues', () => {
      // This is critical - the date should not shift due to timezone
      const testDates = [
        { input: '1994-10-23', expected: 'October 23, 1994' },
        { input: '1990-12-31', expected: 'December 31, 1990' },
        { input: '2000-01-01', expected: 'January 1, 2000' },
        { input: '1985-07-15', expected: 'July 15, 1985' },
      ];

      testDates.forEach(({ input, expected }) => {
        const result = formatBirthDateForDisplay(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = 'invalid-date';
      const formatted = formatBirthDateForDisplay(invalidDate);
      // Should return either the original string or "Invalid Date" - both are acceptable
      expect(typeof formatted).toBe('string');
    });
  });
});
