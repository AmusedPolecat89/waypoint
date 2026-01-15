interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
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
