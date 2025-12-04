<!-- 歌单列表 -->
<template>
  <div :class="['liked', { small: listScrolling }]">
    <Transition name="fade" mode="out-in">
      <div v-if="playlistDetailData" class="detail">
        <div class="cover">
          <n-image
            :src="playlistDetailData.coverSize?.m || playlistDetailData.cover"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="playlistDetailData.cover"
            :renderToolbar="renderToolbar"
            show-toolbar-tooltip
            class="cover-img"
            @load="coverLoaded"
          >
            <template #placeholder>
              <div class="cover-loading">
                <img src="/images/album.jpg?assest" class="loading-img" alt="loading-img" />
              </div>
            </template>
          </n-image>
          <!-- 封面背板 -->
          <n-image
            class="cover-shadow"
            preview-disabled
            :src="playlistDetailData.coverSize?.m || playlistDetailData.cover"
          />
          <!-- 遮罩 -->
          <div class="cover-mask" />
          <!-- 播放量 -->
          <div class="play-count">
            <SvgIcon name="Play" />
            <span class="num">{{ formatNumber(playlistDetailData.playCount || 0) }}</span>
          </div>
        </div>
        <div class="data">
          <n-h2 class="name text-hidden"> 我喜欢的音乐 </n-h2>
          <n-collapse-transition :show="!listScrolling" class="collapse">
            <!-- 简介 -->
            <n-text
              v-if="playlistDetailData.description"
              class="description text-hidden"
              @click="openDescModal(playlistDetailData.description)"
            >
              {{ playlistDetailData.description }}
            </n-text>
            <!-- 信息 -->
            <n-flex class="meta">
              <div class="item">
                <SvgIcon name="Person" :depth="3" />
                <n-text>{{ playlistDetailData.creator?.name || "未知用户名" }}</n-text>
              </div>
              <div v-if="playlistDetailData.updateTime" class="item">
                <SvgIcon name="Update" :depth="3" />
                <n-text>{{ formatTimestamp(playlistDetailData.updateTime) }}</n-text>
              </div>
              <div v-if="playlistDetailData.createTime" class="item">
                <SvgIcon name="Time" :depth="3" />
                <n-text>{{ formatTimestamp(playlistDetailData.createTime) }}</n-text>
              </div>
              <div v-if="playlistDetailData.tags?.length" class="item">
                <SvgIcon name="Tag" :depth="3" />
                <n-flex class="tags">
                  <n-tag
                    v-for="(item, index) in playlistDetailData.tags"
                    :key="index"
                    :bordered="false"
                    round
                    @click="
                      router.push({
                        name: 'discover-playlists',
                        query: { cat: item },
                      })
                    "
                  >
                    {{ item }}
                  </n-tag>
                </n-flex>
              </div>
            </n-flex>
          </n-collapse-transition>
          <n-flex class="menu" justify="space-between">
            <n-flex class="left" align="flex-end">
              <n-button
                :focusable="false"
                :disabled="loading && !hasInitialCache"
                type="primary"
                strong
                secondary
                round
                @click="playAllSongs"
              >
                <template #icon>
                  <SvgIcon name="Play" />
                </template>
                {{
                  loading && !hasInitialCache
                    ? `加载中... (${playlistData.length}/${playlistDetailData?.count || "?"})`
                    : "播放"
                }}
              </n-button>
              <!-- 更多 -->
              <n-dropdown :options="moreOptions" trigger="click" placement="bottom-start">
                <n-button :focusable="false" class="more" circle strong secondary>
                  <template #icon>
                    <SvgIcon name="List" />
                  </template>
                </n-button>
              </n-dropdown>
              <!-- 正在更新状态指示 -->
              <Transition :name="`router-${settingStore.routeAnimation}`">
                <n-flex
                  v-if="loading && hasInitialCache"
                  align="center"
                  :style="{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--n-color-target)',
                    border: '1px solid rgba(var(--primary), 0.3)',
                    fontSize: '14px',
                  }"
                >
                  <n-spin :size="18" />
                  <n-text style="margin-left: 6px">正在更新...</n-text>
                </n-flex>
              </Transition>
            </n-flex>
            <n-flex class="right" align="center">
              <!-- 模糊搜索 -->
              <n-input
                v-if="playlistData?.length"
                v-model:value="searchValue"
                :input-props="{ autocomplete: 'off' }"
                class="search"
                placeholder="模糊搜索"
                clearable
                round
                @input="listSearch"
              >
                <template #prefix>
                  <SvgIcon name="Search" />
                </template>
              </n-input>
            </n-flex>
          </n-flex>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="playlistDataShow"
        :loading="loading"
        :height="songListHeight"
        :playListId="playlistId"
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        @scroll="listScroll"
        @removeSong="removeSong"
      />
      <n-empty
        v-else
        :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CoverType, SongType } from "@/types/main";
