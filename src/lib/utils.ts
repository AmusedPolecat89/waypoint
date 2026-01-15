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
 * Shows multiple indicators when available (e.g., "Chapter 5, Page 23")
 */
export function formatProgress(waypoint: {
  chapter?: number;
  episode?: number;
  page?: number;
  percentage?: number;
  timestamp?: number;
}): string {
  const parts: string[] = [];

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
