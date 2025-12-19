<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 地区解锁 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">使用真实 IP 地址</n-text>
          <n-text class="tip" :depth="3">在海外或部分地区可能会受到限制，可开启此处尝试解决</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.useRealIP" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">真实 IP 地址</n-text>
          <n-text class="tip" :depth="3">可在此处输入国内 IP，不填写则为随机</n-text>
        </div>
        <n-input
          v-model:value="settingStore.realIP"
          :disabled="!settingStore.useRealIP"
          placeholder="127.0.0.1"
          class="set"
        >
          <template #prefix>
            <n-text depth="3">IP</n-text>
          </template>
        </n-input>
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> 网络代理 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">网络代理</n-text>
          <n-text class="tip" :depth="3">修改后请点击保存或重启软件以应用</n-text>
        </div>
        <n-flex>
          <n-button type="primary" strong secondary @click="setProxy"> 保存并应用 </n-button>
          <n-select
            v-model:value="settingStore.proxyProtocol"
            :options="[
              {
                label: '关闭代理',
                value: 'off',
              },
              {
                label: 'HTTP 代理',
                value: 'HTTP',
              },
              {
                label: 'HTTPS 代理',
                value: 'HTTPS',
              },
            ]"
            class="set"
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">代理服务器地址</n-text>
          <n-text class="tip" :depth="3">请填写代理服务器地址，如 127.0.0.1</n-text>
        </div>
        <n-input
          v-model:value="settingStore.proxyServe"
          :disabled="settingStore.proxyProtocol === 'off'"
          placeholder="请填写代理服务器地址"
          class="set"
        >
          <template #prefix>
            <n-text depth="3">
              {{ settingStore.proxyProtocol === "off" ? "-" : settingStore.proxyProtocol }}
            </n-text>
          </template>
        </n-input>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">代理服务器端口</n-text>
          <n-text class="tip" :depth="3">请填写代理服务器端口，如 80</n-text>
        </div>
        <n-input-number
          v-model:value="settingStore.proxyPort"
          :disabled="settingStore.proxyProtocol === 'off'"
          :show-button="false"
          :min="1"
          :max="65535"
          placeholder="请填写代理服务器端口"
          class="set"
        />
      </n-card>
      <n-collapse-transition :show="settingStore.proxyProtocol !== 'off'">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">测试代理</n-text>
            <n-text class="tip" :depth="3">测试代理配置是否可正常连通</n-text>
          </div>
          <n-button :loading="testProxyLoading" type="primary" strong secondary @click="testProxy">
            测试代理
          </n-button>
        </n-card>
      </n-collapse-transition>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> 系统 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">在线服务</n-text>
          <n-text class="tip" :depth="3">是否开启软件的在线服务</n-text>
        </div>
        <n-switch class="set" :value="useOnlineService" :round="false" @update:value="modeChange" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自动检查更新</n-text>
          <n-text class="tip" :depth="3">在每次开启软件时自动检查更新</n-text>
        </div>
        <n-switch v-model:value="settingStore.checkUpdateOnStart" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">关闭软件时</n-text>
          <n-text class="tip" :depth="3">选择关闭软件的方式</n-text>
        </div>
        <n-select
          v-model:value="settingStore.closeAppMethod"
          :disabled="settingStore.showCloseAppTip"
          :options="[
            {
              label: '最小化到任务栏',
              value: 'hide',
            },
            {
              label: '直接退出',
              value: 'close',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">每次关闭前都进行提醒</n-text>
        </div>
        <n-switch v-model:value="settingStore.showCloseAppTip" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">阻止系统息屏</n-text>
          <n-text class="tip" :depth="3">是否在播放界面阻止系统息屏</n-text>
        </div>
        <n-switch v-model:value="settingStore.preventSleep" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">任务栏显示播放进度</n-text>
          <n-text class="tip" :depth="3"> 是否在任务栏显示歌曲播放进度 </n-text>
        </div>
        <n-switch
          v-model:value="settingStore.showTaskbarProgress"
          class="set"
          :round="false"
          @update:value="closeTaskbarProgress"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">页面切换动画</n-text>
          <n-text class="tip" :depth="3">选择页面切换时的动画效果</n-text>
        </div>
        <n-select
          v-model:value="settingStore.routeAnimation"
          :options="[
            {
              label: '无动画',
              value: 'none',
            },
            {
              label: '淡入淡出',
              value: 'fade',
            },
            {
              label: '缩放',
              value: 'zoom',
            },
            {
              label: '滑动',
              value: 'slide',
            },
            {
              label: '上浮',
              value: 'up',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自定义字体</n-text>
          <n-text class="tip" :depth="3"> 更改软件内全局字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.globalFont !== 'default'"
              type="primary"
              strong
              secondary
              @click="settingStore.globalFont = 'default'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.globalFont"
            :options="allFontsData"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">歌词区域字体</n-text>
          <n-text class="tip" :depth="3"> 是否独立更改歌词区域字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.LyricFont !== 'follow'"
              type="primary"
              strong
              secondary
              @click="settingStore.LyricFont = 'follow'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.LyricFont"
            :options="[
              { label: '跟随全局', value: 'follow' },
              ...allFontsData.filter((v) => v.value !== 'default'),
            ]"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">日语歌词字体</n-text>
          <n-text class="tip" :depth="3"> 是否在歌词为日语时单独设置字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.japaneseLyricFont !== 'follow'"
              type="primary"
              strong
              secondary
              @click="settingStore.japaneseLyricFont = 'follow'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.japaneseLyricFont"
            :options="[
              { label: '跟随全局', value: 'follow' },
              ...allFontsData.filter((v) => v.value !== 'default'),
            ]"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启页面缓存</n-text>
          <n-text class="tip" :depth="3">是否开启部分页面的缓存，这将会增加内存占用</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.useKeepAlive" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">软件热重载</n-text>
          <n-text class="tip" :depth="3">重新加载软件窗口，解决部分显示或功能异常</n-text>
        </div>
        <n-button type="primary" strong secondary @click="reloadApp"> 热重载 </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 重置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">重置所有设置</n-text>
          <n-text class="tip" :depth="3">重置所有设置，恢复软件默认值</n-text>
        </div>
        <n-button type="warning" strong secondary @click="resetSetting"> 重置设置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">清除本地缓存</n-text>
          <n-text class="tip" :depth="3">清除本地缓存数据，不影响设置和登录状态</n-text>
        </div>
        <n-button type="warning" strong secondary @click="clearCache"> 清除缓存 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">清除全部数据</n-text>
          <n-text class="tip" :depth="3">重置所有设置，清除全部数据</n-text>
        </div>
        <n-button type="error" strong secondary @click="clearAllData"> 清除全部 </n-button>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore, useMusicStore } from "@/stores";
