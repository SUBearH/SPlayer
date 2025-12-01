/**
 * orpheus:// 协议处理工具
 * 用于处理从系统传入的 orpheus:// 链接
 */

import { useRouter } from "vue-router";
import { usePlayer } from "./player";
import { songDetail } from "@/api/song";
import { formatSongsList } from "./format";

export interface OrpheusData {
  type: "song" | "playlist" | "album" | "artist";
  id: string | number;
  cmd?: "play" | "queue";
}

/**
 * Base64 解码函数（支持 Node.js 和浏览器）
 */
function base64Decode(base64String: string): string {
  if (typeof Buffer !== "undefined") {
    // Node.js 环境
    return Buffer.from(base64String, "base64").toString("utf-8");
  }
  // 浏览器环境
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 处理 orpheus:// 协议数据
 */
export const handleOrpheusProtocol = async (orpheusData: OrpheusData) => {
  try {
    const router = useRouter();
    const player = usePlayer();
    const { type, id, cmd = "queue" } = orpheusData;

    if (!type || !id) {
      console.warn("Invalid orpheus protocol data:", orpheusData);
      return;
    }

    switch (type) {
      case "song": {
        const result = await songDetail(Number(id));
        const song = formatSongsList(result.songs)[0];
        if (cmd === "play") {
          player.addNextSong(song, true);
        } else {
          player.addNextSong(song);
        }
        break;
      }
      case "playlist": {
        router.push({ name: "playlist", query: { id: String(id) } });
        break;
      }
      case "album": {
        router.push({ name: "album", query: { id: String(id) } });
        break;
      }
      case "artist": {
        router.push({ name: "artist", query: { id: String(id) } });
        break;
      }
    }
  } catch (error) {
    console.error("Failed to handle orpheus protocol:", error);
  }
};

/**
 * 解析 orpheus:// URL
 */
export const parseOrpheusUrl = (url: string): OrpheusData | null => {
  try {
    if (!url.startsWith("orpheus://")) return null;

    const encodedData = url.replace("orpheus://", "");
    if (!encodedData) return null;

    const decodedData = base64Decode(encodedData);
    return JSON.parse(decodedData) as OrpheusData;
  } catch (error) {
    console.error("Failed to parse orpheus URL:", error);
    return null;
  }
};
