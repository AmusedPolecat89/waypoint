interface SkeletonLoaderProps {
  count?: number;
  compact?: boolean;
}

export function SkeletonLoader({ count = 3, compact = false }: SkeletonLoaderProps) {
  return (
    <div class={compact ? 'space-y-1' : 'space-y-2'}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} compact={compact} />
      ))}
    </div>
  );
}

function SkeletonItem({ compact }: { compact: boolean }) {
  return (
    <div
      class={`${compact ? 'p-2' : 'p-3'} bg-surface-secondary rounded-lg animate-pulse`}
    >
      <div class="flex items-start gap-3">
        {/* Thumbnail skeleton */}
        <div class={`${compact ? 'w-8 h-12' : 'w-10 h-14'} bg-surface-tertiary rounded shrink-0`} />

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-1">
              {/* Type badge skeleton */}
              <div class="h-4 w-12 bg-surface-tertiary rounded shrink-0" />
              {/* Title skeleton */}
              <div class={`${compact ? 'h-3' : 'h-4'} bg-surface-tertiary rounded flex-1 max-w-[150px]`} />
            </div>
            {/* Time skeleton */}
            <div class={`${compact ? 'h-2.5' : 'h-3'} w-10 bg-surface-tertiary rounded shrink-0`} />
          </div>
          <div class={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
            {/* Progress skeleton */}
            <div class={`${compact ? 'h-2.5' : 'h-3'} w-16 bg-surface-tertiary rounded`} />
            {/* Status skeleton */}
            <div class={`${compact ? 'h-4' : 'h-5'} w-14 bg-surface-tertiary rounded`} />
          </div>
        </div>
      </div>
    </div>
  );
}
