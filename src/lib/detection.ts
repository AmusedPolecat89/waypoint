/**
 * Media detection and content extraction utilities
 *
 * Shared module for detecting media type, extracting progress,
 * and cleaning titles from URLs and page content.
 */

import type { MediaType } from './types';

/**
 * Get domain from URL, stripping www prefix
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// =============================================================================
// KEYWORD LISTS
// =============================================================================

/** Keywords that indicate anime content */
export const ANIME_KEYWORDS = [
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
  'crunchyroll', 'funimation', 'hidive', 'netflix anime', 'animelab',
];

/** Keywords that indicate manga content (Japanese comics) */
export const MANGA_KEYWORDS = [
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
  'right to left', 'rtl',
];

/** Keywords that indicate webcomic content (Korean/Chinese/Western) */
export const WEBCOMIC_KEYWORDS = [
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
  'tower', 'dungeon', 'awakening', 'martial arts', 'murim',
];

/** Keywords that indicate novel content */
export const NOVEL_KEYWORDS = [
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
  'original', 'original fiction', 'oc', 'original character',
];

// =============================================================================
// KNOWN SITES
// =============================================================================

/** Known anime streaming/tracking sites */
export const ANIME_SITES = [
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
  'watchcartoononline', 'kimcartoon',
];

/** Known manga sites (primarily Japanese manga) */
export const MANGA_SITES = [
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
  'rawkuma.com', 'klmanga.com', 'manga1000.com', 'manga1001.com',
];

/** Known webcomic sites (Korean/Chinese/Western) */
export const WEBCOMIC_SITES = [
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
  '1stkissmanga.io', '1stkissmanga.me', 'manhwa-freak.com',
];

