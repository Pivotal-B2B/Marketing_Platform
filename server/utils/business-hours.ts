import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { isWeekend, getDay, parse, isWithinInterval } from 'date-fns';

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string; // Campaign timezone (e.g., 'America/New_York')
  operatingDays: string[]; // e.g., ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  startTime: string; // e.g., '09:00' (24-hour format)
  endTime: string; // e.g., '17:00' (24-hour format)
  respectContactTimezone: boolean; // If true, use contact's timezone; if false, use campaign timezone
  excludedDates?: string[]; // e.g., ['2024-12-25', '2024-01-01'] - holidays
}

export interface ContactTimezoneInfo {
  timezone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

/**
 * Default business hours configuration
 */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: true,
  timezone: 'America/New_York',
  operatingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  startTime: '09:00',
  endTime: '17:00',
  respectContactTimezone: true,
  excludedDates: [],
};

/**
 * Common US federal holidays (can be customized)
 */
export const US_FEDERAL_HOLIDAYS_2024_2025 = [
  '2024-01-01', // New Year's Day
  '2024-01-15', // MLK Day
  '2024-02-19', // Presidents' Day
  '2024-05-27', // Memorial Day
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-10-14', // Columbus Day
  '2024-11-11', // Veterans Day
  '2024-11-28', // Thanksgiving
  '2024-12-25', // Christmas
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents' Day
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

/**
 * Detect timezone from contact's location data
 */
export function detectContactTimezone(contact: ContactTimezoneInfo): string | null {
  // If contact already has timezone, use it
  if (contact.timezone) {
    return contact.timezone;
  }

  // Map US states to timezones
  const stateTimezoneMap: Record<string, string> = {
    // Eastern Time
    'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
    'GA': 'America/New_York', 'ME': 'America/New_York', 'MD': 'America/New_York',
    'MA': 'America/New_York', 'NH': 'America/New_York', 'NJ': 'America/New_York',
    'NY': 'America/New_York', 'NC': 'America/New_York', 'OH': 'America/New_York',
    'PA': 'America/New_York', 'RI': 'America/New_York', 'SC': 'America/New_York',
    'VT': 'America/New_York', 'VA': 'America/New_York', 'WV': 'America/New_York',
    // Central Time
    'AL': 'America/Chicago', 'AR': 'America/Chicago', 'IL': 'America/Chicago',
    'IA': 'America/Chicago', 'KS': 'America/Chicago', 'KY': 'America/Chicago',
    'LA': 'America/Chicago', 'MN': 'America/Chicago', 'MS': 'America/Chicago',
    'MO': 'America/Chicago', 'NE': 'America/Chicago', 'ND': 'America/Chicago',
    'OK': 'America/Chicago', 'SD': 'America/Chicago', 'TN': 'America/Chicago',
    'TX': 'America/Chicago', 'WI': 'America/Chicago',
    // Mountain Time
    'AZ': 'America/Phoenix', // Arizona doesn't observe DST
    'CO': 'America/Denver', 'ID': 'America/Denver', 'MT': 'America/Denver',
    'NM': 'America/Denver', 'UT': 'America/Denver', 'WY': 'America/Denver',
    // Pacific Time
    'CA': 'America/Los_Angeles', 'NV': 'America/Los_Angeles',
    'OR': 'America/Los_Angeles', 'WA': 'America/Los_Angeles',
    // Alaska & Hawaii
    'AK': 'America/Anchorage',
    'HI': 'Pacific/Honolulu',
  };

  // Try to detect from state
  if (contact.state) {
    const stateUpper = contact.state.toUpperCase();
    if (stateTimezoneMap[stateUpper]) {
      return stateTimezoneMap[stateUpper];
    }
  }

  // Try to detect from country (basic international support)
  if (contact.country) {
    const countryUpper = contact.country.toUpperCase();
    if (countryUpper === 'USA' || countryUpper === 'UNITED STATES' || countryUpper === 'US') {
      return 'America/New_York'; // Default to Eastern for US
    }
    if (countryUpper === 'CANADA' || countryUpper === 'CA') {
      return 'America/Toronto'; // Default to Eastern for Canada
    }
    if (countryUpper === 'UK' || countryUpper === 'UNITED KINGDOM' || countryUpper === 'GB') {
      return 'Europe/London';
    }
  }

  return null; // Unknown timezone
}

/**
 * Check if a given time is within business hours
 */
export function isWithinBusinessHours(
  config: BusinessHoursConfig,
  contactInfo?: ContactTimezoneInfo,
  checkTime: Date = new Date()
): boolean {
  if (!config.enabled) {
    return true; // Business hours checking disabled
  }

  // Determine which timezone to use
  let targetTimezone = config.timezone;
  if (config.respectContactTimezone && contactInfo) {
    const contactTz = detectContactTimezone(contactInfo);
    if (contactTz) {
      targetTimezone = contactTz;
    }
  }

  // Convert current time to target timezone
  const zonedTime = toZonedTime(checkTime, targetTimezone);
  
  // Check if it's a weekend
  const dayOfWeek = format(zonedTime, 'EEEE', { timeZone: targetTimezone }).toLowerCase();
  if (!config.operatingDays.includes(dayOfWeek)) {
    return false; // Not an operating day
  }

  // Check if it's a holiday
  const dateString = format(zonedTime, 'yyyy-MM-dd', { timeZone: targetTimezone });
  if (config.excludedDates && config.excludedDates.includes(dateString)) {
    return false; // Holiday
  }

  // Check time range
  const currentTimeStr = format(zonedTime, 'HH:mm', { timeZone: targetTimezone });
  
  // Parse start and end times for comparison
  if (currentTimeStr < config.startTime || currentTimeStr >= config.endTime) {
    return false; // Outside operating hours
  }

  return true; // Within business hours
}

/**
 * Calculate next available calling time
 */
export function getNextAvailableTime(
  config: BusinessHoursConfig,
  contactInfo?: ContactTimezoneInfo,
  fromTime: Date = new Date()
): Date {
  if (!config.enabled) {
    return fromTime; // Business hours disabled, can call anytime
  }

  // Determine which timezone to use
  let targetTimezone = config.timezone;
  if (config.respectContactTimezone && contactInfo) {
    const contactTz = detectContactTimezone(contactInfo);
    if (contactTz) {
      targetTimezone = contactTz;
    }
  }

  // Start from the next minute
  let checkTime = new Date(fromTime.getTime() + 60000);
  const maxIterations = 14 * 24 * 60; // Check up to 2 weeks ahead (in minutes)
  
  for (let i = 0; i < maxIterations; i++) {
    if (isWithinBusinessHours(config, contactInfo, checkTime)) {
      return checkTime;
    }
    
    // If we're outside hours, jump to start of next business day
    const zonedTime = toZonedTime(checkTime, targetTimezone);
    const currentTimeStr = format(zonedTime, 'HH:mm', { timeZone: targetTimezone });
    
    // If past end time, jump to start time next day
    if (currentTimeStr >= config.endTime) {
      const nextDay = new Date(checkTime);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Parse start time and set it
      const [startHour, startMinute] = config.startTime.split(':').map(Number);
      const zonedNextDay = toZonedTime(nextDay, targetTimezone);
      zonedNextDay.setHours(startHour, startMinute, 0, 0);
      
      checkTime = fromZonedTime(zonedNextDay, targetTimezone);
    } else {
      // Before start time, jump to start time today
      const [startHour, startMinute] = config.startTime.split(':').map(Number);
      const zonedCheckTime = toZonedTime(checkTime, targetTimezone);
      zonedCheckTime.setHours(startHour, startMinute, 0, 0);
      
      checkTime = fromZonedTime(zonedCheckTime, targetTimezone);
    }
  }

  // Fallback: return 24 hours from now
  return new Date(fromTime.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Get business hours summary for display
 */
export function getBusinessHoursSummary(config: BusinessHoursConfig): string {
  if (!config.enabled) {
    return '24/7 (No restrictions)';
  }

  const days = config.operatingDays.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
  const hours = `${config.startTime} - ${config.endTime}`;
  const tz = config.timezone.split('/')[1]?.replace('_', ' ') || config.timezone;
  
  return `${days}: ${hours} ${tz}`;
}
