/**
 * Metadata fetching service for external libraries
 * Supports multiple sources with cascading fallback:
 * - AniList (anime, manga)
 * - Jikan/MAL (anime, manga - backup)
 * - MangaDex (manga, webcomic)
 * - Open Library (novels)
 */

import type { MediaType } from './types';
import { calculateTitleSimilarity, normalizeTitle } from './utils';

export type MetadataSource = 'anilist' | 'mal' | 'mangadex' | 'openlibrary';

export interface MediaMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  source: MetadataSource;
}

// Default placeholder for when all sources fail
export const PLACEHOLDER_THUMBNAIL = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <rect width="100" height="140" fill="#3f3f46"/>
  <path d="M35 55 L50 75 L65 55 M35 85 L65 85" stroke="#71717a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`);

// Minimum similarity score to accept a match (0.7 = 70% similar)
const MIN_MATCH_THRESHOLD = 0.7;

// ============================================================================
// AniList API (Primary for anime/manga)
// ============================================================================

export async function searchAniList(
  title: string,
  type: MediaType
): Promise<MediaMetadata | null> {
  const aniListType = type === 'anime' ? 'ANIME' : 'MANGA';

  // Fetch multiple results to find the best match
  const query = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          synonyms
          coverImage {
            large
            medium
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          search: title,
          type: aniListType,
        },
      }),
    });

    if (!response.ok) {
      console.warn('AniList API error:', response.status);
      return null;
    }

    const result = await response.json();
    const mediaList = result.data?.Page?.media;

    if (!mediaList || mediaList.length === 0) {
      return null;
    }

    // Score each result and find the best match
    let bestMatch: { media: any; score: number; titleText: string } | null = null;

    for (const media of mediaList) {
      // Collect all title variants
      const allTitles: string[] = [
        media.title.english,
        media.title.romaji,
        media.title.native,
        ...(media.synonyms || []),
      ].filter((t): t is string => typeof t === 'string' && t.length > 0);

      // Find the best matching title variant
      let bestTitleScore = 0;
      let bestTitleText = media.title.english || media.title.romaji || media.title.native;

      for (const mediaTitle of allTitles) {
        const score = calculateTitleSimilarity(title, mediaTitle);
        if (score > bestTitleScore) {
          bestTitleScore = score;
          bestTitleText = mediaTitle;
        }
      }

      // Track if this is our best match so far
      if (!bestMatch || bestTitleScore > bestMatch.score) {
        bestMatch = { media, score: bestTitleScore, titleText: bestTitleText };
      }

      // If we found an exact match, stop early
      if (bestTitleScore >= 0.95) break;
    }

    // Check if best match meets threshold
    if (!bestMatch || bestMatch.score < MIN_MATCH_THRESHOLD) {
      console.warn(`AniList: No good match for "${title}" (best score: ${bestMatch?.score.toFixed(2) ?? 0})`);
      return null;
    }

    const media = bestMatch.media;

    return {
      id: String(media.id),
      title: bestMatch.titleText,
      thumbnailUrl: media.coverImage.large || media.coverImage.medium,
      source: 'anilist',
    };
  } catch (error) {
    console.warn('Failed to fetch from AniList:', error);
    return null;
  }
}

