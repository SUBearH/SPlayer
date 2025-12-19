<!-- 全局配置 -->
<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme="theme"
    :theme-overrides="themeOverrides"
    abstract
    inline-theme-disabled
    preflight-style-disabled
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider :max="1" placement="bottom">
            <n-modal-provider>
              <slot />
              <NaiveProviderContent />
            </n-modal-provider>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  zhCN,
  dateZhCN,
  darkTheme,
  useOsTheme,
  useLoadingBar,
  useModal,
  useDialog,
  useMessage,
  useNotification,
  GlobalThemeOverrides,
} from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { getColorSchemes, applyColorSchemes } from "@/utils/color";
import { useTransition, TransitionPresets } from "@vueuse/core";
// import { rgbToHex } from "@imsyy/color-utils";
import themeColor from "@/assets/data/themeColor.json";

const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 操作系统主题
const osTheme = useOsTheme();

// 全局主题（使用 shallowRef 避免深层追踪开销）
const themeOverrides = shallowRef<GlobalThemeOverrides>({});
// 轻量的 rgba 构造器
const toRGBA = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;
// 主题缓存键
let lastThemeCacheKey: string | null = null;

// 扁平化颜色对象
const flattenColors = (colors: any) => {
  const flat: any = {};
  for (const key in colors) {
    if (colors[key] && typeof colors[key] === "object") {
      flat[`${key}_r`] = colors[key].r;
      flat[`${key}_g`] = colors[key].g;
      flat[`${key}_b`] = colors[key].b;
    }
  }
  return flat;
};

// 还原颜色对象
const unflattenColors = (flat: any) => {
  const colors: any = {};
  for (const key in flat) {
    const [name, channel] = key.split("_");
    if (!colors[name]) colors[name] = {};
    colors[name][channel] = flat[key];
  }
  return colors;
};

// 目标颜色（扁平化）
const targetColors = ref<any>({});
// 过渡颜色
const transitionedColors = useTransition(targetColors, {
  duration: 300,
  transition: TransitionPresets.easeInOutCubic,
});

// 获取明暗模式
const theme = computed(() => {
  return settingStore.themeMode === "auto"
    ? // 跟随系统
      osTheme.value === "dark"
      ? darkTheme
      : null
    : // 自定义
      settingStore.themeMode === "dark"
      ? darkTheme
      : null;
});

// 获取当前主题色数据
const getThemeMainColor = () => {
  const themeType = theme.value ? "dark" : "light";
  if (settingStore.themeFollowCover && statusStore.songCoverTheme) {
    const coverColor = statusStore.songCoverTheme;
    if (!coverColor) return getColorSchemes(themeColor["default"].color, themeType);
    return getColorSchemes(coverColor, themeType);
  } else if (settingStore.themeColorType !== "custom") {
    return getColorSchemes(themeColor[settingStore.themeColorType].color, themeType);
  } else {
    return getColorSchemes(settingStore.themeCustomColor, themeType);
  }
};

// 更改全局主题
const changeGlobalTheme = () => {
  let rawSchemes;
  const themeType = theme.value ? "dark" : "light";

  try {
    // 获取配色方案
    rawSchemes = getThemeMainColor();
  } catch (error) {
    console.error("获取主题色失败:", error);
  }

  // 若获取失败或为空，则使用默认主题
  if (!rawSchemes || Object.keys(rawSchemes).length === 0) {
    try {
      rawSchemes = getColorSchemes(themeColor["default"].color, themeType);
    } catch (error) {
      console.error("默认主题生成失败:", error);
      themeOverrides.value = {};
      return;
    }
  }

  // 更新目标颜色，触发过渡
  targetColors.value = flattenColors(rawSchemes);
};

