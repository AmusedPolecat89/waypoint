import type { WorkWithProgress } from '../types';

interface QuickActionBarProps {
  currentTab: { url: string; title: string };
  matchedWork: WorkWithProgress | null;
  onQuickUpdate: () => void;
  onQuickAdd: () => void;
}

export function QuickActionBar({
  currentTab,
  matchedWork,
  onQuickUpdate,
  onQuickAdd,
}: QuickActionBarProps) {
  // Clean up title for display
  let cleanTitle = currentTab.title;
  const suffixPatterns = [/ [-–—|] .+$/, / :: .+$/, /\s*\(.+\)$/];
  for (const pattern of suffixPatterns) {
    cleanTitle = cleanTitle.replace(pattern, '');
  }
  cleanTitle = cleanTitle.trim();
  if (cleanTitle.length > 40) {
    cleanTitle = cleanTitle.substring(0, 40) + '...';
  }

  // If we have a matched work, show update UI
  if (matchedWork) {
    return (
      <div class="px-4 py-2 bg-accent-subtle border-b border-accent/20">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-accent font-medium truncate">
              {matchedWork.title}
            </p>
            <p class="text-xs text-text-secondary">
              {matchedWork.progress ?? 'No progress yet'}
            </p>
          </div>
          <button
            onClick={onQuickUpdate}
            class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    );
  }

  // Otherwise show add UI
  return (
    <div class="px-4 py-2 bg-surface-secondary border-b border-border">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p class="text-xs text-text-secondary truncate">{cleanTitle}</p>
        </div>
        <button
          onClick={onQuickAdd}
          class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          Quick Add
        </button>
      </div>
    </div>
  );
}
