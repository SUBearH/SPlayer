// 全局音质缓存管理
const qualityCache = new Map<number, string>();

/**
 * 获取缓存的音质信息
 * @param songId 歌曲ID
 * @returns 缓存的音质信息，不存在则返回 undefined
 */
export function getCachedQuality(songId: number | undefined): string | undefined {
  if (!songId) return undefined;
  return qualityCache.get(songId);
}

/**
 * 更新音质缓存
 * @param songId 歌曲ID
 * @param quality 音质信息
 */
export function setCachedQuality(songId: number | undefined, quality: string): void {
  if (!songId || !quality) return;
  qualityCache.set(songId, quality);
}

/**
 * 清空所有缓存
 */
export function clearQualityCache(): void {
  qualityCache.clear();
}

export default qualityCache;
