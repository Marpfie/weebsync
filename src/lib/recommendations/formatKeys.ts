import type { MediaType, Recommendation } from './types'

/**
 * Synthetic "format" codes used by the FilterBar. Maps AniList's `format` +
 * `countryOfOrigin` (and `genres` for Doujinshi) onto a flat enum so the user
 * can pick "Manhwa" or "Doujin" even though AniList exposes them only via
 * the country/genre fields.
 */
export type AnimeFormatKey = 'MOVIE' | 'ONA' | 'OVA' | 'SPECIAL' | 'TV' | 'TV_SHORT'
export type FormatKey = AnimeFormatKey | MangaFormatKey
export type MangaFormatKey = 'DOUJIN' | 'MANGA' | 'MANHUA' | 'MANHWA' | 'NOVEL' | 'ONE_SHOT'

export const ANIME_FORMAT_KEYS: AnimeFormatKey[] = ['TV', 'MOVIE', 'OVA', 'SPECIAL', 'ONA', 'TV_SHORT']
export const MANGA_FORMAT_KEYS: MangaFormatKey[] = ['MANGA', 'MANHWA', 'MANHUA', 'DOUJIN', 'NOVEL', 'ONE_SHOT']

export const formatKeysFor = (mediaType: MediaType): readonly FormatKey[] =>
    mediaType === 'ANIME' ? ANIME_FORMAT_KEYS : MANGA_FORMAT_KEYS

/** Resolve a recommendation to its synthetic format key, or null if unknown. */
export const deriveFormatKey = (rec: Recommendation): FormatKey | null => {
    if (rec.mediaType === 'ANIME') {
        if (rec.format && (ANIME_FORMAT_KEYS as string[]).includes(rec.format)) return rec.format as AnimeFormatKey
        return null
    }
    if (rec.format === 'NOVEL') return 'NOVEL'
    if (rec.format === 'ONE_SHOT') return 'ONE_SHOT'
    if (rec.genres?.includes('Doujinshi')) return 'DOUJIN'
    const country = rec.countryOfOrigin
    if (country === 'KR') return 'MANHWA'
    if (country === 'CN' || country === 'TW' || country === 'HK') return 'MANHUA'
    return 'MANGA'
}
