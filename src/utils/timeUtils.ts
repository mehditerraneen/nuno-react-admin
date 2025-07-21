/**
 * Time formatting utilities for consistent API communication
 * Ensures all times are sent as "HH:MM" format to the backend
 */

// Regex for validating time format HH:MM
export const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const STRICT_TIME_FORMAT_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Formats a time string to ensure HH:MM format with leading zeros
 * @param timeString - Input time string (e.g., "7:30", "07:30", "15:45")
 * @returns Formatted time string in HH:MM format (e.g., "07:30", "15:45")
 */
export function formatTimeString(timeString: string | null | undefined): string {
  if (!timeString) {
    return '';
  }

  // Remove any whitespace
  const cleanTime = timeString.trim();
  
  // If already in correct format, return as is
  if (STRICT_TIME_FORMAT_REGEX.test(cleanTime)) {
    return cleanTime;
  }

  // Try to parse and reformat
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    
    // Validate ranges
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // Try to handle other formats
  const partialMatch = cleanTime.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (partialMatch) {
    const hours = parseInt(partialMatch[1], 10);
    const minutes = partialMatch[2] ? parseInt(partialMatch[2], 10) : 0;
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // If we can't parse it, return the original string
  // This will likely cause a validation error, which is what we want
  return cleanTime;
}

/**
 * Validates if a time string is in the correct HH:MM format
 * @param timeString - Time string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimeFormat(timeString: string | null | undefined): boolean {
  if (!timeString) {
    return false;
  }
  return STRICT_TIME_FORMAT_REGEX.test(timeString.trim());
}

/**
 * Parses a time string and returns hours and minutes as numbers
 * @param timeString - Time string in HH:MM format
 * @returns Object with hours and minutes, or null if invalid
 */
export function parseTimeString(timeString: string): { hours: number; minutes: number } | null {
  const match = timeString.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }
  return null;
}

/**
 * Creates a time string from hours and minutes
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Formatted time string in HH:MM format
 */
export function createTimeString(hours: number, minutes: number): string {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time values');
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Converts a Date object to HH:MM format
 * @param date - Date object
 * @returns Time string in HH:MM format
 */
export function dateToTimeString(date: Date): string {
  return createTimeString(date.getHours(), date.getMinutes());
}

/**
 * Creates a Date object from a time string (uses today's date)
 * @param timeString - Time string in HH:MM format
 * @returns Date object or null if invalid
 */
export function timeStringToDate(timeString: string): Date | null {
  const parsed = parseTimeString(timeString);
  if (parsed) {
    const date = new Date();
    date.setHours(parsed.hours, parsed.minutes, 0, 0);
    return date;
  }
  return null;
}

/**
 * Validates that start time is before end time
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns true if start time is before end time
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  
  if (!start || !end) {
    return false;
  }
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  return startMinutes < endMinutes;
}

/**
 * Get user-friendly time format examples for validation messages
 */
export const TIME_FORMAT_EXAMPLES = ['07:00', '09:30', '14:15', '23:59'];

/**
 * Get a helpful error message for invalid time format
 */
export function getTimeFormatErrorMessage(fieldName: string = 'Time'): string {
  return `${fieldName} must be in HH:MM format (e.g., ${TIME_FORMAT_EXAMPLES.join(', ')})`;
}

/**
 * Transform form data to ensure all time fields are properly formatted
 * @param formData - Form data object
 * @param timeFields - Array of field names that contain time values
 * @returns Transformed form data with properly formatted time fields
 */
export function formatTimeFieldsInFormData<T extends Record<string, any>>(
  formData: T,
  timeFields: (keyof T)[]
): T {
  const result = { ...formData };
  
  timeFields.forEach(fieldName => {
    const value = result[fieldName];
    if (value) {
      console.log(`🔧 Processing ${String(fieldName)}:`, value, typeof value);
      
      // Handle Date objects
      if (value instanceof Date) {
        const hours = value.getHours().toString().padStart(2, '0');
        const minutes = value.getMinutes().toString().padStart(2, '0');
        result[fieldName] = `${hours}:${minutes}` as T[keyof T];
        console.log(`📅 Date converted:`, value, '→', result[fieldName]);
      }
      // Handle ISO datetime strings
      else if (typeof value === 'string' && value.includes('T')) {
        const date = new Date(value);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        result[fieldName] = `${hours}:${minutes}` as T[keyof T];
        console.log(`🕐 ISO string converted:`, value, '→', result[fieldName]);
      }
      // Handle simple time strings
      else if (typeof value === 'string') {
        result[fieldName] = formatTimeString(value) as T[keyof T];
        console.log(`⏰ String formatted:`, value, '→', result[fieldName]);
      }
    }
  });
  
  return result;
}

// Common time presets for quick selection
export const COMMON_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
];

