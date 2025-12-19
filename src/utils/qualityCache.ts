import { MapCache } from "./storage";

// 全局缓存管理（包括音质、封面等）
interface SongCache {
  quality?: string;
  cover?: string;
  [key: string]: any;
}

const CACHE_STORAGE_KEY = "splayer_song_cache";
const songCache = new MapCache<SongCache>(CACHE_STORAGE_KEY);

/**
 * 初始化缓存，从本地存储加载
 */
export function initializeCache(): void {
  // 自动加载
}

/**
 * 保存所有缓存到本地存储
 */
export function saveCache(): void {
  songCache.save();
}

/**
 * 更新音质缓存（带比对机制）
 * @param songId 歌曲ID
 * @param quality 服务器返回的音质信息
 * @returns 更新后的音质值（如果有更新返回新值，否则返回 undefined）
 */
export function updateCachedQuality(songId: number | undefined, quality: string): string | undefined {
  if (!songId || !quality) return undefined;
  const existing = songCache.get(songId);
  const oldQuality = existing?.quality;

  // 如果新值与缓存不同，更新缓存并返回新值
  if (oldQuality !== quality) {
    const newData = { ...existing, quality };
    songCache.set(songId, newData);
    return quality;
  }
  return undefined;
}

/**
 * 获取缓存的音质信息
 * @param songId 歌曲ID
 * @returns 缓存的音质信息，不存在则返回 undefined
 */
export function getCachedQuality(songId: number | undefined): string | undefined {
  if (!songId) return undefined;
  return songCache.get(songId)?.quality;
}

/**
 * 设置音质缓存（直接设置，不比对）
 * @param songId 歌曲ID
 * @param quality 音质信息
 */
export function setCachedQuality(songId: number | undefined, quality: string): void {
  if (!songId || !quality) return;
  const existing = songCache.get(songId) || {};
  songCache.set(songId, { ...existing, quality });
}

/**
 * 更新封面缓存（带比对机制）
 * @param songId 歌曲ID
 * @param cover 服务器返回的封面URL
 * @returns 更新后的封面URL（如果有更新返回新值，否则返回 undefined）
 */
export function updateCachedCover(songId: number | undefined, cover: string): string | undefined {
  if (!songId || !cover) return undefined;
  const existing = songCache.get(songId);
  const oldCover = existing?.cover;

  // 如果新值与缓存不同，更新缓存并返回新值
  if (oldCover !== cover) {
    const newData = { ...existing, cover };
    songCache.set(songId, newData);
    return cover;
  }
  return undefined;
}

/**
 * 获取缓存的封面信息
 * @param songId 歌曲ID
 * @returns 缓存的封面URL，不存在则返回 undefined
 */
export function getCachedCover(songId: number | undefined): string | undefined {
  if (!songId) return undefined;
  return songCache.get(songId)?.cover;
}

/**
 * 设置封面缓存（直接设置，不比对）
 * @param songId 歌曲ID
 * @param cover 封面URL
 */
export function setCachedCover(songId: number | undefined, cover: string): void {
  if (!songId || !cover) return;
  const existing = songCache.get(songId) || {};
  songCache.set(songId, { ...existing, cover });
}

/**
 * 更新缓存数据（带比对机制）
 * @param songId 歌曲ID
 * @param data 服务器返回的数据
 * @returns 哪些字段有更新的对象 { quality: boolean, cover: boolean, ... }
 */
export function updateCachedSongData(songId: number | undefined, data: SongCache): Record<string, boolean> {
  if (!songId || !data) return {};

  const existing = songCache.get(songId) || {};
  const updates: Record<string, boolean> = {};

  // 比对每个字段
  Object.entries(data).forEach(([key, value]) => {
    if (existing[key] !== value) {
      updates[key] = true;
      existing[key] = value;
    } else {
      updates[key] = false;
    }
  });

  if (Object.values(updates).some(v => v)) {
    songCache.set(songId, existing);
  }

  return updates;
}

/**
 * 获取指定歌曲的所有缓存数据
 * @param songId 歌曲ID
 * @returns 缓存的歌曲数据
 */
export function getCachedSongData(songId: number | undefined): SongCache | undefined {
  if (!songId) return undefined;
  return songCache.get(songId);
}

/**
 * 设置指定歌曲的缓存数据（直接设置，不比对）
 * @param songId 歌曲ID
 * @param data 要缓存的数据
 */
export function setCachedSongData(songId: number | undefined, data: SongCache): void {
  if (!songId) return;
  const existing = songCache.get(songId) || {};
  songCache.set(songId, { ...existing, ...data });
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  songCache.clear();
}

export default songCache;
