<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-close" @tap="handleClose">
        <text class="close-icon">✕</text>
      </view>
      
      <view class="redeem-modal">
        <view class="modal-title">
          <text>{{ userStore.isNeoMember ? '续费' : '兑换' }}</text>
          <text class="neo-text">NEO</text>
          <text>会员</text>
        </view>
        
        <!-- 兑换码输入 -->
        <view class="form-group">
          <text class="form-label">请输入兑换码</text>
          <input 
            v-model="redeemCode"
            class="form-input"
            placeholder="输入兑换码"
            placeholder-style="color: #999; font-size: 28rpx; text-align: center;"
            :adjust-position="false"
            :cursor-spacing="0"
            confirm-type="done"
          />
        </view>
        
        <glass-button
          class="redeem-button"
          type="primary"
          block
          :loading="loading"
          @tap="handleRedeem"
        >
          立即兑换
        </glass-button>
        
        <view class="help-text">
          <text class="help-label">还没有兑换码?</text>
          <text class="help-link" @tap.stop="handleContact">联系客服获取</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { useUserStore } from '@/store/user'
import { vipApi } from '@/utils/request'
import { validateRedeemCode } from '@/utils/validator'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import { openEnterpriseCustomerService } from '@/utils/customer-service-config'
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
const redeemCode = ref('')

const handleClose = () => {
  emit('close')
}

const handleRedeem = async () => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.VIP_UPGRADE_SHOW)
  
  // 验证兑换码格式
  const validation = validateRedeemCode(redeemCode.value)
  if (!validation.valid) {
    uni.showToast({
      title: validation.message,
      icon: 'none'
    })
    return
  }
  
  loading.value = true
  
  try {
    const result = await vipApi.verifyRedeemCode(redeemCode.value)
    
    // 更新用户VIP状态（包括 role 字段）
    userStore.upgradeVip(result.vipLevel, result.vipExpiry, result.role)
    
    // 数据埋点
    trackEvent(TRACK_EVENTS.VIP_UPGRADE_SUCCESS, {
      uid: userStore.uid,
      vipLevel: result.vipLevel,
      role: result.role
    })
    
    // 显示成功提示（管理员兑换码显示特殊提示）
    const message = result.role === 'admin' ? '恭喜！您已获得管理员权限' : '兑换成功！'
    uni.showToast({
      title: message,
      icon: 'success',
      duration: 2000
    })
    
    emit('success')
    emit('close')
    
    // 如果是管理员兑换码，刷新页面以显示管理员功能
    if (result.role === 'admin') {
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/profile/profile'
        })
      }, 2000)
    }
  } catch (error) {
    logger.error('[redeem-modal] 兑换失败', error)
  } finally {
    loading.value = false
  }
}

const handleContact = () => {
  emit('close')
  openEnterpriseCustomerService()
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

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
  padding: 0 32rpx;
  box-sizing: border-box;
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 600rpx;
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

.redeem-modal {
  .modal-title {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-xl;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 48rpx;
    text-align: center;
    
    .neo-text {
      margin: 0 4rpx;
    }
  }
  
  .form-group {
    margin-bottom: 32rpx;
    
    .form-label {
      display: block;
      font-size: $font-base;
      color: $text-secondary;
      margin-bottom: 16rpx;
      text-align: center;
    }
    
    .form-input {
      width: 100%;
      height: 100rpx;
      padding: 0 24rpx;
      background: rgba(0, 0, 0, 0.03);
      border: 2px solid transparent;
      border-radius: $radius-md;
      font-size: 28rpx;
      color: $text-primary;
      text-align: center;
      transition: all 0.2s ease;
      box-sizing: border-box;
      line-height: 100rpx;
      
      &:focus {
        background: #fff;
        border-color: $primary-blue;
      }
    }
  }
  
  .redeem-button {
    margin-bottom: 24rpx;
    
    ::v-deep .glass-button {
      height: 88rpx !important;
      min-height: 88rpx !important;
    }
  }
  
  .help-text {
    text-align: center;
    
    .help-label {
      font-size: $font-xs;
      color: $text-tertiary;
    }
    
    .help-link {
      font-size: $font-xs;
      color: $primary-blue;
      margin-left: 8rpx;
    }
  }
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