/**
 * Calculate duration between two time strings in minutes
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Duration in minutes, or 0 if invalid times
 */
export function calculateDurationInMinutes(startTime: string, endTime: string): number {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  
  if (!start || !end) {
    return 0;
  }
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  // Handle negative duration (invalid time range)
  const duration = endMinutes - startMinutes;
  return duration > 0 ? duration : 0;
}

/**
 * Convert minutes to hours and minutes display format
 * @param totalMinutes - Total minutes to convert
 * @returns Formatted string like "2h 30min" or "45min"
 */
export function formatDurationDisplay(totalMinutes: number): string {
  if (totalMinutes === 0) {
    return '0min';
  }
  
  // Round to 2 decimal places
  const roundedMinutes = Math.round(totalMinutes * 100) / 100;
  
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  
  // Format minutes to 2 decimal places if needed
  const formatMinutes = (mins: number) => {
    return mins % 1 === 0 ? mins.toString() : mins.toFixed(2);
  };
  
  if (hours === 0) {
    return `${formatMinutes(minutes)}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${formatMinutes(minutes)}min`;
  }
}

/**
 * Calculate total session duration for a care plan detail
 * @param timeStart - Start time in HH:MM format
 * @param timeEnd - End time in HH:MM format
 * @returns Session duration in minutes
 */
export function calculateSessionDuration(timeStart: string, timeEnd: string): number {
  return calculateDurationInMinutes(timeStart, timeEnd);
}

/**
 * Calculate daily duration for care items based on their weekly_package and quantity
 * @param careItems - Array of care items with weekly_package and quantity
 * @returns Total daily duration in minutes (weekly_package / 7 * quantity)
 */
export function calculateCareItemsDailyDuration(
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>
): number {
  console.log('📊 calculateCareItemsDailyDuration called with:', careItems);
  
  return careItems.reduce((total, item, index) => {
    const weeklyPackage = item.long_term_care_item.weekly_package || 0;
    const dailyPackage = weeklyPackage / 7; // Convert weekly to daily
    const itemDailyDuration = dailyPackage * item.quantity;
    
    console.log(`📊 Item ${index}:`, {
      weekly_package: weeklyPackage,
      daily_package: dailyPackage,
      quantity: item.quantity,
      itemDailyDuration,
      runningTotal: total + itemDailyDuration
    });
    
    return total + itemDailyDuration;
  }, 0);
}

/**
 * Calculate actual days per week based on occurrence data
 * @param occurrences - Array of occurrence objects or simple count
 * @returns Number of days per week (7 if "tous les jours" is found, otherwise array length)
 */
export function calculateActualDaysPerWeek(occurrences: any[] | number): number {
  // If it's already a number, return it (backward compatibility)
  if (typeof occurrences === 'number') {
    return occurrences;
  }
  
  // Check if any occurrence represents "tous les jours" / daily
  const hasTousLesJours = occurrences.some(occ => 
    occ.str_name?.toLowerCase().includes('tous les jours') || 
    occ.str_name?.toLowerCase().includes('daily') ||
    occ.value?.toLowerCase().includes('daily') ||
    occ.str_name === '*' ||
    occ.value === '*'
  );
  
  if (hasTousLesJours) {
    console.log('📊 Found "tous les jours" occurrence, using 7 days/week');
    return 7;
  }
  
  // Otherwise, return the count of specific days
  const daysCount = occurrences.length;
  console.log('📊 Specific days selected:', daysCount);
  return daysCount;
}

