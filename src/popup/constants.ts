import type { MediaType, WorkStatus } from '@/lib/types';

export const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'manga', label: 'Manga' },
  { value: 'novel', label: 'Novel' },
  { value: 'webcomic', label: 'Webcomic' },
  { value: 'anime', label: 'Anime' },
];

export const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'watching', label: 'Watching' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];