// 更新主题覆盖配置
const updateThemeOverrides = (colorSchemes: { [key: string]: string }) => {
  try {
    // 构造主题缓存 Key
    const themeModeLabel = theme.value ? "dark" : "light";
    const themeCacheKey = `${themeModeLabel}|${settingStore.themeGlobalColor ? 1 : 0}|${settingStore.globalFont}|${colorSchemes.primary}|${colorSchemes.background}|${colorSchemes["surface-container"]}`;
    if (lastThemeCacheKey === themeCacheKey) return;
    lastThemeCacheKey = themeCacheKey;

    // 关键颜色
    const primaryRGB = colorSchemes.primary as string;
    const surfaceContainerRGB = colorSchemes["surface-container"] as string;

    // 全局字体
    const fontFamily = `${settingStore.globalFont === "default" ? "v-sans" : settingStore.globalFont}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;

    // 通用样式基座
    const commonBase = {
      fontFamily,
      primaryColor: `rgb(${primaryRGB})`,
      primaryColorHover: toRGBA(primaryRGB, 0.78),
      primaryColorPressed: toRGBA(primaryRGB, 0.26),
      primaryColorSuppl: toRGBA(primaryRGB, 0.12),
    } as GlobalThemeOverrides["common"];

    if (settingStore.themeGlobalColor) {
      themeOverrides.value = {
        common: {
          ...commonBase,
          textColorBase: primaryRGB,
          textColor1: `rgb(${primaryRGB})`,
          textColor2: toRGBA(primaryRGB, 0.82),
          textColor3: toRGBA(primaryRGB, 0.52),
          bodyColor: `rgb(${colorSchemes.background})`,
          cardColor: `rgb(${surfaceContainerRGB})`,
          tagColor: `rgb(${surfaceContainerRGB})`,
          modalColor: `rgb(${surfaceContainerRGB})`,
          popoverColor: `rgb(${surfaceContainerRGB})`,
          buttonColor2: toRGBA(primaryRGB, 0.08),
          buttonColor2Hover: toRGBA(primaryRGB, 0.12),
          buttonColor2Pressed: toRGBA(primaryRGB, 0.08),
          iconColor: `rgb(${primaryRGB})`,
          iconColorHover: toRGBA(primaryRGB, 0.475),
          closeIconColor: toRGBA(primaryRGB, 0.58),
          hoverColor: toRGBA(primaryRGB, 0.09),
          borderColor: toRGBA(primaryRGB, 0.09),
          textColorDisabled: toRGBA(primaryRGB, 0.3),
          placeholderColorDisabled: toRGBA(primaryRGB, 0.3),
          iconColorDisabled: toRGBA(primaryRGB, 0.3),
        },
        Card: {
          borderColor: toRGBA(primaryRGB, 0.09),
        },
        Button: {
          textColorHover: toRGBA(primaryRGB, 0.78),
          textColorFocus: toRGBA(primaryRGB, 0.58),
          colorPrimary: toRGBA(primaryRGB, 0.9),
          colorHoverPrimary: `rgb(${primaryRGB})`,
          colorPressedPrimary: toRGBA(primaryRGB, 0.8),
          colorFocusPrimary: `rgb(${primaryRGB})`,
        },
        Slider: {
          handleColor: `rgb(${primaryRGB})`,
          fillColor: `rgb(${primaryRGB})`,
          fillColorHover: `rgb(${primaryRGB})`,
          railColor: toRGBA(primaryRGB, 0.2),
          railColorHover: toRGBA(primaryRGB, 0.3),
        },
        Switch: {
          railColorActive: toRGBA(primaryRGB, 0.8),
        },
        Input: {
          color: toRGBA(primaryRGB, 0.1),
          colorFocus: `rgb(${surfaceContainerRGB})`,
          placeholderColor: toRGBA(primaryRGB, 0.58),
          border: `1px solid ${toRGBA(primaryRGB, 0.1)}`,
          clearColor: toRGBA(primaryRGB, 0.38),
          clearColorHover: toRGBA(primaryRGB, 0.48),
          clearColorPressed: toRGBA(primaryRGB, 0.3),
        },
        Icon: {
          color: `rgb(${primaryRGB})`,
        },
        Empty: {
          textColor: toRGBA(primaryRGB, 0.38),
        },
        Divider: {
          color: toRGBA(primaryRGB, 0.09),
        },
        Dropdown: {
          dividerColor: toRGBA(primaryRGB, 0.09),
        },
        Layout: {
          siderBorderColor: toRGBA(primaryRGB, 0.09),
        },
        Tabs: {
          colorSegment: toRGBA(primaryRGB, 0.08),
          tabColorSegment: toRGBA(primaryRGB, 0.12),
        },
        Drawer: {
          headerBorderBottom: `1px solid ${toRGBA(primaryRGB, 0.09)}`,
          footerBorderTop: `1px solid ${toRGBA(primaryRGB, 0.09)}`,
        },
        Menu: {
          dividerColor: toRGBA(primaryRGB, 0.09),
        },
        Progress: {
          railColor: toRGBA(primaryRGB, 0.16),
        },
        Popover: {
          color: `rgb(${surfaceContainerRGB})`,
        },
      };
    } else {
      themeOverrides.value = {
        common: {
          ...commonBase,
        },
        Icon: {
          color: `rgb(${primaryRGB})`,
        },
        Slider: {
          handleColor: `rgb(${primaryRGB})`,
          fillColor: `rgb(${primaryRGB})`,
          fillColorHover: `rgb(${primaryRGB})`,
          railColor: toRGBA(primaryRGB, 0.2),
          railColorHover: toRGBA(primaryRGB, 0.3),
        },
        Popover: {
          color: `rgb(${surfaceContainerRGB})`,
        },
      };
    }
  } catch (error) {
    themeOverrides.value = {};
    console.error("切换主题色出现错误：", error);
    window.$message.error("切换主题色出现错误，已使用默认配置");
  }
};

// 挂载 naive 组件
const setupNaiveTools = () => {
  // 进度条
  window.$loadingBar = useLoadingBar();
  // 通知
  window.$notification = useNotification();
  // 信息
  window.$message = useMessage();
  // 对话框
  window.$dialog = useDialog();
  // 模态框
  window.$modal = useModal();
};

// 挂载工具
const NaiveProviderContent = defineComponent({
  setup() {
    setupNaiveTools();
  },
  render() {
    return h("div", { className: "main-tools" });
  },
});

// 监听设置更改
watch(
  () => [
    settingStore.themeColorType,
    settingStore.themeFollowCover,
    settingStore.themeGlobalColor,
    settingStore.globalFont,
    statusStore.songCoverTheme?.main,
    theme.value,
  ],
  () => changeGlobalTheme(),
);

// 自定义颜色更改
watchDebounced(
  () => settingStore.themeCustomColor,
  () => {
    changeGlobalTheme();
  },
  { debounce: 500, maxWait: 1000 },
);

onMounted(() => {
  changeGlobalTheme();
});

// 监听过渡颜色变化
watch(transitionedColors, (val) => {
  if (!val || Object.keys(val).length === 0) return;
  const rawColors = unflattenColors(val);
  const formattedSchemes = applyColorSchemes(rawColors);
  updateThemeOverrides(formattedSchemes);
});
</script>
