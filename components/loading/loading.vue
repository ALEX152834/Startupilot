<template>
  <view v-if="show" class="loading">
    <view class="loading__spinner" :style="spinnerStyle">
      <view class="spinner-circle"></view>
    </view>
    <text v-if="text" class="loading__text">{{ text }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 是否显示
  show: {
    type: Boolean,
    default: false
  },
  // 加载文本
  text: {
    type: String,
    default: ''
  },
  // 大小: small, medium, large
  size: {
    type: String,
    default: 'medium'
  },
  // 颜色
  color: {
    type: String,
    default: '#3B82F6'
  }
})

const sizeMap = {
  small: '48rpx',
  medium: '64rpx',
  large: '80rpx'
}

const spinnerStyle = computed(() => ({
  width: sizeMap[props.size],
  height: sizeMap[props.size],
  borderColor: `${props.color}33`,
  borderTopColor: props.color
}))
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  
  &__spinner {
    border-radius: 50%;
    border: 6rpx solid;
    animation: spin 1s linear infinite;
  }
  
  &__text {
    margin-top: 24rpx;
    font-size: $font-sm;
    color: $text-secondary;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

