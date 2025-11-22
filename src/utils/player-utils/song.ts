import { songUrl, unlockSongUrl, songQuality } from "@/api/song";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { SongType } from "@/types/main";
import { isElectron } from "../env";
import { getCoverColorData } from "../color";

/**
 * 根据songUrl请求的level参数，获取对应的音质显示名称
 * @param level 设置的音质等级参数
 * @returns 音质显示名称
 */
const getQualityNameByLevel = (level: string): string => {
  const levelMap: Record<string, string> = {
    standard: "标准",
    higher: "较高",
    exhigh: "HQ",
    lossless: "SQ",
    hires: "Hi-Res",
    jyeffect: "环绕声",
    sky: "沉浸音质",
    dolby: "Dolby",
    jymaster: "母带",
  };
  return levelMap[level] || "未知";
};

/**
 * 获取当前播放歌曲
 * @returns 当前播放歌曲
 */
export const getPlaySongData = (): SongType | null => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  // 若为私人FM
  if (statusStore.personalFmMode) {
    return musicStore.personalFMSong;
  }
  // 播放列表
  const playlist = dataStore.playList;
  if (!playlist.length) return null;
  return playlist[statusStore.playIndex];
};

/**
 * 获取播放信息
 * @param song 歌曲
 * @param sep 分隔符
 * @returns 播放信息
 */
export const getPlayerInfo = (song?: SongType, sep: string = "/"): string | null => {
  const playSongData = song || getPlaySongData();
  if (!playSongData) return null;
  // 标题
  const title = `${playSongData.name || "未知歌曲"}`;
  // 歌手
  const artist =
    playSongData.type === "radio"
      ? "播客电台"
      : Array.isArray(playSongData.artists)
        ? playSongData.artists.map((artists: { name: string }) => artists.name).join(sep)
        : String(playSongData?.artists || "未知歌手");
  return `${title} - ${artist}`;
};

/**
 * 获取在线播放链接
 * @param id 歌曲id
 * @returns { url, isTrial, quality } 播放链接、是否为试听、音质等级
 */
export const getOnlineUrl = async (
  id: number,
): Promise<{ url: string | null; isTrial: boolean; quality?: string }> => {
  const settingStore = useSettingStore();
  const res = await songUrl(id, settingStore.songLevel);
  console.log(`🌐 ${id} music data:`, res);
  const songData = res.data?.[0];
  // 是否有播放地址
  if (!songData || !songData?.url) return { url: null, isTrial: false };
  // 是否仅能试听
  const isTrial = songData?.freeTrialInfo !== null;

  // 获取音质等级信息 - 异步获取songQuality数据以确定实际音质
  let quality: string | undefined = getQualityNameByLevel(settingStore.songLevel);
  try {
    const qualityRes = await songQuality(id);
    if (qualityRes?.data) {
      quality = getQualityNameByLevel(settingStore.songLevel);
    }
  } catch (err) {
    console.warn(`获取${id}的音质详情失败:`, err);
  }

  // 返回歌曲地址
  // 客户端直接返回，网页端转 https, 并转换url以便解决音乐链接cors问题
  const normalizedUrl = isElectron
    ? songData.url
    : songData.url
        .replace(/^http:/, "https:")
        .replace(/m804\.music\.126\.net/g, "m801.music.126.net")
        .replace(/m704\.music\.126\.net/g, "m701.music.126.net");
  // 若为试听且未开启试听播放，则将 url 置为空，仅标记为试听
  const finalUrl = isTrial && !settingStore.playSongDemo ? null : normalizedUrl;
  console.log(`🎧 ${id} music url:`, finalUrl, `quality:`, quality);
  return { url: finalUrl, isTrial, quality };
};

/**
 * 获取解锁播放链接
 * @param songData 歌曲数据
 * @returns
 */
export const getUnlockSongUrl = async (songData: SongType): Promise<string | null> => {
  try {
    const songId = songData.id;
    const artist = Array.isArray(songData.artists) ? songData.artists[0].name : songData.artists;
    const keyWord = songData.name + "-" + artist;
    if (!songId || !keyWord) return null;
    // 获取音源列表
    const settingStore = useSettingStore();
    const servers = settingStore.songUnlockServer
      .filter((server) => server.enabled)
      .map((server) => server.key);
    if (servers.length === 0) return null;
    // 并发请求
    const promises = servers.map((server) =>
      unlockSongUrl(songId, keyWord, server)
        .then((result) => ({
          server,
          result,
          success: result.code === 200 && !!result.url,
        }))
        .catch((err) => {
          console.error(`Unlock failed with server ${server}:`, err);
          return { server, result: null, success: false };
        }),
    );
    // 按优先级顺序处理结果
    for (const p of promises) {
      try {
        const item = await p;
        if (item.success && item.result) {
          return item.result.url;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in getUnlockSongUrl", error);
    return null;
  }
};

/**
 * 获取歌曲封面颜色数据
 * @param coverUrl 歌曲封面地址
 */
export const getCoverColor = async (coverUrl: string) => {
  if (!coverUrl) return;
  const statusStore = useStatusStore();
  // 创建图像元素
  const image = new Image();
  image.crossOrigin = "Anonymous";
  image.src = coverUrl;
  // 图像加载完成
  image.onload = () => {
    // 获取图片数据
    const coverColorData = getCoverColorData(image);
    if (coverColorData) statusStore.songCoverTheme = coverColorData;
    // 移除元素
    image.remove();
  };
};
