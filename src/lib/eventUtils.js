/**
 * Utility functions for events and candidate sections
 */

export const SECTION_OPTIONS = ['Sub-Junior', 'Junior', 'Senior', 'Super Senior', 'General'];

/**
 * Normalizes event categories to an array of trimmed strings
 * Supports both categories (Array) and legacy category (comma-separated or single String)
 */
export function getEventCategories(event) {
  if (!event) return [];
  if (Array.isArray(event.categories) && event.categories.length > 0) {
    return event.categories.map(c => String(c).trim()).filter(Boolean);
  }
  if (typeof event.category === 'string' && event.category.trim()) {
    return event.category.split(',').map(c => c.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Formats event categories for clean UI display (e.g. "Junior, Senior")
 */
export function formatEventCategories(event) {
  const cats = getEventCategories(event);
  return cats.length > 0 ? cats.join(', ') : 'General';
}

/**
 * Checks if a specific event is available to a candidate belonging to a given section.
 * Returns true if:
 * 1. The event categories explicitly include the candidate's section, OR
 * 2. The event categories include 'All', 'Open', or 'Common', OR
 * 3. The event has no categories configured (open by default).
 */
export function isEventAvailableForSection(event, section) {
  if (!event) return false;
  if (!section) return true; // If section is not yet specified, don't block
  
  const cats = getEventCategories(event);
  if (cats.length === 0) return true; // Open to all if unconfigured

  const target = String(section).trim().toLowerCase();

  // Direct match with candidate section
  if (cats.some(c => c.toLowerCase() === target)) {
    return true;
  }

  // Keywords that denote open to all sections
  if (cats.some(c => ['all', 'open', 'common', 'all sections'].includes(c.toLowerCase()))) {
    return true;
  }

  return false;
}

export const GENDER_OPTIONS = [
  { value: 'Both', label: 'Combined (Male & Female)' },
  { value: 'Male', label: 'Male Only' },
  { value: 'Female', label: 'Female Only' },
];

/**
 * Checks if a specific event is available for a candidate of a given sex.
 * Returns true if the event is 'Both' / 'Combined' (default) or matches the candidate sex.
 */
export function isEventAvailableForGender(event, sex) {
  if (!event || !sex) return true;
  const evGender = (event.gender || 'Both').trim().toLowerCase();
  if (['both', 'combined', 'all', 'any'].includes(evGender)) {
    return true;
  }
  const candidateSex = String(sex).trim().toLowerCase();
  return evGender === candidateSex;
}

/**
 * Checks if an event is available for a candidate based on BOTH Section and Sex.
 */
export function isEventAvailableForCandidate(event, section, sex) {
  return isEventAvailableForSection(event, section) && isEventAvailableForGender(event, sex);
}

/**
 * Returns a human-friendly gender badge string
 */
export function formatEventGender(event) {
  const g = (event?.gender || 'Both').trim();
  if (g.toLowerCase() === 'male') return 'Male Only';
  if (g.toLowerCase() === 'female') return 'Female Only';
  return 'Combined';
}

/**
 * Generates an event name tailored to a specific section/category without redundant duplication.
 * e.g. ("Recitation", "Junior") -> "Recitation (Junior)"
 * e.g. ("Elocution (English)", "Junior") -> "Elocution (English) - Junior"
 */
export function getSectionEventName(baseName, section) {
  if (!baseName) return '';
  const cleanName = baseName.trim();
  if (!section) return cleanName;
  const cleanSec = String(section).trim();

  // If cleanName already ends with (section) or - section, don't duplicate
  const endsWithSec = new RegExp(`[\\(\\-\\–\\/]\\s*${cleanSec}\\s*\\)?$`, 'i');
  if (endsWithSec.test(cleanName)) {
    return cleanName;
  }

  if (cleanName.includes('(')) {
    return `${cleanName} - ${cleanSec}`;
  }
  return `${cleanName} (${cleanSec})`;
}
