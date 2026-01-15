/**
 * Waypoint Background Service Worker
 *
 * Handles:
 * - Extension installation/update events
 * - Context menu creation and handling
 * - Message passing between content scripts and popup
 */

import { createWork, createWaypoint, getWorks, getLatestWaypoint } from '../lib/storage';
import type { MediaType, WorkStatus } from '../lib/types';

// Context menu IDs
const MENU_ADD_TO_WAYPOINT = 'add-to-waypoint';
const MENU_ADD_MANGA = 'add-manga';
const MENU_ADD_ANIME = 'add-anime';
const MENU_ADD_NOVEL = 'add-novel';
const MENU_ADD_WEBCOMIC = 'add-webcomic';
const MENU_UPDATE_WAYPOINT = 'update-waypoint';
const MENU_UPDATE_PREFIX = 'update-work-';

/**
 * Create context menus on extension install/update
 */
function setupContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Parent menu: Add to Waypoint
    chrome.contextMenus.create({
      id: MENU_ADD_TO_WAYPOINT,
      title: 'Add to Waypoint',
      contexts: ['page', 'link'],
    });

    // Submenu items for different media types
    chrome.contextMenus.create({
      id: MENU_ADD_MANGA,
      parentId: MENU_ADD_TO_WAYPOINT,
      title: 'As Manga',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_ADD_ANIME,
      parentId: MENU_ADD_TO_WAYPOINT,
      title: 'As Anime',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_ADD_NOVEL,
      parentId: MENU_ADD_TO_WAYPOINT,
      title: 'As Novel',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_ADD_WEBCOMIC,
      parentId: MENU_ADD_TO_WAYPOINT,
      title: 'As Webcomic',
      contexts: ['page', 'link'],
    });

    // Separator
    chrome.contextMenus.create({
      id: 'separator-1',
      parentId: MENU_ADD_TO_WAYPOINT,
      type: 'separator',
      contexts: ['page', 'link'],
    });

    // Parent menu: Update waypoint (will be populated dynamically)
    chrome.contextMenus.create({
      id: MENU_UPDATE_WAYPOINT,
      title: 'Update waypoint for...',
      contexts: ['page', 'link'],
    });

    // Refresh the update menu with current works
    refreshUpdateMenu();
  });
}

/**
 * Refresh the "Update waypoint for..." submenu with current works
 */
async function refreshUpdateMenu() {
  const works = await getWorks();

  // Get recent works (limit to 10 most recently updated)
  const recentWorks = works.slice(0, 10);

  if (recentWorks.length === 0) {
    // No works yet - show disabled placeholder
    chrome.contextMenus.create({
      id: `${MENU_UPDATE_PREFIX}empty`,
      parentId: MENU_UPDATE_WAYPOINT,
      title: '(No works yet)',
      enabled: false,
      contexts: ['page', 'link'],
    });
  } else {
    // Create menu item for each work
    for (const work of recentWorks) {
      chrome.contextMenus.create({
        id: `${MENU_UPDATE_PREFIX}${work.id}`,
        parentId: MENU_UPDATE_WAYPOINT,
        title: work.title,
        contexts: ['page', 'link'],
      });
    }
  }
}

/**
 * Get page info from tab
 */
async function getPageInfo(tab: chrome.tabs.Tab): Promise<{ title: string; url: string }> {
  // Clean up the page title (remove common suffixes)
  let title = tab.title || 'Untitled';

  // Remove common site suffixes
  const suffixPatterns = [
    / [-–—|] .+$/,  // "Title - Site Name" or "Title | Site Name"
    / :: .+$/,      // "Title :: Site Name"
    /\s*\(.+\)$/,   // "Title (Site Name)"
  ];

  for (const pattern of suffixPatterns) {
    title = title.replace(pattern, '');
  }

  return {
    title: title.trim(),
    url: tab.url || '',
  };
}

/**
 * Try to extract chapter/episode number from URL or title
 */
