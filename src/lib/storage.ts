/**
 * Chrome storage abstraction layer
 *
 * Follows the principle: "Local-first, user-owned data"
 * All data stays on device by default.
 */

import type { WaypointStore, Work, Waypoint } from './types';
import { createEmptyStore } from './types';
import { generateId, now } from './utils';

const STORAGE_KEY = 'waypoint_store';

/**
 * Load the entire store from Chrome local storage
 */
export async function loadStore(): Promise<WaypointStore> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? createEmptyStore();
}

/**
 * Save the entire store to Chrome local storage
 */
export async function saveStore(store: WaypointStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

/**
 * Create a new Work
 */
export async function createWork(
  data: Omit<Work, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Work> {
  const store = await loadStore();
  const timestamp = now();

  const work: Work = {
    ...data,
    id: generateId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.works[work.id] = work;
  await saveStore(store);

  return work;
}

/**
 * Update an existing Work
 */
export async function updateWork(
  id: string,
  data: Partial<Omit<Work, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Work | null> {
  const store = await loadStore();
  const existing = store.works[id];

  if (!existing) return null;

  const updated: Work = {
    ...existing,
    ...data,
    updatedAt: now(),
  };

  store.works[id] = updated;
  await saveStore(store);

  return updated;
}

/**
 * Delete a Work and all associated Waypoints and Sources
 */
export async function deleteWork(id: string): Promise<boolean> {
  const store = await loadStore();

  if (!store.works[id]) return false;

  delete store.works[id];

  // Clean up associated waypoints
  for (const [wpId, wp] of Object.entries(store.waypoints)) {
    if (wp.workId === id) {
      delete store.waypoints[wpId];
    }
  }

  // Clean up associated sources
  for (const [srcId, src] of Object.entries(store.sources)) {
    if (src.workId === id) {
      delete store.sources[srcId];
    }
  }

  await saveStore(store);
  return true;
}

/**
 * Get all Works
 */
export async function getWorks(): Promise<Work[]> {
  const store = await loadStore();
  return Object.values(store.works).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get a single Work by ID
 */
export async function getWork(id: string): Promise<Work | null> {
  const store = await loadStore();
  return store.works[id] ?? null;
}

/**
 * Create a new Waypoint for a Work
 */
export async function createWaypoint(
  data: Omit<Waypoint, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Waypoint> {
  const store = await loadStore();
  const timestamp = now();

  const waypoint: Waypoint = {
    ...data,
    id: generateId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.waypoints[waypoint.id] = waypoint;

  // Update the parent work's timestamp
  if (store.works[data.workId]) {
    store.works[data.workId].updatedAt = timestamp;
  }

  await saveStore(store);

  return waypoint;
}

/**
 * Get the latest Waypoint for a Work
 */
export async function getLatestWaypoint(workId: string): Promise<Waypoint | null> {
  const store = await loadStore();
  const waypoints = Object.values(store.waypoints)
    .filter((wp) => wp.workId === workId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return waypoints[0] ?? null;
}

/**
 * Get all Waypoints for a Work
 */
export async function getWaypoints(workId: string): Promise<Waypoint[]> {
  const store = await loadStore();
  return Object.values(store.waypoints)
    .filter((wp) => wp.workId === workId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Update an existing Waypoint
 */
export async function updateWaypoint(
  id: string,
  data: Partial<Omit<Waypoint, 'id' | 'workId' | 'createdAt' | 'updatedAt'>>
): Promise<Waypoint | null> {
  const store = await loadStore();
  const existing = store.waypoints[id];

  if (!existing) return null;

  const timestamp = now();
  const updated: Waypoint = {
    ...existing,
    ...data,
    updatedAt: timestamp,
  };

  store.waypoints[id] = updated;

  // Update the parent work's timestamp
  if (store.works[existing.workId]) {
    store.works[existing.workId].updatedAt = timestamp;
  }

  await saveStore(store);

  return updated;
}

/**
 * Delete a Waypoint
 */
export async function deleteWaypoint(id: string): Promise<boolean> {
  const store = await loadStore();
  const waypoint = store.waypoints[id];

  if (!waypoint) return false;

  delete store.waypoints[id];

  // Update the parent work's timestamp
  if (store.works[waypoint.workId]) {
    store.works[waypoint.workId].updatedAt = now();
  }

  await saveStore(store);
  return true;
}

/**
 * Export the entire store as JSON
 */
export async function exportData(): Promise<string> {
  const store = await loadStore();
  return JSON.stringify(store, null, 2);
}

/**
 * Import data from JSON (merges with existing)
 */
export async function importData(json: string): Promise<void> {
  const imported = JSON.parse(json) as WaypointStore;
  const existing = await loadStore();

  // Merge imported data (imported wins on conflict)
  const merged: WaypointStore = {
    works: { ...existing.works, ...imported.works },
    waypoints: { ...existing.waypoints, ...imported.waypoints },
    sources: { ...existing.sources, ...imported.sources },
  };

  await saveStore(merged);
}

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Import data from CSV format
 * Expected columns: title, type, status, progress, note, sourceUrl
 * - type: novel, manga, webcomic, anime
 * - status: reading, watching, completed, paused, dropped
 * - progress: number (interpreted as chapter or episode based on type)
 */
export async function importCSV(csv: string): Promise<{ imported: number; skipped: number }> {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  // Parse header to get column indices
  const header = parseCSVLine(lines[0].toLowerCase());
  const titleIdx = header.findIndex((h) => h === 'title' || h === 'name');
  const typeIdx = header.findIndex((h) => h === 'type' || h === 'media' || h === 'mediatype');
  const statusIdx = header.findIndex((h) => h === 'status');
  const progressIdx = header.findIndex((h) =>
    ['progress', 'chapter', 'episode', 'ep', 'ch'].includes(h)
  );
  const noteIdx = header.findIndex((h) => h === 'note' || h === 'notes');
  const sourceUrlIdx = header.findIndex((h) => h === 'sourceurl' || h === 'url' || h === 'source');

  if (titleIdx === -1) {
    throw new Error('CSV must have a "title" column');
  }

  const validTypes = ['novel', 'manga', 'webcomic', 'anime'];
  const validStatuses = ['reading', 'watching', 'completed', 'paused', 'dropped'];

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const title = fields[titleIdx]?.trim();

    if (!title) {
      skipped++;
      continue;
    }

    // Parse type (default to manga)
    let type = fields[typeIdx]?.toLowerCase().trim() || 'manga';
    if (!validTypes.includes(type)) {
      type = 'manga';
    }

    // Parse status (default based on type)
    let status = fields[statusIdx]?.toLowerCase().trim() || '';
    if (!validStatuses.includes(status)) {
      status = type === 'anime' ? 'watching' : 'reading';
    }

    // Create work
    const work = await createWork({
      title,
      type: type as 'novel' | 'manga' | 'webcomic' | 'anime',
      status: status as 'reading' | 'watching' | 'completed' | 'paused' | 'dropped',
    });

    // Create waypoint if progress is provided
    const progressStr = fields[progressIdx]?.trim();
    const progress = progressStr ? parseInt(progressStr, 10) : NaN;

    if (!isNaN(progress) && progress >= 0) {
      const note = fields[noteIdx]?.trim() || undefined;
      const sourceUrl = fields[sourceUrlIdx]?.trim() || undefined;
      const progressField = type === 'anime' ? 'episode' : 'chapter';

      await createWaypoint({
        workId: work.id,
        [progressField]: progress,
        note,
        sourceUrl,
      });
    }

    imported++;
  }

  return { imported, skipped };
}
