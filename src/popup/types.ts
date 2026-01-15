import type { Work, Waypoint } from '@/lib/types';

export interface WorkWithProgress extends Work {
  progress?: string;
  latestWaypoint?: Waypoint;
}

export type View =
  | { type: 'list' }
  | { type: 'add' }
  | { type: 'detail'; work: WorkWithProgress }
  | { type: 'edit'; work: WorkWithProgress }
  | { type: 'edit-waypoint'; work: WorkWithProgress; waypoint: Waypoint };

export type SortOption = 'updated' | 'title' | 'created';
