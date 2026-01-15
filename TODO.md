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
- [ ] Add waypoint editing
- [x] Add waypoint history view per work
- [x] Add "Resume" action (open source URL if available)
- [ ] Support all progress types (chapter, episode, page, timestamp, percentage)
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
- [ ] Keyboard navigation
- [x] Work count indicator

### Options Page
- [x] Clear all data (with confirmation)
- [x] Storage usage display
- [x] Theme settings (light/dark/system)
- [ ] Import from CSV
- [ ] Import from AniList
- [ ] Import from MyAnimeList

### Design Polish
- [ ] Create proper PNG icons (16, 48, 128)
- [ ] Empty state illustrations
- [ ] Loading skeletons
- [ ] Toast notifications for actions
- [x] Confirm dialogs for destructive actions
- [ ] Responsive popup width

---

## Extension Features

### Content Script
- [ ] Detect current page (optional, user-triggered)
- [ ] Auto-suggest work title from page
- [ ] Auto-detect chapter/episode from URL patterns

### Browser Integration
- [ ] Context menu: "Add to Waypoint"
- [ ] Context menu: "Update waypoint for [Work]"
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

---

## Accessibility

- [ ] Keyboard navigation throughout
- [ ] Focus management in modals
- [ ] Screen reader labels
- [ ] Sufficient color contrast
- [ ] Reduced motion option

---

## Testing

- [ ] Unit tests for storage layer
- [ ] Unit tests for utility functions
- [ ] Component tests for popup
- [ ] Component tests for options
- [ ] E2E tests for core flows

---

## Documentation

- [ ] Usage guide in README
- [ ] Keyboard shortcuts reference
- [ ] Data format documentation (for manual editing)
- [ ] Contributing guidelines

---

## Future / v2+

- [ ] Community adapters (site-specific detection)
- [ ] Bulk operations (mark multiple complete, delete multiple)
- [ ] Statistics view (reading habits, completion rate)
- [ ] Tags/collections for organizing works
- [ ] Reading/watching goals
- [ ] Browser history integration (optional)

---

## Bugs / Tech Debt

- [ ] (none yet)

---

## Progress Summary

### Completed
- Core works management (CRUD)
- Waypoint tracking with history
- Resume functionality
- Search, filter, and sort
- Quick status toggle
- Source URL support with "Use Current Tab"
- Options page with storage stats and clear data
- Export/import functionality
- Dark mode theme toggle (light/dark/system)

### Next Priority
1. Proper PNG icons
2. CSV import
3. Keyboard navigation
4. Context menus