/** Known novel sites */
export const NOVEL_SITES = [
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
  'novelupdates.com', 'lndb.info',
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect media type from URL, title, and optional page content
 */
export function detectMediaType(
  url: string,
  title: string,
  pageContent: string = ''
): MediaType {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const contentLower = pageContent.toLowerCase();
  const domain = getDomain(url);

  // Combine all text for keyword scanning
  const allText = `${urlLower} ${titleLower} ${contentLower}`;

  // Keyword scores for each category
  const keywordScores: Record<MediaType, number> = {
    anime: 0,
    manga: 0,
    webcomic: 0,
    novel: 0,
  };

  // Count keyword occurrences (longer keywords = more weight)
  for (const kw of ANIME_KEYWORDS) {
    if (allText.includes(kw)) keywordScores.anime += kw.length > 4 ? 2 : 1;
  }
  for (const kw of MANGA_KEYWORDS) {
    if (allText.includes(kw)) keywordScores.manga += kw.length > 4 ? 2 : 1;
  }
  for (const kw of WEBCOMIC_KEYWORDS) {
    if (allText.includes(kw)) keywordScores.webcomic += kw.length > 4 ? 2 : 1;
  }
  for (const kw of NOVEL_KEYWORDS) {
    if (allText.includes(kw)) keywordScores.novel += kw.length > 4 ? 2 : 1;
  }

  // Check domain for definitive matches (strong boost)
  for (const site of ANIME_SITES) {
    if (domain.includes(site) || urlLower.includes(site)) {
      keywordScores.anime += 50;
    }
  }
  for (const site of MANGA_SITES) {
    if (domain.includes(site) || urlLower.includes(site)) {
      keywordScores.manga += 50;
    }
  }
  for (const site of WEBCOMIC_SITES) {
    if (domain.includes(site) || urlLower.includes(site)) {
      keywordScores.webcomic += 50;
    }
  }
  for (const site of NOVEL_SITES) {
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

// =============================================================================
// PROGRESS EXTRACTION
// =============================================================================

/** Episode number patterns (for anime) */
const EPISODE_PATTERNS = [
  /episode[_\-\s]*(\d+)/i,
  /ep[_\-\s]*(\d+)/i,
  /e(\d+)(?!\d)/i,
  /\bs(\d+)e(\d+)/i, // S01E05 format - captures episode in group 2
  /\bepisode\s*(\d+)/i,
  /【(\d+)】/, // Japanese episode markers
  /第(\d+)話/, // Japanese episode
  /episode[^\d]*(\d+)/i,
];

/** Chapter number patterns (for manga/comics/novels) */
const CHAPTER_PATTERNS = [
  /chapter[_\-\s]*(\d+(?:\.\d+)?)/i,
  /ch[_\-\.\s]*(\d+(?:\.\d+)?)/i,
  /chap[_\-\.\s]*(\d+(?:\.\d+)?)/i,
  /c(\d+)(?!\d)/i,
  /(?:^|\/|-)(\d+(?:\.\d+)?)(?:\/|$|-|\.html)/, // URL number patterns
  /第(\d+)章/, // Japanese chapter
  /第(\d+)话/, // Chinese chapter
  /[\[\(](\d+)[\]\)]/, // [123] or (123)
  /\s(\d+)(?:\s|$)/, // Loose number at end
];

/**
 * Extract chapter/episode number from URL and title
 */
export function extractProgress(
  url: string,
  title: string,
  mediaType: MediaType
): { chapter?: number; episode?: number } {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  const isAnime = mediaType === 'anime';
  const patterns = isAnime ? EPISODE_PATTERNS : CHAPTER_PATTERNS;

  // Try URL first (more reliable)
  for (const pattern of patterns) {
    const match = urlLower.match(pattern);
    if (match) {
      // Handle S01E05 format specially (episode is in group 2)
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
 * Simple progress extraction without media type context
 * Used by background service worker where we don't scan page content
 */
export function extractProgressSimple(
  url: string,
  title: string
): { chapter?: number; episode?: number } {
  const allPatterns = [
    // Common URL patterns
    /chapter[_-]?(\d+)/i,
    /ch[_-]?(\d+)/i,
    /episode[_-]?(\d+)/i,
    /ep[_-]?(\d+)/i,
    /\/(\d+)\/?$/, // Ends with number
    // Title patterns
    /chapter\s*(\d+)/i,
    /ch\.?\s*(\d+)/i,
    /episode\s*(\d+)/i,
    /ep\.?\s*(\d+)/i,
  ];

  for (const pattern of allPatterns) {
    const urlMatch = url.match(pattern);
    if (urlMatch) {
      const num = parseInt(urlMatch[1], 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        if (pattern.source.toLowerCase().includes('ep')) {
          return { episode: num };
        }
        return { chapter: num };
      }
    }

    const titleMatch = title.match(pattern);
    if (titleMatch) {
      const num = parseInt(titleMatch[1], 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        if (pattern.source.toLowerCase().includes('ep')) {
          return { episode: num };
        }
        return { chapter: num };
      }
    }
  }

  return {};
}

// =============================================================================
// TITLE EXTRACTION
// =============================================================================

/** Patterns to remove from end of page titles */
const TITLE_SUFFIX_PATTERNS = [
  / [-–—|:] .{0,30}$/, // "Title - Site Name" (short suffixes only)
  / :: .+$/,
  /\s*\([^)]{0,20}\)$/, // (Site Name) at end
  /\s*【[^】]+】$/, // Japanese brackets at end
  / - Read .+$/i,
  / Chapter \d+.*$/i,
  / Episode \d+.*$/i,
  / Ch\.\s*\d+.*$/i,
  / Ep\.\s*\d+.*$/i,
  / #\d+.*$/,
  /\s*-\s*Chapter\s*\d+/i,
  /\s*-\s*Episode\s*\d+/i,
];

/** Patterns to remove from start of page titles */
const TITLE_PREFIX_PATTERNS = [
  /^Read\s+/i,
  /^Watch\s+/i,
  /^Stream\s+/i,
  /^Chapter\s*\d+\s*[-–:]\s*/i,
  /^Episode\s*\d+\s*[-–:]\s*/i,
];

/**
 * Clean up and extract the work title from page title
 */
export function extractTitle(pageTitle: string, url: string): string {
  let title = pageTitle;

  // Remove suffix patterns
  for (const pattern of TITLE_SUFFIX_PATTERNS) {
    title = title.replace(pattern, '');
  }

  // Remove prefix patterns
  for (const pattern of TITLE_PREFIX_PATTERNS) {
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
export function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);

    // Skip common non-title segments
    const skipSegments = [
      'manga', 'comic', 'anime', 'novel', 'read', 'watch',
      'chapter', 'episode', 'series', 'title',
    ];

    for (const part of parts) {
      // Skip if it's a number or common segment
      if (/^\d+$/.test(part) || skipSegments.includes(part.toLowerCase())) {
        continue;
      }

      // Convert URL slug to readable title
      const cleaned = part
        .replace(/[-_]/g, ' ')
        .replace(/\.(html?|php|aspx?)$/i, '')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      if (cleaned.length >= 3) {
        return cleaned;
      }
    }
  } catch {
    // ignore URL parsing errors
  }
  return '';
}

/**
 * Simple title cleaning for background service worker
 */
export function cleanTitle(pageTitle: string): string {
  let title = pageTitle;

  // Remove common site suffixes
  const suffixPatterns = [
    / [-–—|] .+$/, // "Title - Site Name" or "Title | Site Name"
    / :: .+$/, // "Title :: Site Name"
    /\s*\(.+\)$/, // "Title (Site Name)"
  ];

  for (const pattern of suffixPatterns) {
    title = title.replace(pattern, '');
  }

  return title.trim() || 'Untitled';
}
