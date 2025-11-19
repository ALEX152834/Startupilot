<template>
  <view 
    class="glass-card" 
    :class="cardClass"
    :style="cardStyle"
    @tap="handleTap"
  >
    <slot></slot>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 是否启用悬停效果
  hover: {
    type: Boolean,
    default: true
  },
  // 圆角大小
  radius: {
    type: String,
    default: '16px'
  },
  // 背景透明度
  opacity: {
    type: Number,
    default: 0.7
  },
  // 自定义padding
  padding: {
    type: String,
    default: '24rpx'
  },
  // 自定义margin
  margin: {
    type: String,
    default: '0'
  }
})

const emit = defineEmits(['tap'])

const cardClass = computed(() => ({
  'glass-card--hover': props.hover
}))

const cardStyle = computed(() => ({
  borderRadius: props.radius,
  opacity: props.opacity,
  padding: props.padding,
  margin: props.margin
}))

const handleTap = (e) => {
  emit('tap', e)
}
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.glass-card {
  @include glass-effect;
  transition: all 0.3s ease;
  
  &--hover {
    &:active {
      transform: translateY(-4rpx);
      box-shadow: 0 16rpx 32rpx rgba(0, 0, 0, 0.15);
    }
  }
}
</style>

