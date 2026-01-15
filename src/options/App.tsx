import { useState, useEffect } from 'preact/hooks';
import { exportData, importData, importCSV, importAniList, importMAL, loadStore, saveStore } from '@/lib/storage';
import { createEmptyStore } from '@/lib/types';
import { type Theme, setTheme, applyTheme, initTheme } from '@/lib/theme';

export function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [storageInfo, setStorageInfo] = useState<{
    worksCount: number;
    waypointsCount: number;
    bytesUsed: number;
  } | null>(null);
  const [aniListUsername, setAniListUsername] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    initTheme().then(setCurrentTheme);
    loadStorageInfo();
  }, []);

  async function loadStorageInfo() {
    const store = await loadStore();
    const worksCount = Object.keys(store.works).length;
    const waypointsCount = Object.keys(store.waypoints).length;

    const usage = await chrome.storage.local.getBytesInUse();
    setStorageInfo({
      worksCount,
      waypointsCount,
      bytesUsed: usage,
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleThemeChange(theme: Theme) {
    await setTheme(theme);
    applyTheme(theme);
    setCurrentTheme(theme);
  }

  async function handleExport() {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `waypoint-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      setMessage('Data exported successfully.');
    } catch {
      setMessage('Failed to export data.');
    }
  }

  async function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      setMessage('Data imported successfully.');
      await loadStorageInfo();
    } catch {
      setMessage('Failed to import data. Invalid format.');
    }

    input.value = '';
  }

  async function handleCSVImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const result = await importCSV(text);
      setMessage(
        `Imported ${result.imported} works.${result.skipped > 0 ? ` Skipped ${result.skipped} rows.` : ''}`
      );
      await loadStorageInfo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid CSV format.';
      setMessage(`Failed to import CSV: ${msg}`);
    }

    input.value = '';
  }

  async function handleAniListImport() {
    if (!aniListUsername.trim()) {
      setMessage('Please enter an AniList username.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importAniList(aniListUsername.trim());
      setMessage(
        `Imported ${result.imported} entries from AniList.${result.skipped > 0 ? ` Skipped ${result.skipped}.` : ''}`
      );
      setAniListUsername('');
      await loadStorageInfo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch from AniList.';
      setMessage(`AniList import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleMALImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importMAL(text);
      setMessage(
        `Imported ${result.imported} entries from MyAnimeList.${result.skipped > 0 ? ` Skipped ${result.skipped}.` : ''}`
      );
      await loadStorageInfo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid MAL XML format.';
      setMessage(`MAL import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }

    input.value = '';
  }

  async function handleClearAll() {
    try {
      await saveStore(createEmptyStore());
      setMessage('All data has been cleared.');
      setShowClearConfirm(false);
      await loadStorageInfo();
    } catch {
      setMessage('Failed to clear data.');
    }
  }

  return (
    <div class="min-h-screen bg-surface text-text">
      <div class="max-w-2xl mx-auto p-8">
        {/* Header */}
        <header class="mb-8">
          <h1 class="text-2xl font-medium">Waypoint Settings</h1>
          <p class="text-text-secondary mt-1">
            Manage your data and preferences.
          </p>
        </header>

        {/* Message */}
        {message && (
          <div class="mb-6 p-3 bg-surface-secondary rounded-md text-sm flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage(null)}
              class="text-text-tertiary hover:text-text"
            >
              ×
            </button>
          </div>
        )}

        {/* Appearance Section */}
        <section class="mb-8">
          <h2 class="text-lg font-medium mb-4">Appearance</h2>
          <div class="p-4 border border-border rounded-md">
            <h3 class="font-medium mb-3">Theme</h3>
            <div class="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  class={`flex-1 px-4 py-2 text-sm rounded-md border transition-colors capitalize ${
                    currentTheme === theme
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-tertiary mt-3">
              {currentTheme === 'system'
                ? 'Theme follows your system preference.'
                : `Using ${currentTheme} theme.`}
            </p>
          </div>
        </section>

        {/* Storage Usage */}
        {storageInfo && (
          <section class="mb-8">
            <h2 class="text-lg font-medium mb-4">Storage</h2>
            <div class="p-4 border border-border rounded-md">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p class="text-2xl font-medium">{storageInfo.worksCount}</p>
                  <p class="text-xs text-text-secondary">Works</p>
                </div>
                <div>
                  <p class="text-2xl font-medium">{storageInfo.waypointsCount}</p>
                  <p class="text-xs text-text-secondary">Waypoints</p>
                </div>
                <div>
                  <p class="text-2xl font-medium">{formatBytes(storageInfo.bytesUsed)}</p>
                  <p class="text-xs text-text-secondary">Used</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Data Section */}
        <section class="mb-8">
          <h2 class="text-lg font-medium mb-4">Data</h2>

          <div class="space-y-4">
            {/* Export */}
            <div class="p-4 border border-border rounded-md">
              <h3 class="font-medium mb-1">Export Data</h3>
              <p class="text-sm text-text-secondary mb-3">
                Download all your waypoints as a JSON file.
              </p>
              <button
                onClick={handleExport}
                class="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors"
              >
                Export JSON
              </button>
            </div>

            {/* Import JSON */}
            <div class="p-4 border border-border rounded-md">
              <h3 class="font-medium mb-1">Import JSON</h3>
              <p class="text-sm text-text-secondary mb-3">
                Import waypoints from a JSON backup. Existing data will be merged.
              </p>
              <label class="inline-block px-4 py-2 bg-surface-tertiary text-sm rounded-md cursor-pointer hover:bg-border transition-colors">
                Choose File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  class="hidden"
                />
              </label>
            </div>

            {/* Import CSV */}
            <div class="p-4 border border-border rounded-md">
              <h3 class="font-medium mb-1">Import CSV</h3>
              <p class="text-sm text-text-secondary mb-3">
                Import works from a CSV file. Required column: <code class="text-xs bg-surface-tertiary px-1 rounded">title</code>.
                Optional: <code class="text-xs bg-surface-tertiary px-1 rounded">type</code>,{' '}
                <code class="text-xs bg-surface-tertiary px-1 rounded">status</code>,{' '}
                <code class="text-xs bg-surface-tertiary px-1 rounded">progress</code>,{' '}
                <code class="text-xs bg-surface-tertiary px-1 rounded">note</code>,{' '}
                <code class="text-xs bg-surface-tertiary px-1 rounded">sourceUrl</code>.
              </p>
              <label class="inline-block px-4 py-2 bg-surface-tertiary text-sm rounded-md cursor-pointer hover:bg-border transition-colors">
                Choose CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  class="hidden"
                />
              </label>
            </div>

            {/* Import from AniList */}
            <div class="p-4 border border-border rounded-md">
              <h3 class="font-medium mb-1">Import from AniList</h3>
              <p class="text-sm text-text-secondary mb-3">
                Import your anime and manga lists from AniList. Your list must be public.
              </p>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={aniListUsername}
                  onInput={(e) => setAniListUsername((e.target as HTMLInputElement).value)}
                  placeholder="AniList username"
                  class="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
                  disabled={isImporting}
                />
                <button
                  onClick={handleAniListImport}
                  disabled={isImporting || !aniListUsername.trim()}
                  class="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>

            {/* Import from MyAnimeList */}
            <div class="p-4 border border-border rounded-md">
              <h3 class="font-medium mb-1">Import from MyAnimeList</h3>
              <p class="text-sm text-text-secondary mb-3">
                Import your anime and manga lists from a MAL XML export.
                Export from MAL: Profile → List → Export.
              </p>
              <label class={`inline-block px-4 py-2 bg-surface-tertiary text-sm rounded-md cursor-pointer hover:bg-border transition-colors ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isImporting ? 'Importing...' : 'Choose XML File'}
                <input
                  type="file"
                  accept=".xml,.gz"
                  onChange={handleMALImport}
                  class="hidden"
                  disabled={isImporting}
                />
              </label>
            </div>

            {/* Clear All */}
            <div class="p-4 border border-red-500/30 rounded-md">
              <h3 class="font-medium mb-1 text-red-500">Clear All Data</h3>
              <p class="text-sm text-text-secondary mb-3">
                Permanently delete all works and waypoints. This cannot be undone.
              </p>
              {showClearConfirm ? (
                <div class="space-y-3">
                  <p class="text-sm text-red-500">
                    Are you sure? This will delete all {storageInfo?.worksCount ?? 0} works and {storageInfo?.waypointsCount ?? 0} waypoints.
                  </p>
                  <div class="flex gap-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      class="px-4 py-2 border border-border text-sm rounded-md hover:bg-surface-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAll}
                      class="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                    >
                      Yes, Clear Everything
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  class="px-4 py-2 border border-red-500/50 text-red-500 text-sm rounded-md hover:bg-red-500/10 transition-colors"
                >
                  Clear All Data
                </button>
              )}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 class="text-lg font-medium mb-4">About</h2>
          <div class="p-4 border border-border rounded-md">
            <p class="text-sm text-text-secondary">
              <strong class="text-text">Waypoint</strong> — Remember where you left off.
            </p>
            <p class="text-sm text-text-tertiary mt-2">
              Version {chrome.runtime.getManifest().version}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