import type { DropdownOption, MessageReactive } from "naive-ui";
import { songDetail } from "@/api/song";
import { playlistDetail, playlistAllSongs } from "@/api/playlist";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { coverLoaded, formatNumber, fuzzySearch, renderIcon, copyData } from "@/utils/helper";
import { renderToolbar } from "@/utils/meta";
import { debounce, uniqBy } from "lodash-es";
import { useDataStore, useStatusStore, useSettingStore } from "@/stores";
import { openBatchList, openDescModal, openUpdatePlaylist } from "@/utils/modal";
import { formatTimestamp } from "@/utils/time";
import { isLogin, updateUserLikePlaylist, updateUserLikeSongs, toLikeSong } from "@/utils/auth";
import { usePlayer } from "@/utils/player";
import {
  saveLikedListCache,
  getCachedLikedSongs,
  setCachedLikedListDetail,
  incrementUpdateLikedSongs,
  getCacheVersion,
  hasCacheChangedSince,
} from "@/utils/likedListCache";

const router = useRouter();
const player = usePlayer();
const dataStore = useDataStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 是否激活
const isActivated = ref<boolean>(false);

// 📌 上次同步缓存的版本号，用于检测缓存是否有变化
// 在每次成功加载歌单后更新
let lastSyncedCacheVersion = -1;

// 歌单数据
const playlistData = shallowRef<SongType[]>([]);
const playlistDetailData = ref<CoverType | null>(null);
// trackIds 映射表，用于获取歌曲加入时间
const trackIdsMap = shallowRef<Map<number, { at: number }>>(new Map());

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 歌单 ID
const playlistId = computed<number>(() => dataStore.userLikeData.playlists?.[0]?.id);

// 加载提示
const loading = ref<boolean>(true);
const loadingMsg = ref<MessageReactive | null>(null);

// 是否存在初始缓存（通过检查缓存是否为空来判断，而不是基于 app 启动后第一次加载）
const hasInitialCache = computed<boolean>(() => getCachedLikedSongs().length > 0);

// 列表是否滚动
const listScrolling = ref<boolean>(false);

// 列表应该展示数据
const playlistDataShow = computed(() =>
  searchValue.value ? searchData.value : playlistData.value,
);

// 列表高度
const songListHeight = computed(() => {
  return statusStore.mainContentHeight - (listScrolling.value ? 120 : 240);
});

