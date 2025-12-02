<template>
  <button 
    class="glass-button" 
    :class="buttonClass"
    :disabled="disabled || loading"
    :hover-class="hoverClass"
    @tap="handleTap"
  >
    <view v-if="loading" class="glass-button__loading">
      <view class="loading-spinner"></view>
    </view>
    <slot v-else></slot>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 按钮类型: primary, secondary, text
  type: {
    type: String,
    default: 'primary'
  },
  // 按钮大小: small, medium, large
  size: {
    type: String,
    default: 'medium'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否加载中
  loading: {
    type: Boolean,
    default: false
  },
  // 是否块级按钮
  block: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['tap'])

const buttonClass = computed(() => [
  `glass-button--${props.type}`,
  `glass-button--${props.size}`,
  {
    'glass-button--disabled': props.disabled,
    'glass-button--loading': props.loading,
    'glass-button--block': props.block
  }
])

const hoverClass = computed(() => {
  return props.disabled || props.loading ? 'none' : 'glass-button--active'
})

const handleTap = (e) => {
  if (!props.disabled && !props.loading) {
    emit('tap', e)
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.glass-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  outline: none;
  background: none;
  padding: 0;
  border-radius: $radius-full;
  font-size: $font-base;
  font-weight: 500;
  transition: all 0.2s ease;
  overflow: hidden;
  
  &::after {
    border: none;
  }
  
  // 类型样式
  &--primary {
    @include gradient-bg($gradient-primary);
    color: $text-white;
    box-shadow: $shadow-button;
  }
  
  &--secondary {
    @include glass-effect;
    color: $primary-blue;
  }
  
  &--text {
    background: transparent;
    color: $text-primary;
  }
  
  // 大小样式
  &--small {
    padding: 16rpx 32rpx;
    font-size: $font-sm;
    border-radius: $radius-full;
  }
  
  &--medium {
    padding: 24rpx 48rpx;
    font-size: $font-base;
  }
  
  &--large {
    padding: 32rpx 64rpx;
    font-size: $font-lg;
  }
  
  // 块级按钮
  &--block {
    width: 100%;
    display: flex;
  }
  
  // 禁用状态
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  // 点击效果
  &--active {
    transform: scale(0.95);
  }
  
  // 加载中
  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-spinner {
    width: 32rpx;
    height: 32rpx;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

