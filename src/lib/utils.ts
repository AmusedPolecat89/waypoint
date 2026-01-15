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
 * Format progress for display based on available fields
 */
export function formatProgress(waypoint: {
  chapter?: number;
  episode?: number;
  page?: number;
  percentage?: number;
  timestamp?: number;
}): string {
  if (waypoint.chapter !== undefined) {
    return `Chapter ${waypoint.chapter}`;
  }
  if (waypoint.episode !== undefined) {
    return `Episode ${waypoint.episode}`;
  }
  if (waypoint.page !== undefined) {
    return `Page ${waypoint.page}`;
  }
  if (waypoint.percentage !== undefined) {
    return `${waypoint.percentage}%`;
  }
  if (waypoint.timestamp !== undefined) {
    const mins = Math.floor(waypoint.timestamp / 60);
    const secs = waypoint.timestamp % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return 'No progress';
}
