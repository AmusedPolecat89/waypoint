import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { Work, Waypoint, MediaType, WorkStatus } from '@/lib/types';
import {
  getWorks,
  getLatestWaypoint,
  getWaypoints,
  createWork,
  updateWork,
  deleteWork,
  createWaypoint,
  updateWaypoint,
  deleteWaypoint,
} from '@/lib/storage';
import { formatProgress, formatRelativeTime } from '@/lib/utils';

/**
 * Toast notification types
 */
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

/**
 * Hook to manage toast notifications
 */
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

/**
 * Toast notification component
 */
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div class="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`p-3 rounded-md shadow-lg text-sm flex items-center justify-between animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-surface-secondary text-text border border-border'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            class="ml-2 opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook to trap focus within a container element.
 * Useful for forms and modal-like views.
 */
function useFocusTrap(containerRef: { current: HTMLElement | null }) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableElements = container!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}

interface WorkWithProgress extends Work {
  progress?: string;
  latestWaypoint?: Waypoint;
}

type View =
  | { type: 'list' }
  | { type: 'add' }
  | { type: 'detail'; work: WorkWithProgress }
  | { type: 'edit'; work: WorkWithProgress }
  | { type: 'edit-waypoint'; work: WorkWithProgress; waypoint: Waypoint };

type SortOption = 'updated' | 'title' | 'created';