function extractProgress(url: string, title: string): { chapter?: number; episode?: number } {
  const patterns = [
    // Common URL patterns
    /chapter[_-]?(\d+)/i,
    /ch[_-]?(\d+)/i,
    /episode[_-]?(\d+)/i,
    /ep[_-]?(\d+)/i,
    /\/(\d+)\/?$/,  // Ends with number
    // Title patterns
    /chapter\s*(\d+)/i,
    /ch\.?\s*(\d+)/i,
    /episode\s*(\d+)/i,
    /ep\.?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const urlMatch = url.match(pattern);
    if (urlMatch) {
      const num = parseInt(urlMatch[1], 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        if (pattern.source.toLowerCase().includes('ep')) {
          return { episode: num };
        }
        return { chapter: num };
      }
    }

    const titleMatch = title.match(pattern);
    if (titleMatch) {
      const num = parseInt(titleMatch[1], 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        if (pattern.source.toLowerCase().includes('ep')) {
          return { episode: num };
        }
        return { chapter: num };
      }
    }
  }

  return {};
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const menuItemId = info.menuItemId.toString();
  const targetUrl = info.linkUrl || info.pageUrl || tab.url || '';

  // Handle "Add to Waypoint" actions
  if ([MENU_ADD_MANGA, MENU_ADD_ANIME, MENU_ADD_NOVEL, MENU_ADD_WEBCOMIC].includes(menuItemId)) {
    const typeMap: Record<string, MediaType> = {
      [MENU_ADD_MANGA]: 'manga',
      [MENU_ADD_ANIME]: 'anime',
      [MENU_ADD_NOVEL]: 'novel',
      [MENU_ADD_WEBCOMIC]: 'webcomic',
    };
    const statusMap: Record<string, WorkStatus> = {
      [MENU_ADD_MANGA]: 'reading',
      [MENU_ADD_ANIME]: 'watching',
      [MENU_ADD_NOVEL]: 'reading',
      [MENU_ADD_WEBCOMIC]: 'reading',
    };

    const mediaType = typeMap[menuItemId];
    const status = statusMap[menuItemId];
    const pageInfo = await getPageInfo(tab);
    const progress = extractProgress(targetUrl, pageInfo.title);

    // Create the work
    const work = await createWork({
      title: pageInfo.title,
      type: mediaType,
      status: status,
    });

    // Create initial waypoint with source URL
    await createWaypoint({
      workId: work.id,
      sourceUrl: targetUrl,
      chapter: progress.chapter,
      episode: progress.episode,
    });

    // Refresh the update menu to include the new work
    await refreshUpdateMenu();

    // Notify user
    console.log(`Added "${work.title}" as ${mediaType}`);

    return;
  }

  // Handle "Update waypoint for..." actions
  if (menuItemId.startsWith(MENU_UPDATE_PREFIX)) {
    const workId = menuItemId.replace(MENU_UPDATE_PREFIX, '');

    if (workId === 'empty') return;

    const pageInfo = await getPageInfo(tab);
    const progress = extractProgress(targetUrl, pageInfo.title);

    // Get the latest waypoint to preserve any existing progress type
    const latestWaypoint = await getLatestWaypoint(workId);

    // Create new waypoint
    await createWaypoint({
      workId: workId,
      sourceUrl: targetUrl,
      chapter: progress.chapter || latestWaypoint?.chapter,
      episode: progress.episode || latestWaypoint?.episode,
      page: latestWaypoint?.page,
      timestamp: latestWaypoint?.timestamp,
      percentage: latestWaypoint?.percentage,
    });

    console.log(`Updated waypoint for work ${workId}`);

    return;
  }
});

/**
 * Listen for storage changes to refresh update menu
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.waypoint_store) {
    // Rebuild the update menu when works change
    // Use a small delay to batch rapid changes
    setTimeout(() => {
      // Remove all children of the update menu first
      chrome.contextMenus.removeAll(() => {
        setupContextMenus();
      });
    }, 100);
  }
});

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Waypoint installed');
  } else if (details.reason === 'update') {
    console.log(`Waypoint updated to ${chrome.runtime.getManifest().version}`);
  }

  // Set up context menus
  setupContextMenus();
});

/**
 * Handle messages from popup/options
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'refresh-context-menus') {
    refreshUpdateMenu().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});
