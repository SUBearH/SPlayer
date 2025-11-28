// 图片离线缓存管理（支持 Data URL 格式）
const IMAGE_CACHE_STORAGE_KEY = "splayer_image_cache";
const imageCache = new Map<string, string>(); // URL -> Data URL

/**
 * 初始化图片缓存，从本地存储加载
 */
export function initializeImageCache(): void {
  try {
    const stored = localStorage.getItem(IMAGE_CACHE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([key, value]) => {
        imageCache.set(key, value as string);
      });
    }
  } catch (error) {
    console.error("Failed to load image cache from localStorage:", error);
  }
}

/**
 * 保存图片缓存到本地存储
 */
export function saveImageCache(): void {
  try {
    const data: Record<string, string> = {};
    imageCache.forEach((value, key) => {
      data[key] = value;
    });
    localStorage.setItem(IMAGE_CACHE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save image cache to localStorage:", error);
  }
}

/**
 * 获取缓存的图片 Data URL
 * @param url 原始图片 URL
 * @returns Data URL（如果不存在则返回原 URL）
 */
export function getCachedImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  const cached = imageCache.get(url);
  if (cached) {
    return cached;
  }

  // 如果没有缓存，返回原 URL（在线时会正常加载）
  return url;
}

/**
 * 缓存图片 Data URL
 * @param url 原始图片 URL
 * @param dataUrl Data URL
 */
export function cacheImageUrl(url: string, dataUrl: string): void {
  if (!url || !dataUrl) return;

  // 只缓存 Data URL 格式的图片（通常是本地音乐的封面）
  if (!dataUrl.startsWith("data:")) return;

  // 避免缓存过大，限制大小在 100KB 以内
  if (dataUrl.length > 100000) {
    console.warn(`Image Data URL too large (${dataUrl.length} bytes) for URL: ${url}`);
    return;
  }

  imageCache.set(url, dataUrl);
}

/**
 * 预加载网络图片并转换为 Data URL 缓存
 * @param url 图片 URL
 * @returns Promise<Data URL>
 */
export async function preloadAndCacheImage(url: string): Promise<string> {
  if (!url) return "";

  // 先检查缓存
  const cached = imageCache.get(url);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url} (status: ${response.status})`);
      return url; // 加载失败，返回原 URL
    }

    const blob = await response.blob();

    // 限制图片大小
    if (blob.size > 100000) {
      console.warn(`Image too large (${blob.size} bytes) for URL: ${url}`);
      return url; // 太大则不缓存，返回原 URL
    }

    // 转换为 Data URL
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          // 缓存 Data URL
          imageCache.set(url, dataUrl);
          resolve(dataUrl);
        } else {
          resolve(url);
        }
      };
      reader.onerror = () => {
        console.error(`FileReader error for URL: ${url}`);
        resolve(url); // 转换失败，返回原 URL
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to preload and cache image: ${url}`, error);
    return url;
  }
}

/**
 * 清空所有图片缓存
 */
export function clearImageCache(): void {
  imageCache.clear();
  try {
    localStorage.removeItem(IMAGE_CACHE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear image cache from localStorage:", error);
  }
}

/**
 * 获取缓存统计信息
 */
export function getImageCacheStats(): { count: number; size: number } {
  let size = 0;
  imageCache.forEach((value) => {
    size += value.length;
  });

  return {
    count: imageCache.size,
    size: Math.round(size / 1024), // KB
  };
}

export default imageCache;