export async function getAniListById(id: string): Promise<MediaMetadata | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: parseInt(id, 10) },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const media = result.data?.Media;

    if (!media) {
      return null;
    }

    return {
      id: String(media.id),
      title: media.title.english || media.title.romaji || media.title.native,
      thumbnailUrl: media.coverImage.large || media.coverImage.medium,
      source: 'anilist',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Jikan/MAL API (Backup for anime/manga)
// ============================================================================

export async function searchJikan(
  title: string,
  type: MediaType
): Promise<MediaMetadata | null> {
  const jikanType = type === 'anime' ? 'anime' : 'manga';
  // Fetch multiple results to find the best match
  const url = `https://api.jikan.moe/v4/${jikanType}?q=${encodeURIComponent(title)}&limit=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('Jikan API error:', response.status);
      return null;
    }

    const result = await response.json();
    const mediaList = result.data;

    if (!mediaList || mediaList.length === 0) {
      return null;
    }

    // Score each result and find the best match
    let bestMatch: { media: any; score: number; titleText: string } | null = null;

    for (const media of mediaList) {
      // Collect all title variants
      const allTitles: string[] = [
        media.title_english,
        media.title,
        media.title_japanese,
        ...(media.titles?.map((t: { title: string }) => t.title) || []),
      ].filter((t): t is string => typeof t === 'string' && t.length > 0);

      // Find the best matching title variant
      let bestTitleScore = 0;
      let bestTitleText = media.title_english || media.title;

      for (const mediaTitle of allTitles) {
        const score = calculateTitleSimilarity(title, mediaTitle);
        if (score > bestTitleScore) {
          bestTitleScore = score;
          bestTitleText = mediaTitle;
        }
      }

      // Track if this is our best match so far
      if (!bestMatch || bestTitleScore > bestMatch.score) {
        bestMatch = { media, score: bestTitleScore, titleText: bestTitleText };
      }

      // If we found an exact match, stop early
      if (bestTitleScore >= 0.95) break;
    }

    // Check if best match meets threshold
    if (!bestMatch || bestMatch.score < MIN_MATCH_THRESHOLD) {
      console.warn(`Jikan: No good match for "${title}" (best score: ${bestMatch?.score.toFixed(2) ?? 0})`);
      return null;
    }

    const media = bestMatch.media;

    // Jikan provides multiple image sizes
    const imageUrl =
      media.images?.jpg?.large_image_url ||
      media.images?.jpg?.image_url ||
      media.images?.webp?.large_image_url ||
      media.images?.webp?.image_url;

    if (!imageUrl) {
      return null;
    }

    return {
      id: String(media.mal_id),
      title: bestMatch.titleText,
      thumbnailUrl: imageUrl,
      source: 'mal',
    };
  } catch (error) {
    console.warn('Failed to fetch from Jikan:', error);
    return null;
  }
}

export async function getJikanById(
  id: string,
  type: MediaType
): Promise<MediaMetadata | null> {
  const jikanType = type === 'anime' ? 'anime' : 'manga';
  const url = `https://api.jikan.moe/v4/${jikanType}/${id}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const media = result.data;

    if (!media) {
      return null;
    }

    const imageUrl =
      media.images?.jpg?.large_image_url ||
      media.images?.jpg?.image_url ||
      media.images?.webp?.large_image_url ||
      media.images?.webp?.image_url;

    if (!imageUrl) {
      return null;
    }

    return {
      id: String(media.mal_id),
      title: media.title_english || media.title,
      thumbnailUrl: imageUrl,
      source: 'mal',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// MangaDex API (Primary for webcomics, backup for manga)
// ============================================================================

export async function searchMangaDex(title: string): Promise<MediaMetadata | null> {
  // Fetch multiple results to find the best match
  const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=10&includes[]=cover_art`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('MangaDex API error:', response.status);
      return null;
    }

    const result = await response.json();
    const mangaList = result.data;

    if (!mangaList || mangaList.length === 0) {
      return null;
    }

    // Score each result and find the best match
    let bestMatch: { manga: any; score: number; titleText: string } | null = null;

    for (const manga of mangaList) {
      // Get all available titles for this manga
      const titles = manga.attributes?.title || {};
      const altTitles = manga.attributes?.altTitles || [];

      // Collect all title variants
      const allTitles: string[] = [
        titles.en,
        titles['en-us'],
        titles['ja-ro'],
        titles.ja,
        ...Object.values(titles),
        ...altTitles.flatMap((alt: Record<string, string>) => Object.values(alt)),
      ].filter((t): t is string => typeof t === 'string' && t.length > 0);

      // Find the best matching title variant
      let bestTitleScore = 0;
      let bestTitleText = allTitles[0] || title;

      for (const mangaTitle of allTitles) {
        const score = calculateTitleSimilarity(title, mangaTitle);
        if (score > bestTitleScore) {
          bestTitleScore = score;
          bestTitleText = mangaTitle;
        }
      }

      // Track if this is our best match so far
      if (!bestMatch || bestTitleScore > bestMatch.score) {
        bestMatch = { manga, score: bestTitleScore, titleText: bestTitleText };
      }

      // If we found an exact match, stop early
      if (bestTitleScore >= 0.95) break;
    }

    // Check if best match meets threshold
    if (!bestMatch || bestMatch.score < MIN_MATCH_THRESHOLD) {
      console.warn(`MangaDex: No good match for "${title}" (best score: ${bestMatch?.score.toFixed(2) ?? 0})`);
      return null;
    }

    const manga = bestMatch.manga;

    // Find cover art relationship
    const coverRel = manga.relationships?.find(
      (rel: { type: string }) => rel.type === 'cover_art'
    );
    const coverFileName = coverRel?.attributes?.fileName;

    if (!coverFileName) {
      return null;
    }

    // MangaDex cover URL format
    const thumbnailUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`;

    return {
      id: manga.id,
      title: bestMatch.titleText,
      thumbnailUrl,
      source: 'mangadex',
    };
  } catch (error) {
    console.warn('Failed to fetch from MangaDex:', error);
    return null;
  }
}

export async function getMangaDexById(id: string): Promise<MediaMetadata | null> {
  const url = `https://api.mangadex.org/manga/${id}?includes[]=cover_art`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const manga = result.data;

    if (!manga) {
      return null;
    }

    const coverRel = manga.relationships?.find(
      (rel: { type: string }) => rel.type === 'cover_art'
    );
    const coverFileName = coverRel?.attributes?.fileName;

    if (!coverFileName) {
      return null;
    }

    const thumbnailUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`;
    const titles = manga.attributes?.title || {};
    const titleText =
      titles.en || titles['ja-ro'] || titles.ja || Object.values(titles)[0];

    return {
      id: manga.id,
      title: titleText as string,
      thumbnailUrl,
      source: 'mangadex',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Open Library API (Primary for novels)
// ============================================================================

export async function searchOpenLibrary(title: string): Promise<MediaMetadata | null> {
  // Fetch multiple results to find the best match
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('Open Library API error:', response.status);
      return null;
    }

    const result = await response.json();
    const bookList = result.docs;

    if (!bookList || bookList.length === 0) {
      return null;
    }

    // Score each result and find the best match
    let bestMatch: { book: any; score: number } | null = null;

    for (const book of bookList) {
      // Open Library mainly has the main title, but might have alternative titles
      const allTitles: string[] = [
        book.title,
        ...(book.alternative_title || []),
      ].filter((t): t is string => typeof t === 'string' && t.length > 0);

      // Find the best matching title variant
      let bestTitleScore = 0;

      for (const bookTitle of allTitles) {
        const score = calculateTitleSimilarity(title, bookTitle);
        if (score > bestTitleScore) {
          bestTitleScore = score;
        }
      }

      // Track if this is our best match so far
      if (!bestMatch || bestTitleScore > bestMatch.score) {
        bestMatch = { book, score: bestTitleScore };
      }

      // If we found an exact match, stop early
      if (bestTitleScore >= 0.95) break;
    }

    // Check if best match meets threshold
    if (!bestMatch || bestMatch.score < MIN_MATCH_THRESHOLD) {
      console.warn(`Open Library: No good match for "${title}" (best score: ${bestMatch?.score.toFixed(2) ?? 0})`);
      return null;
    }

    const book = bestMatch.book;

    // Open Library cover URL format
    // Try cover_i (cover ID), then ISBN
    let thumbnailUrl: string | null = null;

    if (book.cover_i) {
      thumbnailUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
    } else if (book.isbn?.[0]) {
      thumbnailUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`;
    }

    if (!thumbnailUrl) {
      return null;
    }

    return {
      id: book.key || String(book.cover_i),
      title: book.title,
      thumbnailUrl,
      source: 'openlibrary',
    };
  } catch (error) {
    console.warn('Failed to fetch from Open Library:', error);
    return null;
  }
}

