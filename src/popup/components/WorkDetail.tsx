import { useState, useEffect } from 'preact/hooks';
import type { Waypoint, MediaType, WorkStatus } from '@/lib/types';
import { getWaypoints, getRecentSources } from '@/lib/storage';
import { formatProgress, formatRelativeTime } from '@/lib/utils';
import { getThumbnailWithFallback, PLACEHOLDER_THUMBNAIL } from '@/lib/metadata';
import type { WorkWithProgress } from '../types';

interface SourceInfo {
  url: string;
  domain: string;
  lastUsed: number;
}

// Type badge colors (matching WorkList)
const TYPE_COLORS: Record<MediaType, { bg: string; text: string }> = {
  anime: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  manga: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  webcomic: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  novel: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
};

// Status colors (matching WorkList)
const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string }> = {
  reading: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  watching: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  paused: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  dropped: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

// External source link helper
function ExternalLink({ source, id, type }: { source: string; id: string; type: MediaType }) {
  const links: Record<string, { url: string; label: string }> = {
    anilist: {
      url: `https://anilist.co/${type === 'anime' ? 'anime' : 'manga'}/${id}`,
      label: 'AniList',
    },
    mal: {
      url: `https://myanimelist.net/${type === 'anime' ? 'anime' : 'manga'}/${id}`,
      label: 'MyAnimeList',
    },
    mangadex: {
      url: `https://mangadex.org/title/${id}`,
      label: 'MangaDex',
    },
    openlibrary: {
      url: `https://openlibrary.org${id}`,
      label: 'Open Library',
    },
  };

  const link = links[source];
  if (!link) return null;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-accent transition-colors"
    >
      View on {link.label} →
    </a>
  );
}

