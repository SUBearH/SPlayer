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
 * @returns 返回更新结果 { added: 新增数, updated: 更新数, removed: 删除数 }
 */
export function incrementUpdateLikedSongs(newSongs: SongType[], isRefresh: boolean = false): { added: number; updated: number; removed: number } {
  if (!newSongs || newSongs.length === 0) return { added: 0, updated: 0, removed: 0 };

  const result = { added: 0, updated: 0, removed: 0 };

  if (isRefresh) {
    // 刷新模式：替换整个列表
    const oldCount = likedListCache.songs.length;
    likedListCache.songs = newSongs;
    result.removed = Math.max(0, oldCount - newSongs.length);
    result.added = Math.max(0, newSongs.length - oldCount);
    result.updated = Math.min(oldCount, newSongs.length);
  } else {
    // 增量模式：只添加新歌曲，更新现有歌曲信息
    const existingMap = new Map(likedListCache.songs.map(s => [s.id, s]));
    const newSongIds = new Set<number>();

    newSongs.forEach(newSong => {
      newSongIds.add(newSong.id);
      const existing = existingMap.get(newSong.id);

      if (!existing) {
        // 新歌曲
        likedListCache.songs.push(newSong);
        result.added++;
      } else if (JSON.stringify(existing) !== JSON.stringify(newSong)) {
        // 现有歌曲但信息有更新（音质、cover 等）
        Object.assign(existing, newSong);
        result.updated++;
      }
    });
  }

  likedListCache.lastUpdateTime = Date.now();
  return result;
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
