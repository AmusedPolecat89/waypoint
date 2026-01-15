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
      <div class="px-4 py-2 bg-accent-subtle border-b border-accent/20 animate-fade-in">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <svg class="w-3 h-3 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p class="text-xs text-accent font-medium truncate">
                {matchedWork.title}
              </p>
            </div>
            <p class="text-xs text-text-secondary ml-[18px]">
              {matchedWork.progress ?? 'No progress yet'}
            </p>
          </div>
          <button
            onClick={onQuickUpdate}
            class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover active:scale-95 transition-all flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update
          </button>
        </div>
      </div>
    );
  }

  // Otherwise show add UI
  return (
    <div class="px-4 py-2 bg-surface-secondary border-b border-border animate-fade-in">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1 flex items-center gap-1.5">
          <svg class="w-3 h-3 text-text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p class="text-xs text-text-secondary truncate">{cleanTitle}</p>
        </div>
        <button
          onClick={onQuickAdd}
          class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover active:scale-95 transition-all flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Quick Add
        </button>
      </div>
    </div>
  );
}
