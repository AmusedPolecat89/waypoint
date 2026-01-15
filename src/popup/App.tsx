import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { Work, Waypoint, MediaType, WorkStatus } from '@/lib/types';
import {
  getWorks,
  getLatestWaypoint,
  getWaypoints,
  createWork,
  updateWork,
  deleteWork,
  createWaypoint,
  updateWaypoint,
  deleteWaypoint,
} from '@/lib/storage';
import { formatProgress, formatRelativeTime } from '@/lib/utils';

interface WorkWithProgress extends Work {
  progress?: string;
  latestWaypoint?: Waypoint;
}

type View =
  | { type: 'list' }
  | { type: 'add' }
  | { type: 'detail'; work: WorkWithProgress }
  | { type: 'edit'; work: WorkWithProgress }
  | { type: 'edit-waypoint'; work: WorkWithProgress; waypoint: Waypoint };

type SortOption = 'updated' | 'title' | 'created';

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

  useEffect(() => {
    loadWorks();
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

  async function handleAddWork(data: { title: string; type: MediaType }) {
    await createWork({
      title: data.title,
      type: data.type,
      status: data.type === 'anime' ? 'watching' : 'reading',
    });
    await loadWorks();
    setView({ type: 'list' });
  }

  async function handleUpdateWork(
    id: string,
    data: Partial<Pick<Work, 'title' | 'type' | 'status'>>
  ) {
    await updateWork(id, data);
    await loadWorks();
    setView({ type: 'list' });
  }

  async function handleDeleteWork(id: string) {
    await deleteWork(id);
    await loadWorks();
    setView({ type: 'list' });
  }

  async function handleQuickStatusChange(id: string, status: WorkStatus) {
    await updateWork(id, { status });
    await loadWorks();
  }

  async function handleSetWaypoint(
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) {
    await createWaypoint({
      workId,
      ...data,
    });
    await loadWorks();
    // Refresh detail view with updated work
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
  }

  async function handleUpdateWaypoint(
    waypointId: string,
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'note' | 'sourceUrl'>>
  ) {
    await updateWaypoint(waypointId, data);
    await loadWorks();
    // Refresh detail view with updated work
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
  }

  async function handleDeleteWaypoint(waypointId: string, workId: string) {
    await deleteWaypoint(waypointId);
    await loadWorks();
    // Refresh detail view with updated work
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
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div class="w-80 min-h-[200px] max-h-[500px] flex flex-col bg-surface text-text">
      {view.type === 'list' && (
        <>
          <Header
            onAdd={() => setView({ type: 'add' })}
            onSettings={openOptions}
          />
          {/* Search and Filters - only show when there are works */}
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

function Header({
  onAdd,
  onSettings,
}: {
  onAdd: () => void;
  onSettings: () => void;
}) {
  return (
    <header class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <h1 class="text-base font-medium">Waypoint</h1>
      <div class="flex items-center gap-3">
        <button
          onClick={onAdd}
          class="text-accent hover:text-accent-hover text-sm font-medium"
        >
          + Add
        </button>
        <button
          onClick={onSettings}
          class="text-text-secondary hover:text-text text-sm"
          aria-label="Settings"
        >
          Settings
        </button>
      </div>
    </header>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div class="text-center py-8">
      <p class="text-text-secondary text-sm mb-2">No waypoints yet</p>
      <p class="text-text-tertiary text-xs mb-4">
        Add a work to start tracking your progress.
      </p>
      <button
        onClick={onAdd}
        class="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors"
      >
        Add your first work
      </button>
    </div>
  );
}

function WorkList({
  works,
  selectedIndex,
  onSelect,
  onStatusChange,
}: {
  works: WorkWithProgress[];
  selectedIndex: number;
  onSelect: (work: WorkWithProgress) => void;
  onStatusChange: (id: string, status: WorkStatus) => void;
}) {
  return (
    <ul class="space-y-2">
      {works.map((work, index) => (
        <WorkItem
          key={work.id}
          work={work}
          isSelected={index === selectedIndex}
          onSelect={() => onSelect(work)}
          onStatusChange={(status) => onStatusChange(work.id, status)}
        />
      ))}
    </ul>
  );
}

function WorkItem({
  work,
  isSelected,
  onSelect,
  onStatusChange,
}: {
  work: WorkWithProgress;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: WorkStatus) => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  function handleStatusClick(e: Event) {
    e.stopPropagation();
    setShowStatusMenu(!showStatusMenu);
  }

  function handleStatusSelect(status: WorkStatus) {
    onStatusChange(status);
    setShowStatusMenu(false);
  }

  return (
    <li class="relative">
      <button
        onClick={onSelect}
        class={`w-full text-left p-3 bg-surface-secondary rounded-md hover:bg-surface-tertiary transition-colors ${
          isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''
        }`}
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-medium truncate">{work.title}</h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-text-secondary">
                {work.progress ?? 'No progress'}
              </span>
              <button
                onClick={handleStatusClick}
                class="text-xs px-1.5 py-0.5 bg-surface-tertiary rounded capitalize hover:bg-border transition-colors"
              >
                {work.status}
              </button>
            </div>
          </div>
          <span class="text-xs text-text-tertiary whitespace-nowrap">
            {formatRelativeTime(work.updatedAt)}
          </span>
        </div>
      </button>
      {showStatusMenu && (
        <div class="absolute left-0 right-0 top-full mt-1 z-10 bg-surface border border-border rounded-md shadow-lg py-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusSelect(opt.value);
              }}
              class={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-secondary ${
                work.status === opt.value ? 'text-accent font-medium' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'manga', label: 'Manga' },
  { value: 'novel', label: 'Novel' },
  { value: 'webcomic', label: 'Webcomic' },
  { value: 'anime', label: 'Anime' },
];

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'watching', label: 'Watching' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];

function AddWorkForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; type: MediaType }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('manga');

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type });
  }

  return (
    <form onSubmit={handleSubmit} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Add Work</h2>
        <button
          type="submit"
          disabled={!title.trim()}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Enter title..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <div class="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                class={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  type === mt.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

function EditWorkForm({
  work,
  onSubmit,
  onCancel,
}: {
  work: Work;
  onSubmit: (data: Partial<Pick<Work, 'title' | 'type' | 'status'>>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(work.title);
  const [type, setType] = useState<MediaType>(work.type);
  const [status, setStatus] = useState<WorkStatus>(work.status);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, status });
  }

  return (
    <form onSubmit={handleSubmit} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Edit Work</h2>
        <button
          type="submit"
          disabled={!title.trim()}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <div class="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                class={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  type === mt.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus((e.target as HTMLSelectElement).value as WorkStatus)
            }
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}

function WorkDetail({
  work,
  onBack,
  onEdit,
  onDelete,
  onSetWaypoint,
  onEditWaypoint,
}: {
  work: WorkWithProgress;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaypoint: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onEditWaypoint: (waypoint: Waypoint) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [waypointValue, setWaypointValue] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Waypoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isAnime = work.type === 'anime';
  const progressField = isAnime ? 'episode' : 'chapter';
  const progressLabel = isAnime ? 'Episode' : 'Chapter';
  const secondaryField = isAnime ? 'timestamp' : 'page';
  const secondaryLabel = isAnime ? 'Timestamp (seconds)' : 'Page';
  const hasSourceUrl = work.latestWaypoint?.sourceUrl;

  async function loadHistory() {
    if (history.length > 0) {
      setShowHistory(!showHistory);
      return;
    }
    setLoadingHistory(true);
    const waypoints = await getWaypoints(work.id);
    setHistory(waypoints);
    setShowHistory(true);
    setLoadingHistory(false);
  }

  function handleSetWaypoint(e: Event) {
    e.preventDefault();
    const value = parseInt(waypointValue, 10);
    if (isNaN(value) || value < 0) return;

    const secondaryParsed = parseInt(secondaryValue, 10);
    const hasSecondary = !isNaN(secondaryParsed) && secondaryParsed >= 0;

    onSetWaypoint({
      [progressField]: value,
      ...(hasSecondary ? { [secondaryField]: secondaryParsed } : {}),
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setWaypointValue('');
    setSecondaryValue('');
    setNote('');
    setSourceUrl('');
  }

  function handleResume() {
    if (hasSourceUrl) {
      chrome.tabs.create({ url: work.latestWaypoint!.sourceUrl });
    }
  }

  return (
    <div class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          class="text-text-secondary hover:text-text text-sm"
        >
          ← Back
        </button>
        <button
          onClick={onEdit}
          class="text-accent hover:text-accent-hover text-sm font-medium"
        >
          Edit
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Work Info */}
        <div>
          <h2 class="text-lg font-medium">{work.title}</h2>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 bg-surface-tertiary rounded capitalize">
              {work.type}
            </span>
            <span class="text-xs px-2 py-0.5 bg-surface-tertiary rounded capitalize">
              {work.status}
            </span>
          </div>
        </div>

        {/* Current Progress */}
        <div class="p-3 bg-surface-secondary rounded-md">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-text-secondary mb-1">Current Progress</p>
              <p class="text-sm font-medium">
                {work.progress ?? 'No waypoint set'}
              </p>
              {work.latestWaypoint?.note && (
                <p class="text-xs text-text-tertiary mt-1">
                  {work.latestWaypoint.note}
                </p>
              )}
            </div>
            {hasSourceUrl && (
              <button
                onClick={handleResume}
                class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                Resume
              </button>
            )}
          </div>
          {hasSourceUrl && (
            <p class="text-xs text-text-tertiary mt-2 truncate">
              {work.latestWaypoint!.sourceUrl}
            </p>
          )}
        </div>

        {/* Set Waypoint Form */}
        <form onSubmit={handleSetWaypoint} class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-sm font-medium mb-1">
                {progressLabel}
              </label>
              <input
                type="number"
                min="0"
                value={waypointValue}
                onInput={(e) =>
                  setWaypointValue((e.target as HTMLInputElement).value)
                }
                placeholder={`${progressLabel}...`}
                class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                {secondaryLabel} <span class="text-text-tertiary font-normal text-xs">(opt)</span>
              </label>
              <input
                type="number"
                min="0"
                value={secondaryValue}
                onInput={(e) =>
                  setSecondaryValue((e.target as HTMLInputElement).value)
                }
                placeholder={isAnime ? 'Seconds...' : 'Page...'}
                class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm font-medium">
                Source URL <span class="text-text-tertiary font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.url) setSourceUrl(tab.url);
                }}
                class="text-xs text-accent hover:text-accent-hover"
              >
                Use Current Tab
              </button>
            </div>
            <input
              type="url"
              value={sourceUrl}
              onInput={(e) => setSourceUrl((e.target as HTMLInputElement).value)}
              placeholder="https://..."
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Note <span class="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onInput={(e) => setNote((e.target as HTMLInputElement).value)}
              placeholder="Add a note..."
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={!waypointValue}
            class="w-full px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Waypoint
          </button>
        </form>

        {/* History Section */}
        <div class="pt-4 border-t border-border">
          <button
            onClick={loadHistory}
            class="flex items-center justify-between w-full text-sm font-medium"
          >
            <span>History</span>
            <span class="text-text-tertiary">
              {loadingHistory ? '...' : showHistory ? '−' : '+'}
            </span>
          </button>
          {showHistory && history.length > 0 && (
            <ul class="mt-3 space-y-2">
              {history.map((wp) => (
                <li
                  key={wp.id}
                  class="p-2 bg-surface-secondary rounded text-xs"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{formatProgress(wp)}</span>
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => onEditWaypoint(wp)}
                        class="text-text-tertiary hover:text-accent"
                      >
                        Edit
                      </button>
                      <span class="text-text-tertiary">
                        {formatRelativeTime(wp.createdAt)}
                      </span>
                    </div>
                  </div>
                  {wp.note && (
                    <p class="text-text-tertiary mt-1">{wp.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showHistory && history.length === 0 && (
            <p class="mt-3 text-xs text-text-tertiary">No history yet</p>
          )}
        </div>

        {/* Delete Section */}
        <div class="pt-4 border-t border-border">
          {showDeleteConfirm ? (
            <div class="space-y-2">
              <p class="text-sm text-text-secondary">
                Delete "{work.title}"? This cannot be undone.
              </p>
              <div class="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  class="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  class="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              class="text-sm text-red-600 hover:text-red-700"
            >
              Delete this work
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditWaypointForm({
  waypoint,
  work,
  onSubmit,
  onDelete,
  onCancel,
}: {
  waypoint: Waypoint;
  work: Work;
  onSubmit: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const isAnime = work.type === 'anime';
  const progressField = isAnime ? 'episode' : 'chapter';
  const progressLabel = isAnime ? 'Episode' : 'Chapter';
  const secondaryField = isAnime ? 'timestamp' : 'page';
  const secondaryLabel = isAnime ? 'Timestamp (seconds)' : 'Page';
  const initialValue = waypoint[progressField]?.toString() ?? '';
  const initialSecondary = waypoint[secondaryField]?.toString() ?? '';

  const [value, setValue] = useState(initialValue);
  const [secondaryValue, setSecondaryValue] = useState(initialSecondary);
  const [note, setNote] = useState(waypoint.note ?? '');
  const [sourceUrl, setSourceUrl] = useState(waypoint.sourceUrl ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const secondaryParsed = parseInt(secondaryValue, 10);
    const hasSecondary = !isNaN(secondaryParsed) && secondaryParsed >= 0;

    onSubmit({
      [progressField]: numValue,
      // Clear secondary if empty, otherwise set it
      [secondaryField]: hasSecondary ? secondaryParsed : undefined,
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
  }

  return (
    <div class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Edit Waypoint</h2>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <form onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p class="text-xs text-text-tertiary mb-3">
            Editing waypoint for "{work.title}"
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-sm font-medium mb-1">{progressLabel}</label>
            <input
              type="number"
              min="0"
              value={value}
              onInput={(e) => setValue((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              {secondaryLabel} <span class="text-text-tertiary font-normal text-xs">(opt)</span>
            </label>
            <input
              type="number"
              min="0"
              value={secondaryValue}
              onInput={(e) => setSecondaryValue((e.target as HTMLInputElement).value)}
              placeholder={isAnime ? 'Seconds...' : 'Page...'}
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-medium">
              Source URL <span class="text-text-tertiary font-normal">(optional)</span>
            </label>
            <button
              type="button"
              onClick={async () => {
                const [tab] = await chrome.tabs.query({
                  active: true,
                  currentWindow: true,
                });
                if (tab?.url) setSourceUrl(tab.url);
              }}
              class="text-xs text-accent hover:text-accent-hover"
            >
              Use Current Tab
            </button>
          </div>
          <input
            type="url"
            value={sourceUrl}
            onInput={(e) => setSourceUrl((e.target as HTMLInputElement).value)}
            placeholder="https://..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">
            Note <span class="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onInput={(e) => setNote((e.target as HTMLInputElement).value)}
            placeholder="Add a note..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        {/* Delete Section */}
        <div class="pt-4 border-t border-border">
          {showDeleteConfirm ? (
            <div class="space-y-2">
              <p class="text-sm text-text-secondary">
                Delete this waypoint? This cannot be undone.
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  class="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  class="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              class="text-sm text-red-600 hover:text-red-700"
            >
              Delete this waypoint
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
