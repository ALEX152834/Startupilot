<template>
  <view class="empty-state">
    <view class="empty-state__icon">{{ finalIcon }}</view>
    <text class="empty-state__title">{{ finalTitle }}</text>
    <text v-if="finalDescription" class="empty-state__description">{{ finalDescription }}</text>
    <glass-button 
      v-if="finalButtonText && !usePhoneAuth" 
      class="empty-state__button"
      @tap="handleAction"
    >
      {{ finalButtonText }}
    </glass-button>
    <button
      v-else-if="finalButtonText && usePhoneAuth"
      class="empty-state__native-button"
      open-type="getPhoneNumber"
      @getphonenumber="handleAuthorize"
    >
      <view class="empty-state__button-text">{{ finalButtonText }}</view>
    </button>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { EMPTY_STATE_CONFIG } from '@/utils/constants'

const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  buttonText: {
    type: String,
    default: null
  },
  usePhoneAuth: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action', 'authorize'])

const resolvedConfig = computed(() => {
  if (!props.type) return {}
  return EMPTY_STATE_CONFIG[props.type] || {}
})

const finalIcon = computed(() => props.icon ?? resolvedConfig.value.icon ?? '📭')
const finalTitle = computed(() => props.title ?? resolvedConfig.value.title ?? '暂无数据')
const finalDescription = computed(() => {
  if (props.description !== null) {
    return props.description
  }
  return resolvedConfig.value.description ?? ''
})
const finalButtonText = computed(() => props.buttonText ?? resolvedConfig.value.buttonText ?? '')

const handleAction = () => {
  emit('action')
}

const handleAuthorize = (e) => {
  emit('authorize', e.detail)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  
  &__icon {
    font-size: 120rpx;
    margin-bottom: 32rpx;
  }
  
  &__title {
    font-size: $font-lg;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__description {
    font-size: $font-sm;
    color: $text-secondary;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 32rpx;
  }
  
  &__button {
    margin-top: 16rpx;
  }

  &__native-button {
    margin-top: 16rpx;
    width: 100%;
    height: 88rpx;
    border-radius: $radius-full;
    border: none;
    background: linear-gradient(90deg, #3B82F6, #9333EA);
    color: #fff;
    font-size: $font-base;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__button-text {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
</style>

