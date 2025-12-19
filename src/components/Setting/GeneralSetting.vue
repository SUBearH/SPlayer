<!-- 常规设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 主题设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">主题模式</n-text>
          <n-text class="tip" :depth="3">调整全局主题明暗模式</n-text>
        </div>
        <n-select
          v-model:value="settingStore.themeMode"
          class="set"
          :options="[
            {
              label: '跟随系统',
              value: 'auto',
            },
            {
              label: '浅色模式',
              value: 'light',
            },
            {
              label: '深色模式',
              value: 'dark',
            },
          ]"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局主题色</n-text>
          <n-text class="tip" :depth="3">更改全局主题色</n-text>
        </div>
        <n-select
          v-model:value="settingStore.themeColorType"
          class="set"
          :disabled="settingStore.themeFollowCover"
          :options="themeColorOptions"
        />
      </n-card>
      <n-collapse-transition
        :show="settingStore.themeColorType === 'custom' && !settingStore.themeFollowCover"
      >
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">自定义主题色</n-text>
            <n-text class="tip" :depth="3">可在此处自定义全局主题色</n-text>
          </div>
          <n-color-picker
            v-model:value="settingStore.themeCustomColor"
            class="set"
            :show-alpha="false"
            :modes="['hex']"
          />
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局着色</n-text>
          <n-text class="tip" :depth="3">是否将主题色应用至所有元素</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeGlobalColor"
          class="set"
          :round="false"
          @update:value="themeGlobalColorChange"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局动态取色</n-text>
          <n-text class="tip" :depth="3">主题色是否跟随封面，目前感觉不好看</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeFollowCover"
          :disabled="isEmpty(statusStore.songCoverTheme)"
          class="set"
          :round="false"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 侧边栏设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">侧边栏显示封面</n-text>
          <n-text class="tip" :depth="3">是否显示歌单的封面，如果有</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.menuShowCover" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">侧边栏配置</n-text>
          <n-text class="tip" :depth="3">配置需要在侧边栏隐藏的菜单项</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openSidebarHideManager"> 配置 </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 首页设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">首页配置</n-text>
          <n-text class="tip" :depth="3">调整首页各栏目的显示顺序或隐藏不需要的栏目</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openHomePageSectionManager">
          配置
        </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 歌单列表设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌曲音质</n-text>
          <n-text class="tip" :depth="3">歌单列表是否显示歌曲音质</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongQuality" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示特权标签</n-text>
          <n-text class="tip" :depth="3">歌单列表是否显示如 VIP、EP 等特权标签</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongPrivilegeTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示原唱翻唱标签</n-text>
          <n-text class="tip" :depth="3">歌单列表是否显示歌曲原唱翻唱标签</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongOriginalTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示MV标签</n-text>
          <n-text class="tip" :depth="3">歌单列表是否显示MV标签</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongMVTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示加入时间列</n-text>
          <n-text class="tip" :depth="3">歌单列表是否显示歌曲加入时间列</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongAddTime" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { isDev, isElectron } from "@/utils/env";
import songManager from "@/utils/songManager";
import { isEmpty } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import { openSidebarHideManager, openHomePageSectionManager } from "@/utils/modal";

const dataStore = useDataStore();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();

// 全部字体
const allFontsData = ref<SelectOption[]>([]);

// 是否开启在线服务
const useOnlineService = ref(settingStore.useOnlineService);

// 全局主题色配置
const themeColorOptions: SelectOption[] = [
  // { label: "关闭主题色", value: "close" },
  ...Object.keys(themeColor).map((key) => ({
    value: key,
    label: themeColor[key].name,
    style: {
      color: themeColor[key].color,
    },
  })),
];

// 关闭任务栏进度
const closeTaskbarProgress = (val: boolean) => {
  if (!val) window.electron.ipcRenderer.send("set-bar", "none");
};

// 获取全部系统字体
const getAllSystemFonts = async () => {
  // ...existing code...
};

// 在线模式切换
const modeChange = (val: boolean) => {
  // ...existing code...
};

// 全局着色更改
const themeGlobalColorChange = (val: boolean) => {
  if (val) songManager.getCoverColor(musicStore.songCover);
};

// onMounted(() => {
//   if (isElectron) {
//     getAllSystemFonts();
//   }
// });
</script>
