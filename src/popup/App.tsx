import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { Work, Waypoint, MediaType, WorkStatus } from '@/lib/types';
import {
  getWorks,
  getLatestWaypoint,
  createWork,
  updateWork,
  deleteWork,
  createWaypoint,
  updateWaypoint,
  deleteWaypoint,
} from '@/lib/storage';
import { formatProgress, isSameWork } from '@/lib/utils';
import {
  getDomain,
  detectMediaType,
  extractProgress,
  extractTitle,
} from '@/lib/detection';

import { useToasts } from './hooks';
import type { WorkWithProgress, View, SortOption } from './types';
import {
  ToastContainer,
  Header,
  QuickActionBar,
  EmptyState,
  WorkList,
  AddWorkForm,
  EditWorkForm,
  WorkDetail,
  EditWaypointForm,
  SkeletonLoader,
} from './components';

interface AppProps {
  isSidePanel?: boolean;
}

export function App({ isSidePanel = false }: AppProps) {
  const [works, setWorks] = useState<WorkWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: 'list' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [compactMode, setCompactMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToasts();

  // Current tab info for quick add/update
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [matchedWork, setMatchedWork] = useState<WorkWithProgress | null>(null);

  useEffect(() => {
    loadWorks();
    loadCurrentTab();
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [search, statusFilter, typeFilter, sortBy]);

  const filteredWorks = works
    .filter((work) => {
      const matchesSearch = work.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || work.status === statusFilter;
      const matchesType = typeFilter === 'all' || work.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return b.createdAt - a.createdAt;
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle keys when in list view
      if (view.type !== 'list') {
        // Escape goes back from any view
        if (e.key === 'Escape') {
          e.preventDefault();
          if (view.type === 'detail') {
            setView({ type: 'list' });
          } else if (view.type === 'edit' || view.type === 'edit-waypoint') {
            setView({ type: 'detail', work: view.work });
          } else if (view.type === 'add') {
            setView({ type: 'list' });
          }
        }
        return;
      }

      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT';

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredWorks.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < filteredWorks.length && !isInputFocused) {
            e.preventDefault();
            setView({ type: 'detail', work: filteredWorks[selectedIndex] });
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isInputFocused) {
            (document.activeElement as HTMLElement).blur();
            setSelectedIndex(0);
          } else {
            setSelectedIndex(-1);
          }
          break;
        case '/':
          if (!isInputFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'n':
          if (!isInputFocused) {
            e.preventDefault();
            setView({ type: 'add' });
          }
          break;
      }
    },
    [view, filteredWorks, selectedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  async function loadWorks() {
    setLoading(true);
    const allWorks = await getWorks();

    const worksWithProgress: WorkWithProgress[] = await Promise.all(
      allWorks.map(async (work) => {
        const waypoint = await getLatestWaypoint(work.id);
        return {
          ...work,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        };
      })
    );

    setWorks(worksWithProgress);
    setLoading(false);
  }

  async function loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab?.title) {
        setCurrentTab({ url: tab.url, title: tab.title });
      }
    } catch {
      // Ignore errors (e.g., on chrome:// pages)
    }
  }

  // Detect if current tab matches any existing work
  // Uses both URL-based and title-based matching for cross-site detection
  useEffect(() => {
    if (!currentTab?.url || works.length === 0) {
      setMatchedWork(null);
      return;
    }

    const currentDomain = getDomain(currentTab.url);
    const currentTitle = extractTitle(currentTab.title, currentTab.url);

    // First, try URL-based matching (exact or same domain/path)
    let matched = works.find((work) => {
      if (!work.latestWaypoint?.sourceUrl) return false;
      const workDomain = getDomain(work.latestWaypoint.sourceUrl);

      // Exact URL match
      if (work.latestWaypoint.sourceUrl === currentTab.url) return true;

      // Same domain with matching path structure
      if (currentDomain === workDomain) {
        try {
          const currentPath = new URL(currentTab.url).pathname.toLowerCase();
          const workPath = new URL(work.latestWaypoint.sourceUrl).pathname.toLowerCase();
          const currentParts = currentPath.split('/').filter(Boolean);
          const workParts = workPath.split('/').filter(Boolean);
          if (currentParts.length >= 2 && workParts.length >= 2) {
            return currentParts[0] === workParts[0] && currentParts[1] === workParts[1];
          }
        } catch {
          // Invalid URL, skip
        }
      }
      return false;
    });

    // If no URL match, try title-based matching (cross-site detection)
    if (!matched && currentTitle) {
      matched = works.find((work) => isSameWork(work.title, currentTitle));
    }

    setMatchedWork(matched ?? null);
  }, [currentTab, works]);

  /**
   * Extract text content from the current page for keyword scanning
   */
  async function extractPageContent(tabId: number): Promise<string> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const selectors = [
            'h1', 'h2', 'h3',
            '.genre', '.genres', '[class*="genre"]',
            '.tag', '.tags', '[class*="tag"]',
            '.type', '[class*="type"]',
            '.info', '.details', '.meta',
            '.breadcrumb', '[class*="breadcrumb"]',
            '.category', '[class*="category"]',
            'title', 'meta[name="description"]',
          ];

          const textParts: string[] = [];

          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            textParts.push(metaDesc.getAttribute('content') || '');
          }

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length < 500) {
                textParts.push(text);
              }
            });
          }

          const bodyText = document.body?.innerText?.substring(0, 5000) || '';
          textParts.push(bodyText);

          return textParts.join(' ').toLowerCase();
        },
      });

      return results[0]?.result || '';
    } catch {
      return '';
    }
  }

  /**
   * Extract current video timestamp from the page
   * Returns the current time in seconds, or undefined if no video found
   */
  async function extractVideoTimestamp(tabId: number): Promise<number | undefined> {
    try {
      // Try main frame first
      const mainResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const videos = document.querySelectorAll('video');
          for (const video of videos) {
            if (video.currentTime > 0) {
              return Math.floor(video.currentTime);
            }
          }
          return undefined;
        },
      });

      if (mainResults[0]?.result !== undefined) {
        return mainResults[0].result;
      }

      // Try all frames (for videos in iframes)
      const allFrameResults = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => {
          const videos = document.querySelectorAll('video');
          for (const video of videos) {
            if (video.currentTime > 0) {
              return Math.floor(video.currentTime);
            }
          }
          return undefined;
        },
      });

      // Find first frame with a valid timestamp
      for (const result of allFrameResults) {
        if (result?.result !== undefined) {
          return result.result;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  // Quick update for matched work
  async function handleQuickUpdate() {
    if (!matchedWork || !currentTab) return;

    const progress = extractProgress(currentTab.url, currentTab.title, matchedWork.type);
    const isAnime = matchedWork.type === 'anime';

    // Try to get video timestamp for anime
    let timestamp: number | undefined;
    if (isAnime) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          timestamp = await extractVideoTimestamp(tab.id);
        }
      } catch {
        // Continue without timestamp
      }
    }

    await createWaypoint({
      workId: matchedWork.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter || (isAnime ? undefined : matchedWork.latestWaypoint?.chapter),
      episode: progress.episode || (isAnime ? matchedWork.latestWaypoint?.episode : undefined),
      timestamp: isAnime ? timestamp : undefined,
    });
    await loadWorks();
    addToast(`Updated "${matchedWork.title}"`);
  }

  // Quick add from current tab
  async function handleQuickAdd() {
    if (!currentTab) return;

    let pageContent = '';
    let timestamp: number | undefined;
    let tabId: number | undefined;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
      if (tabId) {
        pageContent = await extractPageContent(tabId);
      }
    } catch {
      // Continue without page content
    }

    const type = detectMediaType(currentTab.url, currentTab.title, pageContent);
    const title = extractTitle(currentTab.title, currentTab.url);
    const progress = extractProgress(currentTab.url, currentTab.title, type);
    const status = type === 'anime' ? 'watching' : 'reading';

    // Try to get video timestamp for anime
    if (type === 'anime' && tabId) {
      try {
        timestamp = await extractVideoTimestamp(tabId);
      } catch {
        // Continue without timestamp
      }
    }

    const work = await createWork({ title, type, status });
    await createWaypoint({
      workId: work.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter,
      episode: progress.episode,
      timestamp: type === 'anime' ? timestamp : undefined,
    });
    await loadWorks();
    setView({ type: 'list' });
    addToast(`Added "${title}" as ${type}`);
  }

  async function handleAddWork(data: { title: string; type: MediaType }) {
    await createWork({
      title: data.title,
      type: data.type,
      status: data.type === 'anime' ? 'watching' : 'reading',
    });
    await loadWorks();
    setView({ type: 'list' });
    addToast(`Added "${data.title}"`);
  }

  async function handleUpdateWork(
    id: string,
    data: Partial<Pick<Work, 'title' | 'type' | 'status'>>
  ) {
    await updateWork(id, data);
    await loadWorks();
    setView({ type: 'list' });
    addToast('Work updated');
  }

  async function handleDeleteWork(id: string) {
    await deleteWork(id);
    await loadWorks();
    setView({ type: 'list' });
    addToast('Work deleted');
  }

  async function handleQuickStatusChange(id: string, status: WorkStatus) {
    await updateWork(id, { status });
    await loadWorks();
  }

  async function handleSetWaypoint(
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) {
    await createWaypoint({ workId, ...data });
    await loadWorks();
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint saved');
  }

  async function handleUpdateWaypoint(
    waypointId: string,
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'note' | 'sourceUrl'>>
  ) {
    await updateWaypoint(waypointId, data);
    await loadWorks();
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint updated');
  }

  async function handleDeleteWaypoint(waypointId: string, workId: string) {
    await deleteWaypoint(waypointId);
    await loadWorks();
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint deleted');
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

  // Container classes based on mode
  const containerClass = isSidePanel
    ? 'w-full h-screen flex flex-col bg-surface text-text relative'
    : 'w-[400px] min-h-[200px] max-h-[600px] flex flex-col bg-surface text-text relative';

  return (
    <div
      class={containerClass}
      role="application"
      aria-label="Waypoint - Media Progress Tracker"
    >
      {/* Skip to main content link for screen readers */}
      <a href="#main-content" class="skip-link">
        Skip to content
      </a>

      {/* Live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
        id="announcer"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {view.type === 'list' && (
        <div class="animate-fade-in flex flex-col flex-1 min-h-0">
          <Header
            onAdd={() => setView({ type: 'add' })}
            onSettings={openOptions}
            isSidePanel={isSidePanel}
          />

          {currentTab && (
            <QuickActionBar
              currentTab={currentTab}
              matchedWork={matchedWork}
              onQuickUpdate={handleQuickUpdate}
              onQuickAdd={handleQuickAdd}
            />
          )}

          {!loading && works.length > 0 && (
            <div class="px-4 pt-3 pb-2 border-b border-border space-y-2" role="search">
              {/* Search and controls row */}
              <div class="flex gap-2">
                <label class="sr-only" htmlFor="search-works">Search works</label>
                <input
                  id="search-works"
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                  placeholder="Search... (/)"
                  aria-label="Search works (press / to focus)"
                  class="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  class={`px-2 py-1.5 rounded-md border transition-colors flex items-center gap-1 ${
                    showFilters || hasFilters
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border hover:bg-surface-secondary text-text-secondary'
                  }`}
                  aria-label={`${showFilters ? 'Hide' : 'Show'} filters${hasFilters ? ' (filters active)' : ''}`}
                  aria-expanded={showFilters}
                  aria-controls="filter-panel"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {hasFilters && <span class="text-xs font-medium" aria-hidden="true">•</span>}
                </button>
                <button
                  onClick={() => setCompactMode(!compactMode)}
                  class={`p-1.5 rounded-md border transition-colors ${
                    compactMode
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border hover:bg-surface-secondary text-text-secondary'
                  }`}
                  aria-label={compactMode ? 'Switch to normal view' : 'Switch to compact view'}
                  aria-pressed={compactMode}
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    {compactMode ? (
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    ) : (
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Collapsible filter chips */}
              {showFilters && (
                <div id="filter-panel" class="space-y-2 pt-1" role="group" aria-label="Filter options">
                  {/* Status chips */}
                  <div class="flex flex-wrap gap-1" role="radiogroup" aria-label="Filter by status">
                    <span class="text-[10px] text-text-tertiary uppercase tracking-wide mr-1 self-center" id="status-label">Status:</span>
                    {(['all', 'reading', 'watching', 'paused', 'completed', 'dropped'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        role="radio"
                        aria-checked={statusFilter === status}
                        class={`px-2 py-0.5 text-xs rounded-full transition-colors capitalize ${
                          statusFilter === status
                            ? 'bg-accent text-white'
                            : 'bg-surface-tertiary text-text-secondary hover:bg-border'
                        }`}
                      >
                        {status === 'all' ? 'All' : status}
                      </button>
                    ))}
                  </div>
                  {/* Type chips */}
                  <div class="flex flex-wrap gap-1" role="radiogroup" aria-label="Filter by type">
                    <span class="text-[10px] text-text-tertiary uppercase tracking-wide mr-1 self-center">Type:</span>
                    {(['all', 'manga', 'anime', 'novel', 'webcomic'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        role="radio"
                        aria-checked={typeFilter === type}
                        class={`px-2 py-0.5 text-xs rounded-full transition-colors capitalize ${
                          typeFilter === type
                            ? 'bg-accent text-white'
                            : 'bg-surface-tertiary text-text-secondary hover:bg-border'
                        }`}
                      >
                        {type === 'all' ? 'All' : type}
                      </button>
                    ))}
                  </div>
                  {/* Sort chips */}
                  <div class="flex flex-wrap gap-1" role="radiogroup" aria-label="Sort by">
                    <span class="text-[10px] text-text-tertiary uppercase tracking-wide mr-1 self-center">Sort:</span>
                    {([
                      { value: 'updated', label: 'Updated' },
                      { value: 'title', label: 'Title' },
                      { value: 'created', label: 'Added' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        role="radio"
                        aria-checked={sortBy === opt.value}
                        class={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          sortBy === opt.value
                            ? 'bg-accent text-white'
                            : 'bg-surface-tertiary text-text-secondary hover:bg-border'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results count */}
              <div class="flex items-center justify-between text-xs text-text-tertiary">
                <span>{filteredWorks.length} of {works.length} works</span>
                {hasFilters && !showFilters && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    class="text-accent hover:text-accent-hover"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          <main id="main-content" class="flex-1 overflow-y-auto p-4" aria-label="Works list">
            {loading ? (
              <div aria-busy="true" aria-label="Loading works">
                <SkeletonLoader count={4} compact={compactMode} />
              </div>
            ) : works.length === 0 ? (
              <EmptyState onAdd={() => setView({ type: 'add' })} />
            ) : filteredWorks.length === 0 ? (
              <div class="text-center py-8" role="status">
                <p class="text-text-secondary text-sm">No matching works</p>
                {hasFilters && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    class="text-accent hover:text-accent-hover text-sm mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <WorkList
                works={filteredWorks}
                selectedIndex={selectedIndex}
                compact={compactMode}
                onSelect={(work) => setView({ type: 'detail', work })}
                onStatusChange={handleQuickStatusChange}
              />
            )}
          </main>
        </div>
      )}

      {view.type === 'add' && (
        <div class="animate-slide-up flex flex-col flex-1">
          <AddWorkForm
            onSubmit={handleAddWork}
            onCancel={() => setView({ type: 'list' })}
          />
        </div>
      )}

      {view.type === 'detail' && (
        <div class="animate-slide-in-right flex flex-col flex-1">
          <WorkDetail
            work={view.work}
            onBack={() => setView({ type: 'list' })}
            onEdit={() => setView({ type: 'edit', work: view.work })}
            onDelete={() => handleDeleteWork(view.work.id)}
            onSetWaypoint={(data) => handleSetWaypoint(view.work.id, data)}
            onEditWaypoint={(waypoint) =>
              setView({ type: 'edit-waypoint', work: view.work, waypoint })
            }
          />
        </div>
      )}

      {view.type === 'edit' && (
        <div class="animate-scale-in flex flex-col flex-1">
          <EditWorkForm
            work={view.work}
            onSubmit={(data) => handleUpdateWork(view.work.id, data)}
            onCancel={() => setView({ type: 'detail', work: view.work })}
          />
        </div>
      )}

      {view.type === 'edit-waypoint' && (
        <div class="animate-scale-in flex flex-col flex-1">
          <EditWaypointForm
            waypoint={view.waypoint}
            work={view.work}
            onSubmit={(data) =>
              handleUpdateWaypoint(view.waypoint.id, view.work.id, data)
            }
            onDelete={() => handleDeleteWaypoint(view.waypoint.id, view.work.id)}
            onCancel={() => setView({ type: 'detail', work: view.work })}
          />
        </div>
      )}
    </div>
  );
}
