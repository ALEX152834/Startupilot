<template>
  <view class="skeleton">
    <view v-if="type === 'card'" class="skeleton-card">
      <view class="skeleton-image"></view>
      <view class="skeleton-content">
        <view class="skeleton-title"></view>
        <view class="skeleton-text"></view>
        <view class="skeleton-text short"></view>
      </view>
    </view>
    
    <view v-else-if="type === 'list'" class="skeleton-list">
      <view v-for="i in rows" :key="i" class="skeleton-list-item">
        <view class="skeleton-avatar"></view>
        <view class="skeleton-content">
          <view class="skeleton-title"></view>
          <view class="skeleton-text"></view>
        </view>
      </view>
    </view>
    
    <view v-else class="skeleton-text" :style="customStyle"></view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 类型: text, card, list
  type: {
    type: String,
    default: 'text'
  },
  // 行数 (用于list类型)
  rows: {
    type: Number,
    default: 3
  },
  // 自定义宽度
  width: {
    type: String,
    default: '100%'
  },
  // 自定义高度
  height: {
    type: String,
    default: '32rpx'
  }
})

const customStyle = computed(() => ({
  width: props.width,
  height: props.height
}))
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.skeleton {
  &-card {
    @include glass-effect;
    border-radius: $radius-lg;
    overflow: hidden;
  }
  
  &-image {
    width: 100%;
    height: 320rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  &-content {
    padding: 24rpx;
  }
  
  &-title {
    width: 60%;
    height: 40rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: $radius-sm;
    margin-bottom: 16rpx;
  }
  
  &-text {
    width: 100%;
    height: 28rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: $radius-sm;
    margin-bottom: 12rpx;
    
    &.short {
      width: 80%;
    }
  }
  
  &-list {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }
  
  &-list-item {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }
  
  &-avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    flex-shrink: 0;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