export function App() {
  const [works, setWorks] = useState<WorkWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: 'list' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToasts();

  // Current tab info for quick add/update
  const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
  const [matchedWork, setMatchedWork] = useState<WorkWithProgress | null>(null);

  useEffect(() => {
    loadWorks();
    loadCurrentTab();
  }, []);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [search, statusFilter, typeFilter, sortBy]);

  const filteredWorks = works
    .filter((work) => {
      const matchesSearch = work.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || work.status === statusFilter;
      const matchesType = typeFilter === 'all' || work.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return b.createdAt - a.createdAt;
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle keys when in list view
      if (view.type !== 'list') {
        // Escape goes back from any view
        if (e.key === 'Escape') {
          e.preventDefault();
          if (view.type === 'detail') {
            setView({ type: 'list' });
          } else if (view.type === 'edit' || view.type === 'edit-waypoint') {
            setView({ type: 'detail', work: view.work });
          } else if (view.type === 'add') {
            setView({ type: 'list' });
          }
        }
        return;
      }

      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT';

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredWorks.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < filteredWorks.length && !isInputFocused) {
            e.preventDefault();
            setView({ type: 'detail', work: filteredWorks[selectedIndex] });
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isInputFocused) {
            (document.activeElement as HTMLElement).blur();
            setSelectedIndex(0);
          } else {
            setSelectedIndex(-1);
          }
          break;
        case '/':
          if (!isInputFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'n':
          if (!isInputFocused) {
            e.preventDefault();
            setView({ type: 'add' });
          }
          break;
      }
    },
    [view, filteredWorks, selectedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  async function loadWorks() {
    setLoading(true);
    const allWorks = await getWorks();

    const worksWithProgress: WorkWithProgress[] = await Promise.all(
      allWorks.map(async (work) => {
        const waypoint = await getLatestWaypoint(work.id);
        return {
          ...work,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        };
      })
    );

    setWorks(worksWithProgress);
    setLoading(false);
  }

  async function loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab?.title) {
        setCurrentTab({ url: tab.url, title: tab.title });
      }
    } catch {
      // Ignore errors (e.g., on chrome:// pages)
    }
  }

  // Detect if current tab matches any existing work
  useEffect(() => {
    if (!currentTab?.url || works.length === 0) {
      setMatchedWork(null);
      return;
    }

    // Try to match by source URL domain or exact URL
    const currentDomain = getDomain(currentTab.url);

    // Find work with matching source URL
    const matched = works.find((work) => {
      if (!work.latestWaypoint?.sourceUrl) return false;
      const workDomain = getDomain(work.latestWaypoint.sourceUrl);

      // Match if same domain and URL contains work title (loose match)
      // Or if exact URL match
      if (work.latestWaypoint.sourceUrl === currentTab.url) return true;
      if (currentDomain === workDomain) {
        // Check if URL path has similar structure (same manga/anime)
        const currentPath = new URL(currentTab.url).pathname.toLowerCase();
        const workPath = new URL(work.latestWaypoint.sourceUrl).pathname.toLowerCase();
        // Match if first part of path is the same (e.g., /manga/one-piece/123 matches /manga/one-piece/124)
        const currentParts = currentPath.split('/').filter(Boolean);
        const workParts = workPath.split('/').filter(Boolean);
        if (currentParts.length >= 2 && workParts.length >= 2) {
          return currentParts[0] === workParts[0] && currentParts[1] === workParts[1];
        }
      }
      return false;
    });

    setMatchedWork(matched ?? null);
  }, [currentTab, works]);

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  /**
   * Extract text content from the current page for keyword scanning
   */
  async function extractPageContent(tabId: number): Promise<string> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Get text from key elements that typically contain media type info
          const selectors = [
            'h1', 'h2', 'h3',                    // Headings
            '.genre', '.genres', '[class*="genre"]', // Genre tags
            '.tag', '.tags', '[class*="tag"]',   // Tags
            '.type', '[class*="type"]',          // Type labels
            '.info', '.details', '.meta',        // Info sections
            '.breadcrumb', '[class*="breadcrumb"]', // Breadcrumbs
            '.category', '[class*="category"]',  // Category labels
            'title', 'meta[name="description"]', // Meta info
          ];

          const textParts: string[] = [];

          // Get meta description
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            textParts.push(metaDesc.getAttribute('content') || '');
          }

          // Get text from selected elements
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length < 500) { // Avoid huge text blocks
                textParts.push(text);
              }
            });
          }

          // Also scan the first 5000 chars of body text for keywords
          const bodyText = document.body?.innerText?.substring(0, 5000) || '';
          textParts.push(bodyText);

          return textParts.join(' ').toLowerCase();
        },
      });

      return results[0]?.result || '';
    } catch {
      // Permission denied or other error - return empty string
      return '';
    }
  }

  /**
   * Detect media type from URL, title, and page content
   */
  function detectMediaType(url: string, title: string, pageContent: string = ''): MediaType {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = pageContent.toLowerCase();
    const domain = getDomain(url);

    // Combine all text for keyword scanning
    const allText = `${urlLower} ${titleLower} ${contentLower}`;

    // Keywords for each category (weighted by specificity)
    const keywordScores: Record<MediaType, number> = {
      anime: 0,
      manga: 0,
      webcomic: 0,
      novel: 0,
    };

    // --- ANIME keywords ---
    const animeKeywords = [
      // Core terms
      'anime', 'episode', 'episodes', 'streaming', 'subbed', 'dubbed',
      'sub', 'dub', 'ova', 'ona', 'simulcast', 'season', 'seasons',
      // Streaming terms
      'watch online', 'stream', 'video player', 'autoplay next',
      // Anime-specific terms
      'opening', 'ending', 'op', 'ed', 'filler', 'filler list', 'canon',
      'voice actor', 'seiyuu', 'studio', 'animation studio',
      // Japanese terms
      'アニメ', 'エピソード', '話', '期', 'シーズン',
      // Quality/format terms
      '1080p', '720p', '480p', 'bluray', 'bd', 'dvd', 'raw',
      // Site-specific
      'crunchyroll', 'funimation', 'hidive', 'netflix anime', 'animelab'
    ];

    // --- MANGA keywords (Japanese comics) ---
    const mangaKeywords = [
      // Core terms
      'manga', 'mangaka', 'read manga', 'manga reader', 'manga scan',
      // Demographics
      'shonen', 'shounen', 'shojo', 'shoujo', 'seinen', 'josei', 'kodomo',
      // Formats
      'oneshot', 'one-shot', 'tankoubon', 'tankobon', 'volume',
      // Publishers/magazines
      'jump', 'shonen jump', 'weekly shonen', 'magazine', 'viz',
      'kodansha', 'shueisha', 'shogakukan', 'square enix',
      // Origin terms
      'japanese', 'japan', 'jp',
      // Japanese terms
      'マンガ', '漫画', '少年', '少女', '青年', '女性',
      // Scanlation terms
      'raw', 'scanlation', 'scanslation', 'fan translation',
      // Reading direction
      'right to left', 'rtl'
    ];

    // --- WEBCOMIC keywords (Korean/Chinese/Western) ---
    const webcomicKeywords = [
      // Core terms
      'manhwa', 'manhua', 'webtoon', 'webcomic', 'web comic', 'webcomics',
      'webtoons', 'toon', 'comic', 'comics',
      // Origin terms
      'korean', 'chinese', 'korea', 'china', 'kr', 'cn',
      // Platform terms
      'tapas', 'tappytoon', 'lezhin', 'toomics', 'manta', 'pocket comics',
      'line webtoon', 'naver', 'kakao', 'daum', 'kuaikan', 'bilibili comics',
      // Format terms
      'vertical scroll', 'long strip', 'full color', 'full colour', 'colored',
      'scroll down', 'infinite scroll',
      // Korean terms
      '웹툰', '만화', '네이버', '카카오',
      // Chinese terms
      '漫画网', '动漫', '国漫', '漫画屋',
      // Genre terms common in manhwa/manhua
      'cultivation', 'regression', 'reincarnation', 'system', 'hunter',
      'tower', 'dungeon', 'awakening', 'martial arts', 'murim'
    ];

    // --- NOVEL keywords ---
    const novelKeywords = [
      // Core terms
      'novel', 'light novel', 'lightnovel', 'web novel', 'webnovel',
      'ln', 'wn', 'fiction', 'story', 'stories', 'chapter', 'chapters',
      // Fan fiction
      'fanfiction', 'fanfic', 'fan fiction', 'fan fic', 'fic',
      // Genre terms
      'wuxia', 'xianxia', 'xuanhuan', 'cultivation', 'isekai', 'litrpg',
      'lit rpg', 'progression', 'progression fantasy', 'gamelit',
      'harem', 'romance', 'fantasy', 'sci-fi', 'slice of life',
      // Platform terms
      'royalroad', 'scribblehub', 'wattpad', 'ao3', 'archiveofourown',
      'webnovel', 'qidian', '起点',
      // Format terms
      'word count', 'pages', 'reading time', 'author note',
      // Japanese terms
      'ライトノベル', '小説', 'なろう', 'syosetu',
      // Chinese terms
      '小说', '轻小说', '网文',
      // Book terms
      'volume', 'vol', 'book', 'arc', 'part', 'prologue', 'epilogue',
      // Original fiction indicators
      'original', 'original fiction', 'oc', 'original character'
    ];

    // Count keyword occurrences
    for (const kw of animeKeywords) {
      if (allText.includes(kw)) keywordScores.anime += (kw.length > 4 ? 2 : 1);
    }
    for (const kw of mangaKeywords) {
      if (allText.includes(kw)) keywordScores.manga += (kw.length > 4 ? 2 : 1);
    }
    for (const kw of webcomicKeywords) {
      if (allText.includes(kw)) keywordScores.webcomic += (kw.length > 4 ? 2 : 1);
    }
    for (const kw of novelKeywords) {
      if (allText.includes(kw)) keywordScores.novel += (kw.length > 4 ? 2 : 1);
    }

    // Known site domains (highest priority overrides)
    const animeSites = [
      // Major legal streaming
      'crunchyroll.com', 'funimation.com', 'hidive.com', 'vrv.co',
      'wakanim.tv', 'animelab.com', 'animax.com',
      // Netflix/Prime anime sections
      'netflix.com/browse/genre/7424', 'amazon.com/anime',
      // Anime tracking/database
      'myanimelist.net', 'anilist.co', 'kitsu.io', 'anime-planet.com',
      'anidb.net', 'annict.com', 'annict.jp', 'livechart.me',
      // Fan/unofficial streaming
      '9anime', 'gogoanime', 'animixplay', 'zoro.to', 'aniwatch',
      'animesuge', 'animepahe', 'twist.moe', 'animekisa', 'animedao',
      'animefrenzy', 'animeowl', 'animesaturn', 'animeflv',
      'jkanime', 'monoschinos', 'tioanime', 'animeyt',
      'kayoanime', 'animension', 'animebee', 'gogoanimes',
      'animeonsen', '4anime', 'animekayo', 'animeheaven',
      'aniwatcher', 'animevibe', 'ryuanime', 'dubbedanime',
      'watchcartoononline', 'kimcartoon'
    ];

    const mangaSites = [
      // Official/legal
      'mangadex.org', 'mangaplus.shueisha.co.jp', 'viz.com',
      'kodansha.us', 'manga.club', 'comikey.com', 'azuki.co',
      'inkr.com', 'coolmic.me', 'mangamo.com', 'shonenjump.com',
      // Aggregators (primarily Japanese manga)
      'mangasee123.com', 'manga4life.com', 'mangareader.to', 'mangakakalot.com',
      'mangakatana.com', 'mangapill.com', 'mangahub.io', 'mangapark.to',
      'mangafox.me', 'mangahere.cc', 'mangaeden.com', 'mangafreak.me',
      'mangaowl.net', 'mangairo.com', 'mangabat.com', 'manganelo.com',
      'mangaclash.com', 'mangajar.com', 'readmng.com', 'mangadoom.co',
      'mangahasu.se', 'rawdevart.com', 'mangaraw.org', 'mangarawjp.com',
      // Japanese raw sites
      'rawkuma.com', 'klmanga.com', 'manga1000.com', 'manga1001.com'
    ];

    const webcomicSites = [
      // Official platforms - Korean
      'webtoons.com', 'webtoon.xyz', 'tapas.io', 'tappytoon.com',
      'lezhin.com', 'lezhincomics.com', 'toomics.com', 'manta.net',
      'netcomics.com', 'pocketcomics.com', 'lehzin.com', 'bomtoon.com',
      'mrblue.com', 'kakaopage.com', 'naver.com/webtoon',
      // Official platforms - Chinese
      'kuaikanmanhua.com', 'bilibili.com/manga', 'dmzj.com', 'manhuagui.com',
      'ac.qq.com', 'u17.com', 'dongmanmanhua.cn', 'webcomicsapp.com',
      // Scanlation sites (primarily manhwa/manhua)
      'asurascans.com', 'asuracomic.net', 'asuratoon.com',
      'reaperscans.com', 'reapersans.com',
      'flamecomics.com', 'flamescans.org',
      'luminousscans.com', 'luminousscans.net',
      'manhuascan.io', 'manhuaus.com', 'manhuaplus.com',
      'manhwatop.com', 'manhwa18.com', 'manhwaclan.com',
      'zinmanga.com', 'mangatx.com', 'manhwabuddy.com',
      'resetscans.com', 'hivetoon.com', 'infernalvoidscans.com',
      'nitroscans.com', 'nightscans.net', 'harmonyscan.com',
      'immortalupdates.com', 'cosmic-scans.com', 'astrascans.com',
      'rizzfables.com', 'arvenscans.com', 'skscans.com',
      // Aggregators
      'bato.to', 'batotoo.com', 'comick.io', 'comick.fun',
      'mangagg.com', 'toonily.com', 'manhwax.com', 'manhuafast.com',
      '1stkissmanga.io', '1stkissmanga.me', 'manhwa-freak.com'
    ];

    const novelSites = [
      // English original fiction
      'royalroad.com', 'scribblehub.com', 'wattpad.com',
      'fictionpress.com', 'penana.com', 'inkitt.com', 'tapas.io/novels',
      'honeyfeed.fm', 'webnovel.com', 'neovel.io', 'moonquill.com',
      // Fan fiction
      'archiveofourown.org', 'fanfiction.net', 'quotev.com',
      'asianfanfics.com', 'spiritfanfiction.com',
      // Chinese novel sites
      'wuxiaworld.com', 'novelfull.com', 'lightnovelpub.com',
      'novelupdates.com', 'novelbin.com', 'novelhall.com',
      'readlightnovel.org', 'boxnovel.com', 'noveltop.com',
      'wnmtl.org', 'wuxiaworld.site', 'novelsemperor.com',
      'wuxiap.com', 'ranobes.net', 'freewebnovel.com',
      'lightnovelreader.org', 'lightnovelsonl.com', 'pandanovel.com',
      '69shu.com', 'shu69.com', 'qidian.com', 'jjwxc.net',
      // Japanese novel sites
      'syosetu.com', 'kakuyomu.jp', 'j-novel.club', 'yenpress.com',
      // Novel tracking
      'novelupdates.com', 'lndb.info'
    ];

    // Check domain for definitive matches
    for (const site of animeSites) {
      if (domain.includes(site) || urlLower.includes(site)) {
        keywordScores.anime += 50; // Strong boost
      }
    }
    for (const site of mangaSites) {
      if (domain.includes(site) || urlLower.includes(site)) {
        keywordScores.manga += 50;
      }
    }
    for (const site of webcomicSites) {
      if (domain.includes(site) || urlLower.includes(site)) {
        keywordScores.webcomic += 50;
      }
    }
    for (const site of novelSites) {
      if (domain.includes(site) || urlLower.includes(site)) {
        keywordScores.novel += 50;
      }
    }

    // Find the category with highest score
    let maxScore = 0;
    let detected: MediaType = 'manga'; // default fallback

    for (const [type, score] of Object.entries(keywordScores) as [MediaType, number][]) {
      if (score > maxScore) {
        maxScore = score;
        detected = type;
      }
    }

    return detected;
  }

  /**
   * Extract chapter/episode number from URL and title
   */
  function extractProgress(url: string, title: string, mediaType: MediaType): { chapter?: number; episode?: number } {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Episode patterns for anime
    const episodePatterns = [
      /episode[_\-\s]*(\d+)/i,
      /ep[_\-\s]*(\d+)/i,
      /e(\d+)(?!\d)/i,
      /\bs(\d+)e(\d+)/i,  // S01E05 format - captures episode
      /\bepisode\s*(\d+)/i,
      /【(\d+)】/,  // Japanese episode markers
      /第(\d+)話/,  // Japanese episode
      /episode[^\d]*(\d+)/i,
    ];

    // Chapter patterns for manga/comics/novels
    const chapterPatterns = [
      /chapter[_\-\s]*(\d+(?:\.\d+)?)/i,
      /ch[_\-\.\s]*(\d+(?:\.\d+)?)/i,
      /chap[_\-\.\s]*(\d+(?:\.\d+)?)/i,
      /c(\d+)(?!\d)/i,
      /(?:^|\/|-)(\d+(?:\.\d+)?)(?:\/|$|-|\.html)/,  // URL number patterns
      /第(\d+)章/,  // Japanese chapter
      /第(\d+)话/,  // Chinese chapter
      /[\[\(](\d+)[\]\)]/,  // [123] or (123)
      /\s(\d+)(?:\s|$)/,  // Loose number at end
    ];

    const isAnime = mediaType === 'anime';
    const patterns = isAnime ? episodePatterns : chapterPatterns;

    // Try URL first (more reliable)
    for (const pattern of patterns) {
      const match = urlLower.match(pattern);
      if (match) {
        // Handle S01E05 format specially
        const numStr = match[2] || match[1];
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 10000) {
          return isAnime ? { episode: Math.floor(num) } : { chapter: num };
        }
      }
    }

    // Try title
    for (const pattern of patterns) {
      const match = titleLower.match(pattern);
      if (match) {
        const numStr = match[2] || match[1];
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 10000) {
          return isAnime ? { episode: Math.floor(num) } : { chapter: num };
        }
      }
    }

    // Last resort: find any number in URL path that looks like a chapter
    const pathMatch = url.match(/\/(\d+)(?:\/|$|\?)/);
    if (pathMatch) {
      const num = parseInt(pathMatch[1], 10);
      if (num > 0 && num < 5000) {
        return isAnime ? { episode: num } : { chapter: num };
      }
    }

    return {};
  }

  /**
   * Clean up and extract the work title from page title
   */
  function extractTitle(pageTitle: string, url: string): string {
    let title = pageTitle;

    // Remove common site suffixes
    const suffixPatterns = [
      / [-–—|:] .{0,30}$/,  // "Title - Site Name" (short suffixes only)
      / :: .+$/,
      /\s*\([^)]{0,20}\)$/,  // (Site Name) at end
      /\s*【[^】]+】$/,  // Japanese brackets at end
      / - Read .+$/i,
      / Chapter \d+.*$/i,
      / Episode \d+.*$/i,
      / Ch\.\s*\d+.*$/i,
      / Ep\.\s*\d+.*$/i,
      / #\d+.*$/,
      /\s*-\s*Chapter\s*\d+/i,
      /\s*-\s*Episode\s*\d+/i,
    ];

    for (const pattern of suffixPatterns) {
      title = title.replace(pattern, '');
    }

    // Remove prefix patterns
    const prefixPatterns = [
      /^Read\s+/i,
      /^Watch\s+/i,
      /^Stream\s+/i,
      /^Chapter\s*\d+\s*[-–:]\s*/i,
      /^Episode\s*\d+\s*[-–:]\s*/i,
    ];

    for (const pattern of prefixPatterns) {
      title = title.replace(pattern, '');
    }

    // Clean up extra whitespace
    title = title.replace(/\s+/g, ' ').trim();

    // If title is too short or generic, try to extract from URL
    if (title.length < 3 || /^(home|index|page|read|watch|chapter|episode)$/i.test(title)) {
      const urlTitle = extractTitleFromUrl(url);
      if (urlTitle && urlTitle.length > title.length) {
        title = urlTitle;
      }
    }

    return title || 'Untitled';
  }

  /**
   * Try to extract a readable title from URL path
   */
  function extractTitleFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);

      // Skip common non-title segments
      const skipSegments = ['manga', 'comic', 'anime', 'novel', 'read', 'watch', 'chapter', 'episode', 'series', 'title'];

      for (const part of parts) {
        // Skip if it's a number or common segment
        if (/^\d+$/.test(part) || skipSegments.includes(part.toLowerCase())) continue;

        // Convert URL slug to readable title
        const cleaned = part
          .replace(/[-_]/g, ' ')
          .replace(/\.(html?|php|aspx?)$/i, '')
          .replace(/\b\w/g, c => c.toUpperCase());

        if (cleaned.length >= 3) {
          return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return '';
  }

  // Quick update for matched work
  async function handleQuickUpdate() {
    if (!matchedWork || !currentTab) return;

    const progress = extractProgress(currentTab.url, currentTab.title, matchedWork.type);
    const isAnime = matchedWork.type === 'anime';

    await createWaypoint({
      workId: matchedWork.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter || (isAnime ? undefined : matchedWork.latestWaypoint?.chapter),
      episode: progress.episode || (isAnime ? matchedWork.latestWaypoint?.episode : undefined),
    });
    await loadWorks();
    addToast(`Updated "${matchedWork.title}"`);
  }

  // Quick add from current tab
  async function handleQuickAdd() {
    if (!currentTab) return;

    // Get the tab ID for content extraction
    let pageContent = '';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        pageContent = await extractPageContent(tab.id);
      }
    } catch {
      // Continue without page content if extraction fails
    }

    // Auto-detect media type from URL, title, and page content
    const type = detectMediaType(currentTab.url, currentTab.title, pageContent);

    // Extract clean title
    const title = extractTitle(currentTab.title, currentTab.url);

    // Extract progress (chapter/episode)
    const progress = extractProgress(currentTab.url, currentTab.title, type);

    const status = type === 'anime' ? 'watching' : 'reading';

    const work = await createWork({ title, type, status });
    await createWaypoint({
      workId: work.id,
      sourceUrl: currentTab.url,
      chapter: progress.chapter,
      episode: progress.episode,
    });
    await loadWorks();
    setView({ type: 'list' });
    addToast(`Added "${title}" as ${type}`);
  }

  async function handleAddWork(data: { title: string; type: MediaType }) {
    await createWork({
      title: data.title,
      type: data.type,
      status: data.type === 'anime' ? 'watching' : 'reading',
    });
    await loadWorks();
    setView({ type: 'list' });
    addToast(`Added "${data.title}"`);
  }

  async function handleUpdateWork(
    id: string,
    data: Partial<Pick<Work, 'title' | 'type' | 'status'>>
  ) {
    await updateWork(id, data);
    await loadWorks();
    setView({ type: 'list' });
    addToast('Work updated');
  }

  async function handleDeleteWork(id: string) {
    await deleteWork(id);
    await loadWorks();
    setView({ type: 'list' });
    addToast('Work deleted');
  }

  async function handleQuickStatusChange(id: string, status: WorkStatus) {
    await updateWork(id, { status });
    await loadWorks();
  }

  async function handleSetWaypoint(
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) {
    await createWaypoint({
      workId,
      ...data,
    });
    await loadWorks();
    // Refresh detail view with updated work
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint saved');
  }

  async function handleUpdateWaypoint(
    waypointId: string,
    workId: string,
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'note' | 'sourceUrl'>>
  ) {
    await updateWaypoint(waypointId, data);
    await loadWorks();
    // Refresh detail view with updated work
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint updated');
  }

  async function handleDeleteWaypoint(waypointId: string, workId: string) {
    await deleteWaypoint(waypointId);
    await loadWorks();
    // Refresh detail view with updated work
    const updatedWork = works.find((w) => w.id === workId);
    if (updatedWork) {
      const waypoint = await getLatestWaypoint(workId);
      setView({
        type: 'detail',
        work: {
          ...updatedWork,
          progress: waypoint ? formatProgress(waypoint) : undefined,
          latestWaypoint: waypoint ?? undefined,
        },
      });
    }
    addToast('Waypoint deleted');
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div class="w-80 min-h-[200px] max-h-[500px] flex flex-col bg-surface text-text relative">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {view.type === 'list' && (
        <>
          <Header
            onAdd={() => setView({ type: 'add' })}
            onSettings={openOptions}
          />
          {/* Quick Action Bar - shows when on a trackable page */}
          {currentTab && (
            <QuickActionBar
              currentTab={currentTab}
              matchedWork={matchedWork}
              onQuickUpdate={handleQuickUpdate}
              onQuickAdd={handleQuickAdd}
            />
          )}
          {/* Search and Filters - only show when there are works */}
          {!loading && works.length > 0 && (
            <div class="px-4 pt-3 pb-2 border-b border-border space-y-2">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                placeholder="Search works... (/ to focus)"
                class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
              <div class="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter((e.target as HTMLSelectElement).value as WorkStatus | 'all')
                  }
                  class="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="all">All Status</option>
                  <option value="reading">Reading</option>
                  <option value="watching">Watching</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter((e.target as HTMLSelectElement).value as MediaType | 'all')
                  }
                  class="flex-1 px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="all">All Types</option>
                  <option value="manga">Manga</option>
                  <option value="novel">Novel</option>
                  <option value="webcomic">Webcomic</option>
                  <option value="anime">Anime</option>
                </select>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-tertiary">
                  {filteredWorks.length} of {works.length} works
                </span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy((e.target as HTMLSelectElement).value as SortOption)
                  }
                  class="px-2 py-1 text-xs border border-border rounded bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="title">Title A-Z</option>
                  <option value="created">Recently Added</option>
                </select>
              </div>
            </div>
          )}
          <main class="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p class="text-text-secondary text-sm">Loading...</p>
            ) : works.length === 0 ? (
              <EmptyState onAdd={() => setView({ type: 'add' })} />
            ) : filteredWorks.length === 0 ? (
              <div class="text-center py-8">
                <p class="text-text-secondary text-sm">No matching works</p>
                {hasFilters && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    class="text-accent hover:text-accent-hover text-sm mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <WorkList
                works={filteredWorks}
                selectedIndex={selectedIndex}
                onSelect={(work) => setView({ type: 'detail', work })}
                onStatusChange={handleQuickStatusChange}
              />
            )}
          </main>
        </>
      )}

      {view.type === 'add' && (
        <AddWorkForm
          onSubmit={handleAddWork}
          onCancel={() => setView({ type: 'list' })}
        />
      )}

      {view.type === 'detail' && (
        <WorkDetail
          work={view.work}
          onBack={() => setView({ type: 'list' })}
          onEdit={() => setView({ type: 'edit', work: view.work })}
          onDelete={() => handleDeleteWork(view.work.id)}
          onSetWaypoint={(data) => handleSetWaypoint(view.work.id, data)}
          onEditWaypoint={(waypoint) =>
            setView({ type: 'edit-waypoint', work: view.work, waypoint })
          }
        />
      )}

      {view.type === 'edit' && (
        <EditWorkForm
          work={view.work}
          onSubmit={(data) => handleUpdateWork(view.work.id, data)}
          onCancel={() => setView({ type: 'detail', work: view.work })}
        />
      )}

      {view.type === 'edit-waypoint' && (
        <EditWaypointForm
          waypoint={view.waypoint}
          work={view.work}
          onSubmit={(data) =>
            handleUpdateWaypoint(view.waypoint.id, view.work.id, data)
          }
          onDelete={() => handleDeleteWaypoint(view.waypoint.id, view.work.id)}
          onCancel={() => setView({ type: 'detail', work: view.work })}
        />
      )}
    </div>
  );
}

