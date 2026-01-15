import { useState } from 'preact/hooks';
import type { WorkStatus } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import type { WorkWithProgress } from '../types';
import { STATUS_OPTIONS } from '../constants';

interface WorkListProps {
  works: WorkWithProgress[];
  selectedIndex: number;
  onSelect: (work: WorkWithProgress) => void;
  onStatusChange: (id: string, status: WorkStatus) => void;
}

export function WorkList({
  works,
  selectedIndex,
  onSelect,
  onStatusChange,
}: WorkListProps) {
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

interface WorkItemProps {
  work: WorkWithProgress;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: WorkStatus) => void;
}

function WorkItem({
  work,
  isSelected,
  onSelect,
  onStatusChange,
}: WorkItemProps) {
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