// 是否处于我喜欢页面
const isLikedPage = computed(() => router.currentRoute.value.name === "like-songs");

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
    {
    label: "全量更新",
    key: "fullUpdate",
    props: {
      onClick: () => {
        if (!playlistId.value) return;
        window.$message.info("开始全量更新，请稍候...");
        getPlaylistDetail(playlistId.value, { getList: true, refresh: true, fullUpdate: true });
      },
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "编辑歌单",
    key: "edit",
    props: {
      onClick: () => {
        if (!playlistDetailData.value || !playlistId.value) return;
        openUpdatePlaylist(playlistId.value, playlistDetailData.value, () =>
          getPlaylistDetail(playlistId.value, { getList: false, refresh: false }),
        );
      },
    },
    icon: renderIcon("EditNote"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(playlistDataShow.value, false, playlistId.value),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: "复制分享链接",
    key: "copy",
    props: {
      onClick: () =>
        copyData(
          `https://music.163.com/#/playlist?id=${playlistId.value}`,
          "已复制分享链接到剪切板",
        ),
    },
    icon: renderIcon("Share"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/playlist?id=${playlistId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 从服务器获取指定数量的歌曲（通过 API 或分页）
const fetchSongsFromServer = async (
  limit: number,
  privileges: any[],
): Promise<SongType[]> => {
  if (isLogin() === 1 && limit < 1500) {
    const ids: number[] = privileges.slice(0, limit).map((song: any) => song.id as number);
    const result = await songDetail(ids);
    return formatSongsList(result.songs, trackIdsMap.value);
  } else {
    return await getPlaylistAllSongsData(playlistId.value, limit);
  }
};

// 更新播放列表数据到 UI 和全局状态
const updatePlaylistUI = (songs: SongType[]) => {
  // 为缺失 addTime 的歌曲补充加入时间（处理旧缓存数据）
  // addTime 是固定值，歌曲一旦加入列表就不会改变
  const enrichedSongs = songs.map((song) => {
    if (!song.addTime && trackIdsMap.value.has(song.id)) {
      song.addTime = trackIdsMap.value.get(song.id)?.at;
    }
    return song;
  });

  playlistData.value = uniqBy(enrichedSongs, "id");
  const likedSongIds = playlistData.value.map((song) => song.id);
  dataStore.setUserLikeData("songs", likedSongIds);
  if (playlistDetailData.value) {
    dataStore.setLikeSongsList(playlistDetailData.value, playlistData.value);
  }
};// 获取歌单基础信息
const getPlaylistDetail = async (
  id: number,
  options: {
    getList: boolean;
    refresh: boolean;
    fullUpdate?: boolean;
  } = {
    getList: true,
    refresh: false,
    fullUpdate: false,
  },
) => {
  if (!id) return;
  // 设置加载状态
  loading.value = true;
  const { getList, fullUpdate } = options;
  // 清空数据
  clearInput();
  // ✨ 仅在完全刷新模式下才清空 UI
  if (fullUpdate) {
    resetPlaylistData(getList);
  }
  // 获取歌单内容
  getPlaylistData(id, getList, fullUpdate);
};

// 重置歌单数据
const resetPlaylistData = (getList: boolean) => {
  playlistDetailData.value = null;
  if (getList) {
    playlistData.value = [];
    listScrolling.value = false;
  }
};

// 获取歌单
const getPlaylistData = async (
  id: number,
  getList: boolean,
  fullUpdate: boolean = false,
) => {
  // 获取歌单详情
  const detail = await playlistDetail(id);
  playlistDetailData.value = formatCoverList(detail.playlist)[0];
  setCachedLikedListDetail(playlistDetailData.value);

  // 构建 trackIds 映射表，用于获取歌曲加入时间
  if (detail.playlist?.trackIds?.length) {
    const newMap = new Map<number, { at: number }>();
    for (const trackInfo of detail.playlist.trackIds) {
      if (trackInfo?.id && trackInfo?.at) {
        newMap.set(trackInfo.id, { at: trackInfo.at });
      }
    }
    trackIdsMap.value = newMap;
  } else {
    trackIdsMap.value = new Map();
  }

  // 不需要获取列表或无歌曲
  if (!getList || playlistDetailData.value.count === 0) {
    loading.value = false;
    return;
  }

  const cachedSongs = getCachedLikedSongs();
  const hasCachedData = cachedSongs.length > 0;

  // ✨ 核心决策逻辑
  if (fullUpdate) {
    // 【分支1】手动全量更新：无条件全量刷新
    const allSongs = await fetchSongsFromServer(playlistDetailData.value.count || 0, detail.privileges);
    incrementUpdateLikedSongs(allSongs, true);
    updatePlaylistUI(getCachedLikedSongs());
    lastSyncedCacheVersion = getCacheVersion();
  } else if (!hasCachedData) {
    // 【分支2】首次加载（无缓存）：从服务器获取全部并建立缓存
    const allSongs = await fetchSongsFromServer(playlistDetailData.value.count || 0, detail.privileges);
    incrementUpdateLikedSongs(allSongs, true);
    updatePlaylistUI(getCachedLikedSongs());
    lastSyncedCacheVersion = getCacheVersion();
  } else {
    // 【分支3】有缓存：使用 /likelist 返回的 ID 列表对比，避免第三个请求

    // 步骤1：检查UI是否与缓存同步
    if (playlistData.value.length !== cachedSongs.length) {
      updatePlaylistUI(cachedSongs);
    }

    // 步骤2：对比 /likelist 返回的 ID 列表与缓存 ID 列表
    // userLikeData.songs 来自第一个请求 (/likelist)，包含用户所有喜欢歌曲的 ID
    // 注意：ID 列表的顺序可能不同，所以使用 Set 对比而不是顺序对比
    const serverLikeIds = new Set(dataStore.userLikeData.songs || []);
    const cachedIds = new Set(cachedSongs.map((song) => song.id));

    // 对比 ID 集合：如果内容相同说明没有其他客户端修改
    let isConsistent = serverLikeIds.size === cachedIds.size;
    if (isConsistent) {
      for (const id of serverLikeIds) {
        if (!cachedIds.has(id)) {
          isConsistent = false;
          break;
        }
      }
    }

    // 如果 /likelist 与缓存不一致，需要进行全量更新
    if (!isConsistent) {
      // 需要进行全量更新：获取完整歌曲详情
      const allSongs = await fetchSongsFromServer(playlistDetailData.value.count || 0, detail.privileges);
      incrementUpdateLikedSongs(allSongs, true);
      updatePlaylistUI(getCachedLikedSongs());
    }

    // 同步完成后更新版本号
    lastSyncedCacheVersion = getCacheVersion();
  }  loading.value = false;
};

// 获取歌单全部歌曲数据（仅返回数据，不更新缓存）
const getPlaylistAllSongsData = async (
  id: number,
  count: number,
): Promise<SongType[]> => {
  // 循环获取
  let offset: number = 0;
  const limit: number = 1000;
  const allSongs: SongType[] = [];

  do {
    const result = await playlistAllSongs(id, limit, offset);
    const songData = formatSongsList(result.songs, trackIdsMap.value);
    allSongs.push(...songData);

    // 更新偏移
    offset += limit;
  } while (offset < count && isLikedPage.value);

  return allSongs;
};

// 列表滚动
const listScroll = (e: Event) => {
  // 滚动高度
  const scrollTop = (e.target as HTMLElement).scrollTop;
  listScrolling.value = scrollTop > 10;
};

// 清除输入
const clearInput = () => {
  searchValue.value = "";
  searchData.value = [];
};

// 播放全部歌曲
const playAllSongs = debounce(() => {
  if (!playlistDetailData.value || !playlistData.value?.length) return;
  // 如果有搜索结果，播放搜索结果；否则播放完整列表
  const listToPlay = searchValue.value && searchData.value?.length ? searchData.value : playlistData.value;
  player.updatePlayList(listToPlay, undefined, playlistId.value);
}, 300);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") {
    searchData.value = [];
    return;
  }
  // 获取搜索结果
  const result = fuzzySearch(val, playlistData.value);
  searchData.value = result;
}, 300);

// 加载提示（已禁用）
const loadingMsgShow = (show: boolean = true) => {
  if (!show) {
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 删除指定歌曲（实际上是取消喜欢）
const removeSong = (ids: number[]) => {
  if (!playlistData.value) return;

  // 对于"我喜欢的音乐"，删除歌曲 = 取消喜欢
  // 需要通过 API 实际删除而不是只删除本地 UI
  ids.forEach((id) => {
    // 查找对应的歌曲对象
    const song = playlistData.value.find((s) => s.id === id);
    if (song) {
      // 调用 toLikeSong 来取消喜欢（这会更新 dataStore 和缓存）
      toLikeSong(song, false);
    }
  });

  // 从 UI 列表中立即删除（不等待 API 响应）
  playlistData.value = playlistData.value.filter((song) => !ids.includes(song.id));
};

onActivated(() => {
  if (!isActivated.value) {
    // 首次激活：onMounted 会处理初始化，这里不需要做任何事
    isActivated.value = true;
  } else {
    // 再次进入页面时（从其他页面返回）：
    // 必须等待 updateUserLikeSongs() 完成后再进行后续操作
    (async () => {
      try {
        // 1. 先同步喜欢状态，获取最新的 /likelist 数据
        await updateUserLikeSongs();

        // 2. 如果缓存有变化，立即从缓存更新UI
        if (lastSyncedCacheVersion !== -1 && hasCacheChangedSince(lastSyncedCacheVersion)) {
          updatePlaylistUI(getCachedLikedSongs());
        }

        // 3. 此时 dataStore.userLikeData.songs 已是最新数据
        // 然后执行正常的数据同步流程（ID对比、决定是否需要第三个请求）
        getPlaylistDetail(playlistId.value, {
          getList: true,
          refresh: false,
          fullUpdate: false,
        });
      } catch (error) {
        console.error("Failed to sync data on page return:", error);
      }
    })();
  }
});

onDeactivated(() => {
  loadingMsgShow(false);
  saveLikedListCache();
});

onUnmounted(() => {
  loadingMsgShow(false);
  saveLikedListCache();
});

onMounted(async () => {
  // 首先确保用户歌单数据已加载
  if (!dataStore.userLikeData.playlists?.length) {
    try {
      await updateUserLikePlaylist();
    } catch (error) {
      console.error("Failed to update user playlist data:", error);
      loading.value = false;
      return;
    }
  }

  // 获取我喜欢的音乐歌单ID
  const likedPlaylistId = dataStore.userLikeData.playlists?.[0]?.id;
  if (likedPlaylistId) {
    // 首次加载：使用对比逻辑
    // 此时若本地有缓存，直接使用缓存的 ID 进行对比
    getPlaylistDetail(likedPlaylistId, {
      getList: true,
      refresh: false,
      fullUpdate: false
    });
  } else {
    // 如果没有找到我喜欢的音乐歌单，尝试从缓存获取
    const data: any = await dataStore.getUserLikePlaylist();
    const id = data?.detail?.id;
    if (id) {
      getPlaylistDetail(id, {
        getList: true,
        refresh: false,
        fullUpdate: false
      });
    } else {
      loading.value = false;
      window.$message.error("无法获取我喜欢的音乐歌单");
    }
  }
});
</script>

<style lang="scss" scoped>
.liked {
  display: flex;
  flex-direction: column;
  .detail {
    position: absolute;
    display: flex;
    height: 240px;
    width: 100%;
    padding: 12px 0 30px 0;
    will-change: height, opacity;
    z-index: 1;
    transition:
      height 0.3s,
      opacity 0.3s;
    .cover {
      position: relative;
      display: flex;
      width: auto;
      height: 100%;
      aspect-ratio: 1/1;
      margin-right: 20px;
      border-radius: 8px;
      transition:
        opacity 0.3s,
        margin 0.3s,
        transform 0.3s;
      :deep(img) {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.35s ease-in-out;
      }
      .cover-img {
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        transition:
          opacity 0.3s,
          filter 0.3s,
          transform 0.3s;
      }
      .cover-shadow {
        position: absolute;
        top: 6px;
        height: 100%;
        width: 100%;
        filter: blur(12px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
        :deep(img) {
          opacity: 1;
        }
      }
      .cover-mask {
        position: absolute;
        top: 0;
        left: 0;
        height: 30%;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
        transition: opacity 0.3s;
      }
      .play-count {
        position: absolute;
        display: flex;
        align-items: center;
        top: 10px;
        right: 12px;
        color: #fff;
        font-weight: bold;
        z-index: 2;
        transition: opacity 0.3s;
        .n-icon {
          color: #fff;
          font-size: 16px;
          margin-right: 4px;
        }
      }
      &:active {
        transform: scale(0.98);
      }
    }
    .data {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-right: 60px;
      :deep(.n-skeleton) {
        margin-bottom: 12px;
        border-radius: 8px;
        height: 32px;
      }
      .description {
        margin-bottom: 8px;
        cursor: pointer;
      }
      .name {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 12px;
        transition:
          font-size 0.3s var(--n-bezier),
          color 0.3s var(--n-bezier);
      }
      .collapse {
        position: absolute;
        left: 0;
        top: 60px;
        margin-bottom: 12px;
      }
      .meta {
        .item {
          display: flex;
          align-items: center;
          .n-icon {
            font-size: 20px;
            margin-right: 4px;
          }
          .tags {
            margin-left: 4px;
            .n-tag {
              font-size: 13px;
              padding: 0 16px;
              line-height: 0;
              cursor: pointer;
              transition:
                transform 0.3s,
                background-color 0.3s,
                color 0.3s;
              &:hover {
                background-color: rgba(var(--primary), 0.14);
              }
              &:active {
                transform: scale(0.95);
              }
            }
          }
        }
      }
      .menu {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        .n-button {
          height: 40px;
          transition: all 0.3s var(--n-bezier);
        }
        .more {
          width: 40px;
        }
        .search {
          height: 40px;
          width: 130px;
          display: flex;
          align-items: center;
          border-radius: 25px;
          transition: all 0.3s var(--n-bezier);
          &.n-input--focus {
            width: 200px;
          }
        }
      }
    }
  }
  .song-list,
  .loading,
  .n-empty {
    padding-top: 240px;
    transition:
      padding 0.3s,
      opacity 0.3s;
  }
  &.small {
    .detail {
      height: 120px;
      .cover {
        margin-right: 12px;
        .cover-mask,
        .play-count {
          opacity: 0;
        }
      }
      .data {
        .name {
          font-size: 22px;
        }
        .menu {
          .n-button,
          .search {
            height: 32px;
            --n-font-size: 13px;
            --n-padding: 0 14px;
            --n-icon-size: 16px;
          }
        }
      }
    }
    .song-list,
    .loading,
    .n-empty {
      padding-top: 120px;
    }
  }
}
</style>
