<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-close" @tap="handleClose">
        <text class="close-icon">✕</text>
      </view>
      
      <view class="login-modal">
        <view class="modal-icon">👤</view>
        <text class="modal-title">手机号快捷登录</text>
        <text class="modal-desc">使用手机号快捷登录，解锁更多功能</text>
        
        <button
          class="native-login-button"
          open-type="getPhoneNumber"
          :disabled="loading"
          @getphonenumber="handleAuthorize"
        >
          <view class="native-login-button__text">
            <text v-if="loading">处理中...</text>
            <text v-else>✓ 手机号快捷登录</text>
          </view>
        </button>
        
        <text class="privacy-text">
          登录即表示同意
          <text class="privacy-link" @tap.stop="handlePrivacy">《用户协议》和《隐私政策》</text>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import { logger } from '@/utils/logger'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const userStore = useUserStore()
const loading = ref(false)

const handleClose = () => {
  emit('close')
}

const handleAuthorize = async (event) => {
  if (loading.value) return

  const detail = event.detail || {}
  const cloudID = detail.cloudID || detail.cloudId || ''
  if (!cloudID) {
    uni.showToast({
      title: '请授权手机号',
      icon: 'none'
    })
    return
  }

  loading.value = true

  try {
    trackEvent(TRACK_EVENTS.LOGIN_SHOW)

    await userStore.login()
    await userStore.bindPhone(cloudID)

    trackEvent(TRACK_EVENTS.LOGIN_SUCCESS, {
      uid: userStore.uid
    })

    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    emit('success')
    emit('close')
  } catch (error) {
    logger.error('[login-modal] 登录失败', error)
    uni.showToast({
      title: '登录失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const handlePrivacy = () => {
  uni.showToast({
    title: '查看用户协议',
    icon: 'none'
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  position: relative;
  width: 600rpx;
  max-width: 90%;
  background: #fff;
  border-radius: $radius-xl;
  padding: 64rpx 48rpx;
  animation: slideUp 0.3s ease;
}

.modal-close {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .close-icon {
    font-size: 32rpx;
    color: $text-tertiary;
  }
}

.login-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .modal-icon {
    font-size: 120rpx;
    margin-bottom: 32rpx;
  }
  
  .modal-title {
    font-size: $font-xl;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  .modal-desc {
    font-size: $font-sm;
    color: $text-secondary;
    margin-bottom: 48rpx;
    text-align: center;
  }
  
  .privacy-text {
    font-size: $font-xs;
    color: $text-tertiary;
    text-align: center;
    line-height: 1.6;
    
    .privacy-link {
      color: $primary-blue;
    }
  }
}

.native-login-button {
  width: 100%;
  height: 96rpx;
  border-radius: $radius-full;
  background: linear-gradient(90deg, #3B82F6, #9333EA);
  color: #fff;
  font-size: $font-base;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin-bottom: 16rpx;
  transition: opacity 0.2s ease;

  &:disabled {
    opacity: 0.6;
  }
}

.native-login-button__text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>