import { isElectron, isDev } from "@/utils/env";
import { debounce } from "lodash-es";
import type { SelectOption } from "naive-ui";
import { clearImageCache } from "@/utils/imageCache";
import { clearSongCache } from "@/utils/qualityCache";
import { clearLikedListCache } from "@/utils/likedListCache";

const dataStore = useDataStore();
const settingStore = useSettingStore();
const musicStore = useMusicStore();

const testProxyLoading = ref<boolean>(false);

// 全部字体
const allFontsData = ref<SelectOption[]>([]);

// 是否开启在线服务
const useOnlineService = ref(settingStore.useOnlineService);

// 获取全部系统字体
const getAllSystemFonts = async () => {
  const allFonts = await window.electron.ipcRenderer.invoke("get-all-fonts");
  allFonts.map((v: string) => {
    // 去除前后的引号
    v = v.replace(/^['"]+|['"]+$/g, "");
    allFontsData.value.push({
      label: v,
      value: v,
      style: {
        fontFamily: v,
      },
    });
  });
  // 添加默认选项
  allFontsData.value.unshift({
    label: "系统默认",
    value: "default",
    style: {
      fontFamily:
        "v-sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
    },
  });
};

// 关闭任务栏进度
const closeTaskbarProgress = (val: boolean) => {
  if (!val) window.electron.ipcRenderer.send("set-bar", "none");
};

// 在线模式切换
const modeChange = (val: boolean) => {
  if (val) {
    window.$dialog.warning({
      title: "开启在线服务",
      content: "确定开启软件的在线服务？更改将在热重载后生效！",
      positiveText: "开启",
      negativeText: "取消",
      onPositiveClick: () => {
        useOnlineService.value = true;
        settingStore.useOnlineService = true;
        // 清理播放数据
        dataStore.$reset();
        musicStore.$reset();
        // 清空本地数据
        localStorage.removeItem("data-store");
        localStorage.removeItem("music-store");
        // 热重载
        window.location.reload();
      },
    });
  } else {
    window.$dialog.warning({
      title: "关闭在线服务",
      content:
        "确定关闭软件的在线服务？将关闭包括搜索、登录、在线音乐播放等在内的全部在线服务，并且将会退出登录状态，软件将会变为本地播放器！更改将在重启后生效！",
      positiveText: "关闭",
      negativeText: "取消",
      onPositiveClick: () => {
        useOnlineService.value = false;
        settingStore.useOnlineService = false;
        // 清理播放数据
        dataStore.$reset();
        musicStore.$reset();
        // 清空本地数据
        localStorage.removeItem("data-store");
        localStorage.removeItem("music-store");
        // 重启
        if (!isDev) window.electron.ipcRenderer.send("win-restart");
      },
      onNegativeClick: () => {
        useOnlineService.value = true;
        settingStore.useOnlineService = true;
      },
    });
  }
};

// 获取当前代理配置
const proxyConfig = computed(() => ({
  protocol: settingStore.proxyProtocol,
  server: settingStore.proxyServe,
  port: settingStore.proxyPort,
}));

// 应用代理
const setProxy = debounce(() => {
  if (settingStore.proxyProtocol === "off" || !settingStore.proxyServe || !settingStore.proxyPort) {
    window.electron.ipcRenderer.send("remove-proxy");
    window.$message.success("成功关闭网络代理");
    return;
  }
  window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
  window.$message.success("网络代理配置完成，请重启软件");
}, 300);

// 测试代理
const testProxy = async () => {
  testProxyLoading.value = true;
  const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
  if (result) {
    window.$message.success("该代理可正常使用");
  } else {
    window.$message.error("代理测试失败，请重试");
  }
  testProxyLoading.value = false;
};

// 软件热重载
const reloadApp = () => {
  window.electron.ipcRenderer.send("win-reload");
};

// 重置设置
const resetSetting = () => {
  window.$dialog.warning({
    title: "警告",
    content: "此操作将重置所有设置并重启软件，是否继续?",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      settingStore.$reset();
      // electron
      if (isElectron) window.electron.ipcRenderer.send("reset-setting");
      window.$message.loading("设置重置完成，软件即将重启", {
        duration: 3000,
        onAfterLeave: () => window.location.reload(),
      });
    },
  });
};

// 清除本地缓存
const clearCache = () => {
  window.$dialog.warning({
    title: "警告",
    content:
      "此操作将清除以下数据(包括最近播放列表)并热重载软件：\n1. 图片数据缓存\n2. 歌曲元数据缓存\n3. 我喜欢的音乐列表缓存\n4. IndexedDB 数据库 (包含红心歌单、播放列表等)\n5. 播放器状态 (播放进度、音量等)\n6. 界面状态 (侧边栏、主题色等)\n\n保留数据：\n1. 用户设置\n2. 登录状态\n3. 快捷键设置\n\n是否继续?",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        // 1. 清除图片数据缓存
        clearImageCache();
        // 2. 清除歌曲元数据缓存
        clearSongCache();
        // 3. 清除我喜欢的音乐缓存
        clearLikedListCache();
        // 4. 清除 IndexedDB (包含红心歌单、其他大数据量缓存)
        await dataStore.deleteDB();
        // 5. 清除 sessionStorage (通用接口缓存、页面组件缓存)
        sessionStorage.clear();
        // 6. 清除 localStorage (保留设置、登录状态、Cookies、快捷键)
        const keepKeys = ["setting-store", "data-store", "shortcut-store"];\n        Object.keys(localStorage).forEach((key) => {
          // 保留 keepKeys 中的项以及以 cookie- 开头的项
          if (!keepKeys.includes(key) && !key.startsWith("cookie-")) {
            localStorage.removeItem(key);
          }
        });
        // 7. 热重载 (清除内存中的缓存、图片组件缓存、播放预加载内容)
        window.$message.loading("本地缓存清除完成，软件即将热重载", {
          duration: 3000,
          onAfterLeave: () => window.location.reload(),
        });
      } catch (error) {
        console.error("Clear cache error:", error);
        window.$message.error("清除缓存失败，请重试");
      }
    },
  });
};

// 清除全部数据
const clearAllData = () => {
  window.$dialog.warning({
    title: "高危操作",
    content: "此操作将重置所有设置并清除全部数据，同时将退出登录状态，是否继续?",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        // 重置设置
        window.localStorage.clear();
        window.sessionStorage.clear();
        // deleteDB
        await dataStore.deleteDB();
        // electron
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.loading("数据清除完成，软件即将热重载", {
          duration: 3000,
          onAfterLeave: () => window.location.reload(),
        });
      } catch (error) {
        console.error("Clear all data error:", error);
        window.$message.error("清除数据出错，即将强制重载");
        setTimeout(() => window.location.reload(), 1500);
      }
    },
  });
};

onMounted(() => {
  if (isElectron) {
    getAllSystemFonts();
  }
});
</script>
