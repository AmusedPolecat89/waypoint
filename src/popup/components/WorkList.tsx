import { useState } from 'preact/hooks';
import type { WorkStatus, MediaType } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { getThumbnailWithFallback, PLACEHOLDER_THUMBNAIL } from '@/lib/metadata';
import type { WorkWithProgress } from '../types';
import { STATUS_OPTIONS } from '../constants';

// Type badge colors
const TYPE_COLORS: Record<MediaType, { bg: string; text: string }> = {
  anime: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  manga: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  webcomic: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  novel: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
};

// Status colors
const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string }> = {
  reading: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  watching: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  paused: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  dropped: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

interface WorkListProps {
  works: WorkWithProgress[];
  selectedIndex: number;
  compact?: boolean;
  onSelect: (work: WorkWithProgress) => void;
  onStatusChange: (id: string, status: WorkStatus) => void;
}

export function WorkList({
  works,
  selectedIndex,
  compact = false,
  onSelect,
  onStatusChange,
}: WorkListProps) {
  return (
    <ul
      class={compact ? 'space-y-1' : 'space-y-2'}
      role="listbox"
      aria-label={`${works.length} works`}
      aria-activedescendant={selectedIndex >= 0 ? `work-${works[selectedIndex]?.id}` : undefined}
    >
      {works.map((work, index) => (
        <WorkItem
          key={work.id}
          work={work}
          isSelected={index === selectedIndex}
          compact={compact}
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
  compact: boolean;
  onSelect: () => void;
  onStatusChange: (status: WorkStatus) => void;
}

function WorkItem({
  work,
  isSelected,
  compact,
  onSelect,
  onStatusChange,
}: WorkItemProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const typeColor = TYPE_COLORS[work.type];
  const statusColor = STATUS_COLORS[work.status];

  function handleStatusClick(e: Event) {
    e.stopPropagation();
    setShowStatusMenu(!showStatusMenu);
  }

  function handleStatusSelect(status: WorkStatus) {
    onStatusChange(status);
    setShowStatusMenu(false);
  }

  return (
    <li
      id={`work-${work.id}`}
      class="relative group"
      role="option"
      aria-selected={isSelected}
    >
      <button
        onClick={onSelect}
        aria-label={`${work.title}, ${work.type}, ${work.status}, ${work.progress ?? 'no progress'}, updated ${formatRelativeTime(work.updatedAt)}`}
        class={`w-full text-left ${compact ? 'p-2' : 'p-3'} bg-surface-secondary rounded-lg
          hover:bg-surface-tertiary hover:shadow-md hover:scale-[1.01]
          active:scale-[0.99] transition-all duration-150 ease-out ${
          isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface shadow-md' : ''
        }`}
      >
        <div class="flex items-start gap-3">
          {/* Thumbnail with graceful fallback */}
          <img
            src={getThumbnailWithFallback(work.thumbnailUrl)}
            alt=""
            aria-hidden="true"
            class={`${compact ? 'w-8 h-12' : 'w-10 h-14'} object-cover rounded shrink-0 bg-surface-tertiary`}
            loading="lazy"
            onError={(e) => {
              // If image fails to load, use placeholder
              const img = e.currentTarget as HTMLImageElement;
              if (img.src !== PLACEHOLDER_THUMBNAIL) {
                img.src = PLACEHOLDER_THUMBNAIL;
              }
            }}
          />

          {/* Content */}
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${typeColor.bg} ${typeColor.text}`}
                  aria-hidden="true"
                >
                  {work.type}
                </span>
                <h3 class={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`}>{work.title}</h3>
              </div>
              <span
                class={`${compact ? 'text-[10px]' : 'text-xs'} text-text-tertiary whitespace-nowrap shrink-0`}
                aria-hidden="true"
              >
                {formatRelativeTime(work.updatedAt)}
              </span>
            </div>
            <div class={`flex items-center gap-2 ${compact ? 'mt-0.5' : 'mt-1'}`}>
              <span class={`${compact ? 'text-[10px]' : 'text-xs'} text-text-secondary`}>
                {work.progress ?? 'No progress'}
              </span>
              <button
                onClick={handleStatusClick}
                aria-label={`Change status, currently ${work.status}`}
                aria-haspopup="listbox"
                aria-expanded={showStatusMenu}
                class={`${compact ? 'text-[10px]' : 'text-xs'} px-1.5 py-0.5 rounded capitalize transition-colors ${statusColor.bg} ${statusColor.text} hover:opacity-80`}
              >
                {work.status}
              </button>
            </div>
          </div>
        </div>
      </button>
      {showStatusMenu && (
        <div
          class="absolute left-0 right-0 top-full mt-1 z-10 bg-surface border border-border rounded-md shadow-lg py-1"
          role="listbox"
          aria-label="Select status"
        >
          {STATUS_OPTIONS.map((opt) => {
            const optColor = STATUS_COLORS[opt.value];
            return (
              <button
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusSelect(opt.value);
                }}
                role="option"
                aria-selected={work.status === opt.value}
                class={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-secondary flex items-center gap-2 ${
                  work.status === opt.value ? 'font-medium' : ''
                }`}
              >
                <span class={`w-2 h-2 rounded-full ${optColor.bg}`} aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}
