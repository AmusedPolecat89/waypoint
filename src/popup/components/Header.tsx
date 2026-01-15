interface HeaderProps {
  onAdd: () => void;
  onSettings: () => void;
}

export function Header({ onAdd, onSettings }: HeaderProps) {
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
