/**
 * Utility functions for Waypoint
 */

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Format a timestamp for display
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format a relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(timestamp);
}

/**
 * Format a timestamp duration (seconds) as MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format progress for display based on available fields
 * Shows multiple indicators when available (e.g., "Vol. 2, Ch. 5, p. 23")
 */
export function formatProgress(waypoint: {
  volume?: number;
  chapter?: number;
  issue?: number;
  episode?: number;
  page?: number;
  percentage?: number;
  timestamp?: number;
}): string {
  const parts: string[] = [];

  if (waypoint.volume !== undefined) {
    parts.push(`Vol. ${waypoint.volume}`);
  }
  if (waypoint.issue !== undefined) {
    parts.push(`#${waypoint.issue}`);
  }
  if (waypoint.chapter !== undefined) {
    parts.push(`Ch. ${waypoint.chapter}`);
  }
  if (waypoint.episode !== undefined) {
    parts.push(`Ep. ${waypoint.episode}`);
  }
  if (waypoint.page !== undefined) {
    parts.push(`p. ${waypoint.page}`);
  }
  if (waypoint.timestamp !== undefined) {
    parts.push(formatTimestamp(waypoint.timestamp));
  }
  if (waypoint.percentage !== undefined) {
    parts.push(`${waypoint.percentage}%`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No progress';
}

// Common suffixes to remove from titles
const TITLE_CLEANUP_PATTERNS = [
  /\s+[-–—|]\s+.+$/i, // "Title - Site Name" or "Title | Site"
  /\s+on\s+\S+\.(?:com|net|org|io|to|tv|me|cc)$/i, // "on sitename.com"
  /\s+(?:read|watch)\s+(?:online|free).*$/i, // "read online free"
  /\s+(?:in\s+)?(?:english|eng)\s+(?:online|free|sub|dub|raw).*$/i, // "in english online", "english sub"
  /\s+(?:online|free)\s*(?:reading|streaming)?.*$/i, // "online free reading"
  /\s+(?:chapter|ch\.?|episode|ep\.?)\s*\d+.*$/i, // "chapter 5" at end
  /\s+(?:volume|vol\.?)\s*\d+.*$/i, // "volume 1" at end
  /\s*\([^)]*(?:manga|anime|novel|webtoon|manhwa|manhua)[^)]*\)$/i, // "(Manga)" type suffixes
  /\s+(?:manga|manhwa|manhua|webtoon|novel|anime)$/i, // trailing media type
];

/**
 * Clean a title for display - removes junk but preserves capitalization
 * Use this when storing/displaying titles
 */
export function cleanTitle(title: string): string {
  let cleaned = title;

  // Apply cleanup patterns (case-insensitive but preserve original case)
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If the result looks like it's all lowercase or all uppercase, title-case it
  if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
    cleaned = toTitleCase(cleaned);
  }

  return cleaned;
}

/**
 * Convert a string to Title Case
 */
function toTitleCase(str: string): string {
  const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'of', 'in'];

  return str
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word, otherwise check if it's a minor word
      if (index === 0 || !minorWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(' ');
}

/**
 * Normalize a title for fuzzy matching
 * Removes common suffixes, punctuation, and normalizes whitespace
 * Returns lowercase for comparison purposes
 */
export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase();

  // Apply cleanup patterns
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  // Remove punctuation and extra whitespace
  normalized = normalized
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  return normalized;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a combination of techniques for robust matching
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match after normalization
  if (norm1 === norm2) return 1;

  // Empty check
  if (!norm1 || !norm2) return 0;

  // Check if one contains the other (common for partial titles)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;
    return shorter.length / longer.length;
  }

  // Word-based matching
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Count matching words
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }

  // Jaccard-like similarity
  const union = new Set([...words1, ...words2]);
  return matches / union.size;
}

/**
 * Check if two titles are likely the same work
 * Uses a threshold for fuzzy matching
 */
export function isSameWork(title1: string, title2: string, threshold = 0.6): boolean {
  return calculateTitleSimilarity(title1, title2) >= threshold;
}
