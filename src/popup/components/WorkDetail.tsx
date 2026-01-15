import { useState } from 'preact/hooks';
import type { Waypoint } from '@/lib/types';
import { getWaypoints } from '@/lib/storage';
import { formatProgress, formatRelativeTime } from '@/lib/utils';
import type { WorkWithProgress } from '../types';

interface WorkDetailProps {
  work: WorkWithProgress;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaypoint: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onEditWaypoint: (waypoint: Waypoint) => void;
}

export function WorkDetail({
  work,
  onBack,
  onEdit,
  onDelete,
  onSetWaypoint,
  onEditWaypoint,
}: WorkDetailProps) {
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