function Header({
  onAdd,
  onSettings,
}: {
  onAdd: () => void;
  onSettings: () => void;
}) {
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

/**
 * Quick action bar for adding or updating the current page
 */
function QuickActionBar({
  currentTab,
  matchedWork,
  onQuickUpdate,
  onQuickAdd,
}: {
  currentTab: { url: string; title: string };
  matchedWork: WorkWithProgress | null;
  onQuickUpdate: () => void;
  onQuickAdd: () => void;
}) {
  // Clean up title for display
  let cleanTitle = currentTab.title;
  const suffixPatterns = [/ [-–—|] .+$/, / :: .+$/, /\s*\(.+\)$/];
  for (const pattern of suffixPatterns) {
    cleanTitle = cleanTitle.replace(pattern, '');
  }
  cleanTitle = cleanTitle.trim();
  if (cleanTitle.length > 40) {
    cleanTitle = cleanTitle.substring(0, 40) + '...';
  }

  // If we have a matched work, show update UI
  if (matchedWork) {
    return (
      <div class="px-4 py-2 bg-accent-subtle border-b border-accent/20">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-accent font-medium truncate">
              {matchedWork.title}
            </p>
            <p class="text-xs text-text-secondary">
              {matchedWork.progress ?? 'No progress yet'}
            </p>
          </div>
          <button
            onClick={onQuickUpdate}
            class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    );
  }

  // Otherwise show add UI
  return (
    <div class="px-4 py-2 bg-surface-secondary border-b border-border">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p class="text-xs text-text-secondary truncate">{cleanTitle}</p>
        </div>
        <button
          onClick={onQuickAdd}
          class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          Quick Add
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div class="text-center py-8">
      <p class="text-text-secondary text-sm mb-2">No waypoints yet</p>
      <p class="text-text-tertiary text-xs mb-4">
        Add a work to start tracking your progress.
      </p>
      <button
        onClick={onAdd}
        class="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors"
      >
        Add your first work
      </button>
    </div>
  );
}

function WorkList({
  works,
  selectedIndex,
  onSelect,
  onStatusChange,
}: {
  works: WorkWithProgress[];
  selectedIndex: number;
  onSelect: (work: WorkWithProgress) => void;
  onStatusChange: (id: string, status: WorkStatus) => void;
}) {
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

function WorkItem({
  work,
  isSelected,
  onSelect,
  onStatusChange,
}: {
  work: WorkWithProgress;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: WorkStatus) => void;
}) {
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

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'manga', label: 'Manga' },
  { value: 'novel', label: 'Novel' },
  { value: 'webcomic', label: 'Webcomic' },
  { value: 'anime', label: 'Anime' },
];

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'watching', label: 'Watching' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];

function AddWorkForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; type: MediaType }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('manga');
  const formRef = useRef<HTMLFormElement>(null);

  useFocusTrap(formRef);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Add Work</h2>
        <button
          type="submit"
          disabled={!title.trim()}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Enter title..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <div class="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                class={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  type === mt.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

function EditWorkForm({
  work,
  onSubmit,
  onCancel,
}: {
  work: Work;
  onSubmit: (data: Partial<Pick<Work, 'title' | 'type' | 'status'>>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(work.title);
  const [type, setType] = useState<MediaType>(work.type);
  const [status, setStatus] = useState<WorkStatus>(work.status);
  const formRef = useRef<HTMLFormElement>(null);

  useFocusTrap(formRef);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, status });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Edit Work</h2>
        <button
          type="submit"
          disabled={!title.trim()}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <div class="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                class={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  type === mt.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus((e.target as HTMLSelectElement).value as WorkStatus)
            }
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}

function WorkDetail({
  work,
  onBack,
  onEdit,
  onDelete,
  onSetWaypoint,
  onEditWaypoint,
}: {
  work: WorkWithProgress;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaypoint: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onEditWaypoint: (waypoint: Waypoint) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [waypointValue, setWaypointValue] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Waypoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isAnime = work.type === 'anime';
  const progressField = isAnime ? 'episode' : 'chapter';
  const progressLabel = isAnime ? 'Episode' : 'Chapter';
  const secondaryField = isAnime ? 'timestamp' : 'page';
  const secondaryLabel = isAnime ? 'Timestamp (seconds)' : 'Page';
  const hasSourceUrl = work.latestWaypoint?.sourceUrl;

  async function loadHistory() {
    if (history.length > 0) {
      setShowHistory(!showHistory);
      return;
    }
    setLoadingHistory(true);
    const waypoints = await getWaypoints(work.id);
    setHistory(waypoints);
    setShowHistory(true);
    setLoadingHistory(false);
  }

  function handleSetWaypoint(e: Event) {
    e.preventDefault();
    const value = parseInt(waypointValue, 10);
    if (isNaN(value) || value < 0) return;

    const secondaryParsed = parseInt(secondaryValue, 10);
    const hasSecondary = !isNaN(secondaryParsed) && secondaryParsed >= 0;

    onSetWaypoint({
      [progressField]: value,
      ...(hasSecondary ? { [secondaryField]: secondaryParsed } : {}),
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setWaypointValue('');
    setSecondaryValue('');
    setNote('');
    setSourceUrl('');
  }

  function handleResume() {
    if (hasSourceUrl) {
      chrome.tabs.create({ url: work.latestWaypoint!.sourceUrl });
    }
  }

  return (
    <div class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          class="text-text-secondary hover:text-text text-sm"
        >
          ← Back
        </button>
        <button
          onClick={onEdit}
          class="text-accent hover:text-accent-hover text-sm font-medium"
        >
          Edit
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Work Info */}
        <div>
          <h2 class="text-lg font-medium">{work.title}</h2>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 bg-surface-tertiary rounded capitalize">
              {work.type}
            </span>
            <span class="text-xs px-2 py-0.5 bg-surface-tertiary rounded capitalize">
              {work.status}
            </span>
          </div>
        </div>

        {/* Current Progress */}
        <div class="p-3 bg-surface-secondary rounded-md">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-text-secondary mb-1">Current Progress</p>
              <p class="text-sm font-medium">
                {work.progress ?? 'No waypoint set'}
              </p>
              {work.latestWaypoint?.note && (
                <p class="text-xs text-text-tertiary mt-1">
                  {work.latestWaypoint.note}
                </p>
              )}
            </div>
            {hasSourceUrl && (
              <button
                onClick={handleResume}
                class="shrink-0 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                Resume
              </button>
            )}
          </div>
          {hasSourceUrl && (
            <p class="text-xs text-text-tertiary mt-2 truncate">
              {work.latestWaypoint!.sourceUrl}
            </p>
          )}
        </div>

        {/* Set Waypoint Form */}
        <form onSubmit={handleSetWaypoint} class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-sm font-medium mb-1">
                {progressLabel}
              </label>
              <input
                type="number"
                min="0"
                value={waypointValue}
                onInput={(e) =>
                  setWaypointValue((e.target as HTMLInputElement).value)
                }
                placeholder={`${progressLabel}...`}
                class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                {secondaryLabel} <span class="text-text-tertiary font-normal text-xs">(opt)</span>
              </label>
              <input
                type="number"
                min="0"
                value={secondaryValue}
                onInput={(e) =>
                  setSecondaryValue((e.target as HTMLInputElement).value)
                }
                placeholder={isAnime ? 'Seconds...' : 'Page...'}
                class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm font-medium">
                Source URL <span class="text-text-tertiary font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.url) setSourceUrl(tab.url);
                }}
                class="text-xs text-accent hover:text-accent-hover"
              >
                Use Current Tab
              </button>
            </div>
            <input
              type="url"
              value={sourceUrl}
              onInput={(e) => setSourceUrl((e.target as HTMLInputElement).value)}
              placeholder="https://..."
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Note <span class="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onInput={(e) => setNote((e.target as HTMLInputElement).value)}
              placeholder="Add a note..."
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={!waypointValue}
            class="w-full px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Waypoint
          </button>
        </form>

        {/* History Section */}
        <div class="pt-4 border-t border-border">
          <button
            onClick={loadHistory}
            class="flex items-center justify-between w-full text-sm font-medium"
          >
            <span>History</span>
            <span class="text-text-tertiary">
              {loadingHistory ? '...' : showHistory ? '−' : '+'}
            </span>
          </button>
          {showHistory && history.length > 0 && (
            <ul class="mt-3 space-y-2">
              {history.map((wp) => (
                <li
                  key={wp.id}
                  class="p-2 bg-surface-secondary rounded text-xs"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{formatProgress(wp)}</span>
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => onEditWaypoint(wp)}
                        class="text-text-tertiary hover:text-accent"
                      >
                        Edit
                      </button>
                      <span class="text-text-tertiary">
                        {formatRelativeTime(wp.createdAt)}
                      </span>
                    </div>
                  </div>
                  {wp.note && (
                    <p class="text-text-tertiary mt-1">{wp.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showHistory && history.length === 0 && (
            <p class="mt-3 text-xs text-text-tertiary">No history yet</p>
          )}
        </div>

        {/* Delete Section */}
        <div class="pt-4 border-t border-border">
          {showDeleteConfirm ? (
            <div class="space-y-2">
              <p class="text-sm text-text-secondary">
                Delete "{work.title}"? This cannot be undone.
              </p>
              <div class="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  class="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  class="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              class="text-sm text-red-600 hover:text-red-700"
            >
              Delete this work
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditWaypointForm({
  waypoint,
  work,
  onSubmit,
  onDelete,
  onCancel,
}: {
  waypoint: Waypoint;
  work: Work;
  onSubmit: (
    data: Partial<Pick<Waypoint, 'chapter' | 'episode' | 'page' | 'timestamp' | 'percentage' | 'note' | 'sourceUrl'>>
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const isAnime = work.type === 'anime';
  const progressField = isAnime ? 'episode' : 'chapter';
  const progressLabel = isAnime ? 'Episode' : 'Chapter';
  const secondaryField = isAnime ? 'timestamp' : 'page';
  const secondaryLabel = isAnime ? 'Timestamp (seconds)' : 'Page';
  const initialValue = waypoint[progressField]?.toString() ?? '';
  const initialSecondary = waypoint[secondaryField]?.toString() ?? '';

  const [value, setValue] = useState(initialValue);
  const [secondaryValue, setSecondaryValue] = useState(initialSecondary);
  const [note, setNote] = useState(waypoint.note ?? '');
  const [sourceUrl, setSourceUrl] = useState(waypoint.sourceUrl ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const secondaryParsed = parseInt(secondaryValue, 10);
    const hasSecondary = !isNaN(secondaryParsed) && secondaryParsed >= 0;

    onSubmit({
      [progressField]: numValue,
      // Clear secondary if empty, otherwise set it
      [secondaryField]: hasSecondary ? secondaryParsed : undefined,
      note: note.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
  }

  return (
    <div ref={containerRef} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Edit Waypoint</h2>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <form onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p class="text-xs text-text-tertiary mb-3">
            Editing waypoint for "{work.title}"
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-sm font-medium mb-1">{progressLabel}</label>
            <input
              type="number"
              min="0"
              value={value}
              onInput={(e) => setValue((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              {secondaryLabel} <span class="text-text-tertiary font-normal text-xs">(opt)</span>
            </label>
            <input
              type="number"
              min="0"
              value={secondaryValue}
              onInput={(e) => setSecondaryValue((e.target as HTMLInputElement).value)}
              placeholder={isAnime ? 'Seconds...' : 'Page...'}
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-medium">
              Source URL <span class="text-text-tertiary font-normal">(optional)</span>
            </label>
            <button
              type="button"
              onClick={async () => {
                const [tab] = await chrome.tabs.query({
                  active: true,
                  currentWindow: true,
                });
                if (tab?.url) setSourceUrl(tab.url);
              }}
              class="text-xs text-accent hover:text-accent-hover"
            >
              Use Current Tab
            </button>
          </div>
          <input
            type="url"
            value={sourceUrl}
            onInput={(e) => setSourceUrl((e.target as HTMLInputElement).value)}
            placeholder="https://..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">
            Note <span class="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onInput={(e) => setNote((e.target as HTMLInputElement).value)}
            placeholder="Add a note..."
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        {/* Delete Section */}
        <div class="pt-4 border-t border-border">
          {showDeleteConfirm ? (
            <div class="space-y-2">
              <p class="text-sm text-text-secondary">
                Delete this waypoint? This cannot be undone.
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  class="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  class="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              class="text-sm text-red-600 hover:text-red-700"
            >
              Delete this waypoint
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
