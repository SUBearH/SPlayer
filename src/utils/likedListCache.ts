// 我喜欢的音乐列表缓存管理
import type { SongType, CoverType } from "@/types/main";

interface LikedListCache {
  detail?: CoverType; // 歌单详情
  songs: SongType[]; // 歌曲列表
  lastUpdateTime?: number; // 最后更新时间
}

const CACHE_STORAGE_KEY = "splayer_liked_list_cache";
const likedListCache: LikedListCache = {
  songs: [],
};

/**
 * 初始化缓存，从本地存储加载
 */
export function initializeLikedListCache(): void {
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      likedListCache.detail = data.detail;
      likedListCache.songs = data.songs || [];
      likedListCache.lastUpdateTime = data.lastUpdateTime;
    }
  } catch (error) {
    console.error("Failed to load liked list cache from localStorage:", error);
  }
}

/**
 * 保存缓存到本地存储
 */
export function saveLikedListCache(): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(likedListCache));
  } catch (error) {
    console.error("Failed to save liked list cache to localStorage:", error);
  }
}

/**
 * 增量更新歌曲列表
 * @param newSongs 新获取的歌曲
 * @param isRefresh 是否为刷新操作
 * @returns 有变化的歌曲数
 */
export function incrementUpdateLikedSongs(newSongs: SongType[], isRefresh: boolean = false): number {
  if (!newSongs || newSongs.length === 0) return 0;

  let updatedCount = 0;

  if (isRefresh) {
    // 刷新模式：替换整个列表
    const oldCount = likedListCache.songs.length;
    likedListCache.songs = newSongs;
    updatedCount = Math.abs(newSongs.length - oldCount) + Math.min(newSongs.length, oldCount);
  } else {
    // 增量模式：只添加新歌曲
    const existingIds = new Set(likedListCache.songs.map(s => s.id));
    const songsToAdd = newSongs.filter(s => !existingIds.has(s.id));

    if (songsToAdd.length > 0) {
      likedListCache.songs.push(...songsToAdd);
      updatedCount = songsToAdd.length;
    }

    // 检测现有歌曲是否有更新（比对音质等信息）
    newSongs.forEach(newSong => {
      const existing = likedListCache.songs.find(s => s.id === newSong.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(newSong)) {
        Object.assign(existing, newSong);
        updatedCount++;
      }
    });
  }

  likedListCache.lastUpdateTime = Date.now();
  return updatedCount;
}

/**
 * 获取缓存的歌曲列表
 */
export function getCachedLikedSongs(): SongType[] {
  return likedListCache.songs;
}

/**
 * 设置歌单详情
 */
export function setCachedLikedListDetail(detail: CoverType): void {
  likedListCache.detail = detail;
}

/**
 * 获取歌单详情
 */
export function getCachedLikedListDetail(): CoverType | undefined {
  return likedListCache.detail;
}

/**
 * 获取缓存中的歌曲总数
 */
export function getCachedLikedSongsCount(): number {
  return likedListCache.songs.length;
}

/**
 * 删除指定歌曲
 */
export function removeLikedSong(ids: number[]): void {
  const idSet = new Set(ids);
  likedListCache.songs = likedListCache.songs.filter(s => !idSet.has(s.id));
}

/**
 * 清空所有缓存
 */
export function clearLikedListCache(): void {
  likedListCache.detail = undefined;
  likedListCache.songs = [];
  likedListCache.lastUpdateTime = undefined;
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear liked list cache from localStorage:", error);
  }
}

export default likedListCache;
