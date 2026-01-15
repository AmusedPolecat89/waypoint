# Waypoint TODO

## Core Functionality

### Works Management
- [x] Add work creation form in popup
- [x] Add work editing (title, type, status)
- [x] Add work deletion with confirmation dialog
- [x] Add status quick-toggle (reading/watching → completed, etc.)
- [x] Add work detail view

### Waypoints (Progress Tracking)
- [x] Add "Set Waypoint" button/form
- [x] Add waypoint editing
- [x] Add waypoint history view per work
- [x] Add "Resume" action (open source URL if available)
- [x] Support all progress types (chapter, episode, page, timestamp, percentage)
- [x] Add notes to waypoints

### Sources
- [x] Add source URLs to waypoints
- [ ] Add multiple sources per work
- [ ] Add source labels (e.g., "MangaDex", "Crunchyroll")
- [x] Quick-add current tab as source

---

## User Interface

### Popup
- [x] Add work button/modal
- [x] Search/filter works
- [x] Filter by status (reading, watching, paused, completed, dropped)
- [x] Filter by type (novel, manga, webcomic, anime)
- [x] Sort options (recently updated, title, date added)
- [x] Keyboard navigation (↑↓ select, Enter open, Esc back, / search, n add)
- [x] Work count indicator
- [x] Quick Add bar (one-click add from current tab)
- [x] Quick Update bar (one-click update for matched works)
- [x] Toast notifications for actions

### Options Page
- [x] Clear all data (with confirmation)
- [x] Storage usage display
- [x] Theme settings (light/dark/system)
- [x] Import from CSV
- [x] Import from AniList (public lists)
- [x] Import from MyAnimeList (XML export)
- [x] Export to JSON

### Design Polish
- [x] Create proper PNG icons (16, 48, 128)
- [ ] Empty state illustrations
- [ ] Loading skeletons
- [x] Toast notifications for actions
- [x] Confirm dialogs for destructive actions
- [ ] Responsive popup width

---

## Extension Features

### Smart Detection (NEW - Implemented)
- [x] Auto-detect media type (anime/manga/webcomic/novel) from page
- [x] Page content keyword scanning (200+ sites recognized)
- [x] Auto-extract chapter/episode from URL patterns
- [x] Auto-extract clean title from page title
- [x] Keyword scoring system for accurate categorization

### Browser Integration
- [x] Context menu: "Add to Waypoint" (with type submenu)
- [x] Context menu: "Update waypoint for [Work]" (shows recent 10)
- [ ] Keyboard shortcut to open popup
- [ ] Keyboard shortcut to quick-save waypoint
- [ ] Badge showing active work progress

### Sync & Backup
- [ ] Google Drive backup (opt-in)
- [ ] Google Drive restore
- [ ] Sync status indicator
- [ ] Conflict resolution UI

---

## Data & Storage

- [ ] Data migration system for schema changes
- [ ] Storage quota warnings
- [ ] Automatic cleanup of orphaned data
- [ ] Data validation on import
- [ ] Deduplication on import

---

## Accessibility

- [x] Keyboard navigation throughout
- [x] Focus management in modals (useFocusTrap)
- [ ] Screen reader labels (ARIA)
- [ ] Sufficient color contrast audit
- [ ] Reduced motion option
- [ ] Semantic HTML (<nav>, <main>, etc.)

---

## Code Quality & Tech Debt

### High Priority
- [x] Extract shared detection logic to `src/lib/detection.ts`
- [ ] Add input validation for imports
- [ ] Handle AniList API errors gracefully (rate limits, private lists)
- [x] Split popup/App.tsx into smaller components (now modular: hooks/, components/, types, constants)

### Medium Priority
- [ ] Add error logging infrastructure
- [ ] Cache storage operations for performance
- [ ] Reduce popup bundle size (currently 26KB gzipped 6.5KB)
- [x] Remove duplicate code between popup and background (shared detection module)

### Low Priority
- [ ] Performance optimization for large collections (1000+ works)
- [ ] Optimize context menu rebuilds

---

## Testing

- [ ] Unit tests for storage layer
- [ ] Unit tests for utility functions
- [ ] Unit tests for detection/extraction functions
- [ ] Component tests for popup
- [ ] Component tests for options
- [ ] E2E tests for core flows

---

## Documentation

- [ ] Usage guide in README
- [ ] Keyboard shortcuts reference
- [ ] Data format documentation (for manual editing)
- [ ] Contributing guidelines
- [ ] Site compatibility list

---

## Future / v2+

- [ ] Community adapters (site-specific detection)
- [ ] Bulk operations (mark multiple complete, delete multiple)
- [ ] Statistics view (reading habits, completion rate)
- [ ] Tags/collections for organizing works
- [ ] Reading/watching goals
- [ ] Browser history integration (optional)
- [ ] Reminder/notification system
- [ ] Cross-device sync

---

## Known Issues

- [ ] AniList import only works for public lists (no auth)
- [ ] Progress extraction may match wrong numbers on complex URLs
- [ ] Context menu limited to 10 recent works
- [ ] No cloud backup option

---

## Progress Summary

### Completed (v0.1.0)
- Core works management (CRUD)
- Waypoint tracking with history
- Waypoint editing and deletion
- All progress types (chapter, episode, page, timestamp, percentage)
- Resume functionality
- Search, filter, and sort
- Quick status toggle
- Source URL support with "Use Current Tab"
- Options page with storage stats and clear data
- Export/import functionality (JSON, CSV, AniList, MAL)
- Dark mode theme toggle (light/dark/system)
- Proper PNG icons (16, 48, 128)
- Keyboard navigation
- Context menus (Add to Waypoint, Update waypoint)
- Quick Add/Update bar in popup
- Toast notifications
- Focus management (focus trap in forms)
- Smart media type detection (page scanning, 200+ sites)
- Auto-extract chapter/episode from URLs
- Auto-extract title from page
- Modular popup architecture (hooks, components, types, constants)
- Shared detection module (src/lib/detection.ts)

### Next Priority
1. Add ARIA labels for accessibility
2. Add basic unit tests for core functions
3. Add keyboard shortcuts for popup/quick-save
4. Add input validation for imports
5. Handle AniList API errors gracefully

### Nice to Have
- Empty state illustrations
- Loading skeletons
- Cloud backup (Google Drive)
- Statistics dashboard
- Bulk operations
