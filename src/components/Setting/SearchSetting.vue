<!-- 搜索设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 搜索设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示搜索历史</n-text>
          <n-text class="tip" :depth="3">是否在搜索框显示搜索历史记录</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSearchHistory" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示热搜榜</n-text>
          <n-text class="tip" :depth="3">是否在搜索框显示热搜榜</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSearchHot" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">搜索框推荐</n-text>
          <n-text class="tip" :depth="3">是否启用搜索框推荐词</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.enableSearchKeyword" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();
</script>

<style lang="scss" scoped>
.setting-type {
  display: flex;
  flex-direction: column;
  .set-list {
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    .n-h3 {
      margin-bottom: 10px;
    }
    .set-item {
      margin-bottom: 12px;
      border-radius: 8px;
      :deep(.n-card__content) {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        .label {
          display: flex;
          flex-direction: column;
          .name {
            font-size: 15px;
            font-weight: bold;
          }
          .tip {
            font-size: 12px;
            margin-top: 4px;
          }
        }
        .set {
          min-width: 100px;
          display: flex;
          justify-content: flex-end;
        }
      }
    }
  }
}
</style>
