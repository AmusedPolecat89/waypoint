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