export async function getOpenLibraryById(id: string): Promise<MediaMetadata | null> {
  // Open Library IDs are like "/works/OL123W"
  const url = `https://openlibrary.org${id}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const book = await response.json();

    if (!book) {
      return null;
    }

    // Get cover from covers array
    const coverId = book.covers?.[0];
    if (!coverId) {
      return null;
    }

    const thumbnailUrl = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;

    return {
      id: book.key || id,
      title: book.title,
      thumbnailUrl,
      source: 'openlibrary',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Cascading Search - Try multiple sources with fallback
// ============================================================================

interface SearchConfig {
  primary: (title: string, type: MediaType) => Promise<MediaMetadata | null>;
  fallbacks: Array<(title: string, type: MediaType) => Promise<MediaMetadata | null>>;
}

// Define search strategy per media type
const SEARCH_STRATEGIES: Record<MediaType, SearchConfig> = {
  anime: {
    primary: searchAniList,
    fallbacks: [searchJikan],
  },
  manga: {
    primary: searchAniList,
    fallbacks: [searchJikan, (title) => searchMangaDex(title)],
  },
  webcomic: {
    primary: (title) => searchMangaDex(title),
    fallbacks: [(title) => searchAniList(title, 'manga')],
  },
  novel: {
    primary: (title) => searchOpenLibrary(title),
    fallbacks: [], // No good fallback for novels currently
  },
};

/**
 * Search for media metadata with cascading fallback
 * Tries primary source first, then fallbacks in order
 */
export async function searchMetadata(
  title: string,
  type: MediaType
): Promise<MediaMetadata | null> {
  const strategy = SEARCH_STRATEGIES[type];

  // Normalize the title to remove junk like "in English Online", "Volume 1", etc.
  const cleanTitle = normalizeTitle(title);

  // Try primary source with clean title
  const primaryResult = await strategy.primary(cleanTitle, type);
  if (primaryResult) {
    return primaryResult;
  }

  // Try fallbacks in order
  for (const fallback of strategy.fallbacks) {
    const fallbackResult = await fallback(cleanTitle, type);
    if (fallbackResult) {
      return fallbackResult;
    }
  }

  // All sources failed
  return null;
}

/**
 * Get metadata by ID from a specific source
 */
export async function getMetadataById(
  id: string,
  source: MetadataSource,
  type: MediaType
): Promise<MediaMetadata | null> {
  switch (source) {
    case 'anilist':
      return getAniListById(id);
    case 'mal':
      return getJikanById(id, type);
    case 'mangadex':
      return getMangaDexById(id);
    case 'openlibrary':
      return getOpenLibraryById(id);
    default:
      return null;
  }
}

/**
 * Check if a thumbnail URL is valid/accessible
 * Returns the URL if valid, or null if broken
 */
export async function validateThumbnail(url: string): Promise<string | null> {
  if (!url || url === PLACEHOLDER_THUMBNAIL) {
    return null;
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get thumbnail URL with graceful fallback to placeholder
 */
export function getThumbnailWithFallback(thumbnailUrl?: string): string {
  return thumbnailUrl || PLACEHOLDER_THUMBNAIL;
}
