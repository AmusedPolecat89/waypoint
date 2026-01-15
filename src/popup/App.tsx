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
import { formatProgress } from '@/lib/utils';
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
} from './components';

export function App() {
  const [works, setWorks] = useState<WorkWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: 'list' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [selectedIndex, setSelectedIndex] = useState(-1);
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
  useEffect(() => {
    if (!currentTab?.url || works.length === 0) {
      setMatchedWork(null);
      return;
    }

    const currentDomain = getDomain(currentTab.url);

    const matched = works.find((work) => {
      if (!work.latestWaypoint?.sourceUrl) return false;
      const workDomain = getDomain(work.latestWaypoint.sourceUrl);

      if (work.latestWaypoint.sourceUrl === currentTab.url) return true;
      if (currentDomain === workDomain) {
        const currentPath = new URL(currentTab.url).pathname.toLowerCase();
        const workPath = new URL(work.latestWaypoint.sourceUrl).pathname.toLowerCase();
        const currentParts = currentPath.split('/').filter(Boolean);
        const workParts = workPath.split('/').filter(Boolean);
        if (currentParts.length >= 2 && workParts.length >= 2) {
          return currentParts[0] === workParts[0] && currentParts[1] === workParts[1];
        }
      }
      return false;
    });

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

  // Quick update for matched work
  async function handleQuickUpdate() {
    if (!matchedWork || !currentTab) return;

    const progress = extractProgress(currentTab.url, currentTab.title, matchedWork.type);
    const isAnime = matchedWork.type === 'anime';

    await createWaypoint({
      workId: matchedWork.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter || (isAnime ? undefined : matchedWork.latestWaypoint?.chapter),
      episode: progress.episode || (isAnime ? matchedWork.latestWaypoint?.episode : undefined),
    });
    await loadWorks();
    addToast(`Updated "${matchedWork.title}"`);
  }

  // Quick add from current tab
  async function handleQuickAdd() {
    if (!currentTab) return;

    let pageContent = '';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        pageContent = await extractPageContent(tab.id);
      }
    } catch {
      // Continue without page content
    }

    const type = detectMediaType(currentTab.url, currentTab.title, pageContent);
    const title = extractTitle(currentTab.title, currentTab.url);
    const progress = extractProgress(currentTab.url, currentTab.title, type);
    const status = type === 'anime' ? 'watching' : 'reading';

    const work = await createWork({ title, type, status });
    await createWaypoint({
      workId: work.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter,
      episode: progress.episode,
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

  return (
    <div class="w-80 min-h-[200px] max-h-[500px] flex flex-col bg-surface text-text relative">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {view.type === 'list' && (
        <>
          <Header
            onAdd={() => setView({ type: 'add' })}
            onSettings={openOptions}
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
            <div class="px-4 pt-3 pb-2 border-b border-border space-y-2">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                placeholder="Search works... (/ to focus)"
                class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
              <div class="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter((e.target as HTMLSelectElement).value as WorkStatus | 'all')
                  }
                  class="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="all">All Status</option>
                  <option value="reading">Reading</option>
                  <option value="watching">Watching</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter((e.target as HTMLSelectElement).value as MediaType | 'all')
                  }
                  class="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="all">All Types</option>
                  <option value="manga">Manga</option>
                  <option value="novel">Novel</option>
                  <option value="webcomic">Webcomic</option>
                  <option value="anime">Anime</option>
                </select>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-tertiary">
                  {filteredWorks.length} of {works.length} works
                </span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy((e.target as HTMLSelectElement).value as SortOption)
                  }
                  class="px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="title">Title A-Z</option>
                  <option value="created">Recently Added</option>
                </select>
              </div>
            </div>
          )}

          <main class="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p class="text-text-secondary text-sm">Loading...</p>
            ) : works.length === 0 ? (
              <EmptyState onAdd={() => setView({ type: 'add' })} />
            ) : filteredWorks.length === 0 ? (
              <div class="text-center py-8">
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
                onSelect={(work) => setView({ type: 'detail', work })}
                onStatusChange={handleQuickStatusChange}
              />
            )}
          </main>
        </>
      )}

      {view.type === 'add' && (
        <AddWorkForm
          onSubmit={handleAddWork}
          onCancel={() => setView({ type: 'list' })}
        />
      )}

      {view.type === 'detail' && (
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
      )}

      {view.type === 'edit' && (
        <EditWorkForm
          work={view.work}
          onSubmit={(data) => handleUpdateWork(view.work.id, data)}
          onCancel={() => setView({ type: 'detail', work: view.work })}
        />
      )}

      {view.type === 'edit-waypoint' && (
        <EditWaypointForm
          waypoint={view.waypoint}
          work={view.work}
          onSubmit={(data) =>
            handleUpdateWaypoint(view.waypoint.id, view.work.id, data)
          }
          onDelete={() => handleDeleteWaypoint(view.waypoint.id, view.work.id)}
          onCancel={() => setView({ type: 'detail', work: view.work })}
        />
      )}
    </div>
  );
}
