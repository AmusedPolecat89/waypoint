interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div class="text-center py-6 px-4" role="region" aria-label="Getting started">
      {/* Simple illustration */}
      <div class="mb-4 flex justify-center">
        <div class="w-20 h-20 rounded-full bg-accent-subtle flex items-center justify-center">
          <svg class="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>

      <h3 class="text-base font-medium text-text mb-1">Welcome to Waypoint</h3>
      <p class="text-text-secondary text-sm mb-4">
        Track your progress in manga, anime, novels, and webcomics.
      </p>

      {/* Feature hints */}
      <div class="text-left bg-surface-secondary rounded-lg p-3 mb-4 space-y-2">
        <div class="flex items-start gap-2">
          <span class="text-accent mt-0.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <p class="text-xs text-text-secondary">
            <span class="font-medium text-text">Quick Add</span> — Click the + bar above to add from the current tab
          </p>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-accent mt-0.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </span>
          <p class="text-xs text-text-secondary">
            <span class="font-medium text-text">Resume</span> — Jump back to where you left off with one click
          </p>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-accent mt-0.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </span>
          <p class="text-xs text-text-secondary">
            <span class="font-medium text-text">Right-click</span> — Add or update from any page via context menu
          </p>
        </div>
      </div>

      <button
        onClick={onAdd}
        class="w-full px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-all"
      >
        Add your first work
      </button>
    </div>
  );
}