interface WorkDetailProps {
  work: WorkWithProgress;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaypoint: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'issue' | 'volume' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
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
  const [volumeValue, setVolumeValue] = useState('');
  const [issueValue, setIssueValue] = useState('');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Waypoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentSources, setRecentSources] = useState<SourceInfo[]>([]);
  const [showSources, setShowSources] = useState(false);

  // Load recent sources on mount
  useEffect(() => {
    getRecentSources(work.id, 3).then(setRecentSources);
  }, [work.id]);

  const isAnime = work.type === 'anime';
  const isMangaLike = work.type === 'manga' || work.type === 'webcomic';
  const typeColor = TYPE_COLORS[work.type];
  const statusColor = STATUS_COLORS[work.status];
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

    const volumeParsed = parseInt(volumeValue, 10);
    const hasVolume = !isNaN(volumeParsed) && volumeParsed >= 0;

    const issueParsed = parseInt(issueValue, 10);
    const hasIssue = !isNaN(issueParsed) && issueParsed >= 0;

    onSetWaypoint({
      [progressField]: value,
      ...(hasSecondary ? { [secondaryField]: secondaryParsed } : {}),
      ...(hasVolume ? { volume: volumeParsed } : {}),
      ...(hasIssue ? { issue: issueParsed } : {}),
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setWaypointValue('');
    setSecondaryValue('');
    setVolumeValue('');
    setIssueValue('');
    setNote('');
    setSourceUrl('');
  }

  function handleResume() {
    if (hasSourceUrl) {
      chrome.tabs.create({ url: work.latestWaypoint!.sourceUrl });
    }
  }

  async function handleCopyProgress() {
    const text = `${work.title} - ${work.progress ?? 'No progress'}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* Work Info - Header with Thumbnail */}
        <div class="pb-3 border-b border-border">
          <div class="flex gap-4">
            {/* Thumbnail with graceful fallback */}
            <img
              src={getThumbnailWithFallback(work.thumbnailUrl)}
              alt={`Cover for ${work.title}`}
              class="w-20 h-28 object-cover rounded-lg shrink-0 bg-surface-tertiary shadow-sm"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src !== PLACEHOLDER_THUMBNAIL) {
                  img.src = PLACEHOLDER_THUMBNAIL;
                }
              }}
            />

            {/* Info */}
            <div class="flex-1 min-w-0">
              <div class="flex items-start gap-2 mb-2">
                <span class={`text-xs px-2 py-0.5 rounded font-medium ${typeColor.bg} ${typeColor.text}`}>
                  {work.type}
                </span>
                <span class={`text-xs px-2 py-0.5 rounded font-medium capitalize ${statusColor.bg} ${statusColor.text}`}>
                  {work.status}
                </span>
              </div>
              <h2 class="text-lg font-semibold leading-tight line-clamp-2">{work.title}</h2>
              <p class="text-xs text-text-secondary mt-1">
                Last updated {formatRelativeTime(work.updatedAt)}
              </p>
              {work.externalSource && work.externalId && (
                <p class="text-xs text-text-tertiary mt-1">
                  <ExternalLink source={work.externalSource} id={work.externalId} type={work.type} />
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Progress Card */}
        <div class="p-4 bg-surface-secondary rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Current Waypoint</span>
          </div>
          <p class="text-lg font-semibold">
            {work.progress ?? 'No waypoint set'}
          </p>
          {work.latestWaypoint?.note && (
            <p class="text-sm text-text-secondary mt-1 italic">
              "{work.latestWaypoint.note}"
            </p>
          )}
          {hasSourceUrl && (
            <p class="text-xs text-text-tertiary mt-2 truncate">
              {work.latestWaypoint!.sourceUrl}
            </p>
          )}
        </div>

        {/* Quick Actions Row */}
        <div class="space-y-2">
          <div class="flex gap-2">
            {hasSourceUrl && (
              <div class="flex-1 flex">
                <button
                  onClick={handleResume}
                  class={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent text-white text-sm font-medium hover:bg-accent-hover active:scale-[0.98] transition-all ${
                    recentSources.length > 1 ? 'rounded-l-lg' : 'rounded-lg'
                  }`}
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resume
                </button>
                {recentSources.length > 1 && (
                  <button
                    onClick={() => setShowSources(!showSources)}
                    class="px-2 py-2.5 bg-accent text-white text-sm font-medium rounded-r-lg hover:bg-accent-hover active:scale-[0.98] transition-all border-l border-accent-hover"
                    title={`${recentSources.length - 1} backup source${recentSources.length > 2 ? 's' : ''} available`}
                  >
                    <svg class={`w-4 h-4 transition-transform ${showSources ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <button
              onClick={handleCopyProgress}
              class={`flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-secondary text-text text-sm font-medium rounded-lg hover:bg-surface-tertiary active:scale-[0.98] transition-all ${!hasSourceUrl ? 'flex-1' : ''}`}
            >
              {copied ? (
                <>
                  <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Alternate Sources Dropdown */}
          {showSources && recentSources.length > 1 && (
            <div class="p-2 bg-surface-secondary rounded-lg space-y-1 animate-slide-down">
              <p class="text-xs text-text-tertiary font-medium px-2 py-1">Resume from backup source:</p>
              {recentSources.slice(1).map((source) => (
                <button
                  key={source.domain}
                  onClick={() => chrome.tabs.create({ url: source.url })}
                  class="w-full flex items-center gap-2 px-2 py-2 text-left text-sm rounded-md hover:bg-surface-tertiary transition-colors group"
                >
                  <svg class="w-4 h-4 text-text-tertiary group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span class="flex-1 font-medium truncate">{source.domain}</span>
                  <span class="text-xs text-text-tertiary">{formatRelativeTime(source.lastUsed)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Set Waypoint Form */}
        <form onSubmit={handleSetWaypoint} class="space-y-3">
          {/* Volume & Issue row for manga-like content */}
          {isMangaLike && (
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-sm font-medium mb-1">
                  Volume <span class="text-text-tertiary font-normal text-xs">(opt)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={volumeValue}
                  onInput={(e) => setVolumeValue((e.target as HTMLInputElement).value)}
                  placeholder="Vol..."
                  class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">
                  Issue <span class="text-text-tertiary font-normal text-xs">(opt)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={issueValue}
                  onInput={(e) => setIssueValue((e.target as HTMLInputElement).value)}
                  placeholder="#..."
                  class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Chapter/Episode & Page/Timestamp row */}
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
              <div class="flex items-center justify-between mb-1">
                <label class="text-sm font-medium">
                  {secondaryLabel} <span class="text-text-tertiary font-normal text-xs">(opt)</span>
                </label>
                {isAnime && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        if (tab?.id) {
                          // Try all frames to find video (handles iframes)
                          const results = await chrome.scripting.executeScript({
                            target: { tabId: tab.id, allFrames: true },
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
                          // Find first frame with a timestamp
                          for (const result of results) {
                            if (result?.result !== undefined) {
                              setSecondaryValue(result.result.toString());
                              break;
                            }
                          }
                        }
                      } catch {
                        // Ignore errors
                      }
                    }}
                    class="text-xs text-accent hover:text-accent-hover"
                  >
                    Use Video Time
                  </button>
                )}
              </div>
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

        {/* History Timeline Section */}
        <div class="pt-4 border-t border-border">
          <button
            onClick={loadHistory}
            class="flex items-center justify-between w-full text-sm font-medium hover:text-accent transition-colors"
          >
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </div>
            <span class="text-text-tertiary">
              {loadingHistory ? (
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg class={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
          </button>

          {showHistory && history.length > 0 && (
            <div class="mt-4 relative">
              {/* Timeline vertical line */}
              <div class="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

              <ul class="space-y-0">
                {history.map((wp, index) => (
                  <li key={wp.id} class="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline dot */}
                    <div class={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                      index === 0
                        ? 'bg-accent border-accent'
                        : 'bg-surface border-border'
                    }`}>
                      {index === 0 && (
                        <div class="absolute inset-0 rounded-full bg-accent animate-ping opacity-25" />
                      )}
                    </div>

                    {/* Waypoint card */}
                    <div class="p-3 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors group">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium">{formatProgress(wp)}</p>
                          {wp.note && (
                            <p class="text-xs text-text-secondary mt-0.5 italic">"{wp.note}"</p>
                          )}
                          {wp.sourceUrl && (
                            <p class="text-xs text-text-tertiary mt-1 truncate">{wp.sourceUrl}</p>
                          )}
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                          <span class="text-xs text-text-tertiary">
                            {formatRelativeTime(wp.createdAt)}
                          </span>
                          <button
                            onClick={() => onEditWaypoint(wp)}
                            class="text-xs text-text-tertiary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showHistory && history.length === 0 && (
            <div class="mt-4 p-4 bg-surface-secondary rounded-lg text-center">
              <svg class="w-8 h-8 text-text-tertiary mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-text-tertiary">No history yet</p>
              <p class="text-xs text-text-tertiary mt-1">Add a waypoint to start tracking</p>
            </div>
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
