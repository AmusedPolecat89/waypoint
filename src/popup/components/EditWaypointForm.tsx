import { useState, useRef } from 'preact/hooks';
import type { Work, Waypoint } from '@/lib/types';
import { useFocusTrap } from '../hooks';

interface EditWaypointFormProps {
  waypoint: Waypoint;
  work: Work;
  onSubmit: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function EditWaypointForm({
  waypoint,
  work,
  onSubmit,
  onDelete,
  onCancel,
}: EditWaypointFormProps) {
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
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const secondaryParsed = parseInt(secondaryValue, 10);
    const hasSecondary = !isNaN(secondaryParsed) && secondaryParsed >= 0;

    onSubmit({
      [progressField]: numValue,
      [secondaryField]: hasSecondary ? secondaryParsed : undefined,
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
  }

  return (
    <div ref={containerRef} class="flex flex-col h-full">
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