/**
 * Calculate actual weekly duration for care items based on occurrences
 * @param careItems - Array of care items with weekly_package and quantity
 * @param occurrences - Array of occurrence objects or number of times per week
 * @returns Total actual weekly duration in minutes
 */
export function calculateCareItemsActualWeeklyDuration(
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>,
  occurrences: any[] | number
): number {
  const dailyDuration = calculateCareItemsDailyDuration(careItems);
  const actualDaysPerWeek = calculateActualDaysPerWeek(occurrences);
  const actualWeeklyDuration = dailyDuration * actualDaysPerWeek;
  
  console.log('📊 calculateCareItemsActualWeeklyDuration:', {
    dailyDuration,
    occurrences: Array.isArray(occurrences) ? occurrences.map(o => o.str_name || o.value) : occurrences,
    actualDaysPerWeek,
    actualWeeklyDuration
  });
  
  return actualWeeklyDuration;
}

/**
 * @deprecated Use calculateCareItemsDailyDuration or calculateCareItemsActualWeeklyDuration instead
 */
export function calculateCareItemsWeeklyDuration(
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>
): number {
  // Keep old function for backward compatibility, but it returns daily duration now
  return calculateCareItemsDailyDuration(careItems);
}

/**
 * Calculate total planned weekly duration for a care plan detail
 * @param careItems - Array of care items with weekly_package and quantity
 * @param occurrenceCount - Number of occurrences per week (e.g., 7 for daily, 3 for MWF)
 * @returns Total planned weekly duration in minutes
 */
export function calculatePlannedWeeklyDuration(
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>,
  occurrenceCount: number
): number {
  const careItemsWeeklyDuration = calculateCareItemsWeeklyDuration(careItems);
  return careItemsWeeklyDuration * (occurrenceCount / 7); // Normalize based on actual occurrences
}

/**
 * Calculate suggested end time based on start time and care package duration
 * @param startTime - Start time in HH:MM format
 * @param careItems - Array of care items with weekly_package and quantity
 * @param occurrences - Array of occurrence objects or number
 * @returns Suggested end time in HH:MM format
 */
export function calculateSuggestedEndTime(
  startTime: string,
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>,
  occurrences: any[] | number
): string | null {
  if (!startTime || careItems.length === 0) {
    return null;
  }

  // Calculate daily duration needed
  const dailyDuration = calculateCareItemsDailyDuration(careItems);
  
  if (dailyDuration === 0) {
    return null;
  }

  // Parse start time
  const startParsed = parseTimeString(startTime);
  if (!startParsed) {
    return null;
  }

  // Calculate end time
  const startMinutes = startParsed.hours * 60 + startParsed.minutes;
  const endMinutes = startMinutes + dailyDuration;
  
  // Handle overflow past midnight
  if (endMinutes >= 24 * 60) {
    return null; // Don't suggest times that go past midnight
  }

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return createTimeString(endHours, endMins);
}

/**
 * Check if current session duration matches expected care package duration
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format  
 * @param careItems - Array of care items with weekly_package and quantity
 * @returns Object with match status and suggested end time
 */
export function checkSessionDurationMatch(
  startTime: string,
  endTime: string,
  careItems: Array<{
    long_term_care_item: { weekly_package?: number };
    quantity: number;
  }>
): {
  matches: boolean;
  actualDuration: number;
  expectedDuration: number;
  suggestedEndTime: string | null;
  difference: number;
} {
  const actualDuration = calculateSessionDuration(startTime, endTime);
  const expectedDuration = calculateCareItemsDailyDuration(careItems);
  const suggestedEndTime = calculateSuggestedEndTime(startTime, careItems, 1);
  const difference = actualDuration - expectedDuration;

  return {
    matches: Math.abs(difference) <= 5, // 5 minute tolerance
    actualDuration,
    expectedDuration,
    suggestedEndTime,
    difference
  };
}