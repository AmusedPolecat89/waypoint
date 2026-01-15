/**
 * Core data types for Waypoint
 *
 * These types follow the UX principle: "Progress is sacred"
 * Data structures are designed to be durable and portable.
 */

export type MediaType = 'novel' | 'manga' | 'webcomic' | 'anime';

export type WorkStatus = 'reading' | 'watching' | 'completed' | 'paused' | 'dropped';

/**
 * A Work represents a piece of content (story, series, etc.)
 * independent of where it's hosted.
 */
export interface Work {
  id: string;
  title: string;
  type: MediaType;
  status: WorkStatus;
  createdAt: number;
  updatedAt: number;

  // Optional metadata from external services
  thumbnailUrl?: string;
  externalId?: string; // External service ID (string to support various formats)
  externalSource?: 'anilist' | 'mal' | 'mangadex' | 'openlibrary';
}

/**
 * A Waypoint represents the user's progress in a Work.
 * Progress fields are optional to support different media types.
 */
export interface Waypoint {
  id: string;
  workId: string;

  // Progress indicators (use what's relevant for the media type)
  chapter?: number;
  episode?: number;
  issue?: number; // For comics/manga published in issues
  volume?: number; // For tracking volume number
  timestamp?: number; // seconds, for video
  percentage?: number; // 0-100
  page?: number;

  // Optional context
  note?: string;
  sourceUrl?: string; // A hint, not the source of truth

  createdAt: number;
  updatedAt: number;
}

/**
 * A Source is an optional link to where content can be found.
 * Sources are helpers, not dependencies.
 */
export interface Source {
  id: string;
  workId: string;
  url: string;
  label?: string;
  lastVisited?: number;
}

/**
 * The complete data store structure
 */
export interface WaypointStore {
  works: Record<string, Work>;
  waypoints: Record<string, Waypoint>;
  sources: Record<string, Source>;
}

/**
 * Create an empty store
 */
export function createEmptyStore(): WaypointStore {
  return {
    works: {},
    waypoints: {},
    sources: {},
  };
}
