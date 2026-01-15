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
- [x] Keyboard navigation
- [x] Work count indicator

### Options Page
- [x] Clear all data (with confirmation)
- [x] Storage usage display
- [x] Theme settings (light/dark/system)
- [x] Import from CSV
- [ ] Import from AniList
- [ ] Import from MyAnimeList

### Design Polish
- [x] Create proper PNG icons (16, 48, 128)
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

- [x] Keyboard navigation throughout
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
- Waypoint editing and deletion
- All progress types (chapter, episode, page, timestamp)
- Resume functionality
- Search, filter, and sort
- Quick status toggle
- Source URL support with "Use Current Tab"
- Options page with storage stats and clear data
- Export/import functionality (JSON and CSV)
- Dark mode theme toggle (light/dark/system)
- Proper PNG icons (16, 48, 128)
- Keyboard navigation (↑↓ to select, Enter to open, Esc to go back, / to search, n to add)

### Next Priority
1. Context menus ("Add to Waypoint", "Update waypoint")
2. AniList/MyAnimeList import
3. Focus management in modals
4. Toast notifications


notes from author
- add a button so when you finish reading for the session you can open waypoint and if it detects the work is already in the system there is a update waypoint button for quick update 