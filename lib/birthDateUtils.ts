/**
 * Utility functions for birth date handling and age calculations
 */

/**
 * Calculate age from birth date
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns Age in years
 */
export function calculateAge(birthDate: string): number {
  // Parse date components to avoid timezone issues
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // If birth month hasn't occurred this year, or it's the birth month but the day hasn't passed
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate if a birth date string is valid and results in a reasonable age
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns Object with validation result and error message if invalid
 */
export function validateBirthDate(birthDate: string): { isValid: boolean; error?: string } {
  try {
    // Parse date components to avoid timezone issues
    const [year, month, day] = birthDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    // Check if date is not in the future
    const today = new Date();
    if (date > today) {
      return { isValid: false, error: 'Birth date cannot be in the future' };
    }
    
    // Calculate age and check reasonable range (13-120)
    const age = calculateAge(birthDate);
    if (age < 13) {
      return { isValid: false, error: 'You must be at least 13 years old to use this app' };
    }
    if (age > 120) {
      return { isValid: false, error: 'Please enter a valid birth date' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid date format' };
  }
}

/**
 * Get the number of days in a month for a given year
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Number of days in the month
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate month options for picker
 */
export function getMonthOptions() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return months.map((month, index) => ({
    label: month,
    value: (index + 1).toString().padStart(2, '0')
  }));
}

/**
 * Generate day options for picker based on selected month and year
 * @param month - Selected month (01-12)
 * @param year - Selected year
 */
export function getDayOptions(month: string, year: string) {
  if (!month || !year) return [];
  
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  const daysInMonth = getDaysInMonth(monthNum, yearNum);
  
  return Array.from({ length: daysInMonth }, (_, i) => ({
    label: (i + 1).toString(),
    value: (i + 1).toString().padStart(2, '0')
  }));
}

/**
 * Generate year options for picker (reasonable range around current year)
 */
export function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 120; // Oldest reasonable age
  const endYear = currentYear - 13; // Youngest allowed age
  
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push({
      label: year.toString(),
      value: year.toString()
    });
  }
  
  return years;
}

/**
 * Format birth date for display
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatBirthDateForDisplay(birthDate: string): string {
  try {
    // Parse date components to avoid timezone issues
    const [year, month, day] = birthDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return birthDate;
  }
}