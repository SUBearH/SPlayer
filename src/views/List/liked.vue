<!-- 歌单列表 -->
<template>
  <div class="liked-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      title-text="我喜欢的音乐"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
    />
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="displayData"
        :loading="loading"
        :height="songListHeight"
        :playListId="playlistId"
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        @scroll="handleListScroll"
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
import type { DropdownOption, MessageReactive } from "naive-ui";
import { SongType } from "@/types/main";
import { songDetail } from "@/api/song";
import { playlistDetail, playlistAllSongs } from "@/api/playlist";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData } from "@/utils/helper";
import { uniqBy } from "lodash-es";
import { useDataStore, useSettingStore, useMusicStore } from "@/stores";
import { openBatchList, openUpdatePlaylist } from "@/utils/modal";
import { isLogin, updateUserLikePlaylist, updateUserLikeSongs, toLikeSong } from "@/utils/auth";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import ListDetail from "@/components/List/ListDetail.vue";
import {
  saveLikedListCache,
  getCachedLikedSongs,
  setCachedLikedListDetail,
  incrementUpdateLikedSongs,
  getCacheVersionRef,
  hasCacheChangedSince,
  onCacheChange,
} from "@/utils/likedListCache";

const router = useRouter();
const dataStore = useDataStore();
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
// 使用 composables
const { detailData, listData, loading, getSongListHeight, setDetailData, setListData, setLoading } =
  useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const playlistId = computed<number>(() => dataStore.userLikeData.playlists?.[0]?.id);

// 加载提示
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
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 是否处于我喜欢页面
const isLikedPage = computed(() => router.currentRoute.value.name === "like-songs");

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: true,
  showPlayCount: true,
  showArtist: false,
  showCreator: true,
  showCount: false,
  searchAlign: "center" as const,
};

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) {
    const loaded =
      listData.value.length === (detailData.value?.count || 0) ? 0 : listData.value.length;
    return `正在更新... (${loaded}/${detailData.value?.count || 0})`;
  }
  return "播放";
});

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
        if (!detailData.value || !playlistId.value) return;
        openUpdatePlaylist(playlistId.value, detailData.value, () =>
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
      onClick: () => openBatchList(displayData.value, false, playlistId.value),
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

  // 同步播放器 UI：如果当前播放的歌曲在喜欢列表中，更新其信息
  const musicStore = useMusicStore();
  if (musicStore.playSong?.id) {
    const updatedSong = playlistData.value.find((s) => s.id === musicStore.playSong.id);
    if (updatedSong) {
      // 更新播放器中的歌曲信息（保留当前播放状态，只更新数据）
      Object.assign(musicStore.playSong, updatedSong);
    }
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
  setLoading(true);
  const { getList, refresh } = options;
  // 清空数据
  clearSearch();
  if (!refresh) resetPlaylistData(getList);
  // 获取歌单内容
  getPlaylistData(id, getList, fullUpdate);
};

// 重置歌单数据
const resetPlaylistData = (getList: boolean) => {
  setDetailData(null);
  if (getList) {
    setListData([]);
    resetScroll();
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
  setDetailData(formatCoverList(detail.playlist)[0]);
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
  if (!getList || detailData.value?.count === 0) {
    setLoading(false);
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
    lastSyncedCacheVersion = getCacheVersionRef().value;
  } else if (!hasCachedData) {
    // 【分支2】首次加载（无缓存）：从服务器获取全部并建立缓存
    const allSongs = await fetchSongsFromServer(playlistDetailData.value.count || 0, detail.privileges);
    incrementUpdateLikedSongs(allSongs, true);
    updatePlaylistUI(getCachedLikedSongs());
    lastSyncedCacheVersion = getCacheVersionRef().value;
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
    lastSyncedCacheVersion = getCacheVersionRef().value;
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

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !listData.value?.length) return;
  playAllSongsAction(listData.value, playlistId.value);
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
// 处理标签点击
const handleTagClick = (tag: string) => {
  router.push({
    name: "discover-playlists",
    query: { cat: tag },
  });
};

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

  // 更新歌单详情中的歌曲数量
  if (playlistDetailData.value) {
    playlistDetailData.value.count = Math.max(0, (playlistDetailData.value.count || 0) - ids.length);
  }

  // 同步更新全局状态中的数据
  updatePlaylistUI(playlistData.value);
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

// 监听缓存变化，当在其他页面喜欢歌曲时实时更新
let unsubscribeFromCacheChanges: (() => void) | null = null;

// 监听缓存变化
const watchCacheChanges = () => {
  unsubscribeFromCacheChanges = onCacheChange((_, changeType) => {
    // 只在页面处于活跃状态时更新
    if (!isActivated.value) return;

    // 只在添加歌曲时更新 UI，删除操作不触发更新
    if (changeType !== 'add') return;

    const cachedSongs = getCachedLikedSongs();
    if (cachedSongs.length > 0) {
      updatePlaylistUI(cachedSongs);
    }
  });
};

// 启动监听
watchCacheChanges();

onDeactivated(() => {
  loadingMsgShow(false);
  saveLikedListCache();
});

onUnmounted(() => {
  // 清理缓存监听
  if (unsubscribeFromCacheChanges) {
    unsubscribeFromCacheChanges();
  }
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
      setLoading(false);
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
      setLoading(false);
      window.$message.error("无法获取我喜欢的音乐歌单");
    }
  }
});
</script>
