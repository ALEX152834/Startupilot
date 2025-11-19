<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-close" @tap="handleClose">
        <text class="close-icon">✕</text>
      </view>
      
      <view class="form-modal">
        <text class="modal-title">填写报名信息</text>
        
        <view class="form-group">
          <text class="form-label">您的称呼 *</text>
          <input 
            v-model="formData.name"
            class="form-input"
            :cursor-spacing="20"
            :adjust-position="true"
            maxlength="20"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">联系电话 *</text>
          <input 
            v-model="formData.phone"
            class="form-input"
            type="number"
            :cursor-spacing="20"
            :adjust-position="true"
            maxlength="11"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">微信号 (选填)</text>
          <input 
            v-model="formData.wechat"
            class="form-input"
            :cursor-spacing="20"
            :adjust-position="true"
            maxlength="20"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">您的身份 *</text>
          <view class="radio-group">
            <view 
              v-for="role in roles" 
              :key="role.value"
              class="radio-item"
              @tap="formData.role = role.value"
            >
              <text class="radio-icon">{{ formData.role === role.value ? '●' : '○' }}</text>
              <text class="radio-label">{{ role.label }}</text>
            </view>
          </view>
        </view>
        
        <glass-button
          class="submit-button"
          type="primary"
          block
          :loading="loading"
          @tap="handleSubmit"
        >
          提交报名
        </glass-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { useUserStore } from '@/store/user'
import { validateRegistrationForm } from '@/utils/validator'
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

const roles = [
  { label: '创业者', value: 'entrepreneur' },
  { label: '投资人', value: 'investor' },
  { label: '顾问', value: 'advisor' },
  { label: '其他', value: 'other' }
]

const formData = reactive({
  name: '',
  phone: '',
  wechat: '',
  role: '',
  organization: '',  // 后端需要，发送空值
  attendees: 1       // 后端需要，默认1人
})

const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.FORM_SHOW)
  
  // 表单验证
  const validation = validateRegistrationForm(formData)
  
  if (!validation.valid) {
    uni.showToast({
      title: validation.message,
      icon: 'none',
      duration: 3000
    })
    return
  }
  
  loading.value = true
  
  try {
    // 保存到后端
    await userStore.saveRegistrationInfo(formData)
    
    // 数据埋点
    trackEvent(TRACK_EVENTS.FORM_SUCCESS, {
      role: formData.role
    })
    
    uni.showToast({
      title: '信息保存成功',
      icon: 'success'
    })
    
    emit('success')
    emit('close')
  } catch (error) {
    logger.error('[form-modal] 保存报名信息失败', error)
    uni.showToast({
      title: error.message || '保存失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
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
  overflow-y: auto;
}

.modal-content {
  position: relative;
  width: 600rpx;
  max-width: 90%;
  max-height: 75vh;
  background: #fff;
  border-radius: $radius-xl;
  padding: 48rpx 40rpx;
  animation: slideUp 0.3s ease;
  overflow-y: auto;
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

.form-modal {
  .modal-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 32rpx;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 24rpx;
    
    .form-label {
      display: block;
      font-size: 26rpx;
      font-weight: 500;
      color: $text-primary;
      margin-bottom: 12rpx;
    }
    
    .form-input {
      width: 100%;
      min-height: 80rpx;
      padding: 0 20rpx;
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: $radius-md;
      font-size: 28rpx;
      color: #000000;
      transition: all 0.2s ease;
      box-sizing: border-box;
      line-height: 80rpx;
      
      &:focus {
        background: #fff;
        border-color: $primary-blue;
      }
    }
    
    .radio-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12rpx;
      
      .radio-item {
        display: flex;
        align-items: center;
        gap: 8rpx;
        padding: 18rpx 14rpx;
        background: #F9FAFB;
        border: 2px solid #E5E7EB;
        border-radius: $radius-md;
        transition: all 0.2s ease;
        
        .radio-icon {
          font-size: 24rpx;
          color: $primary-blue;
        }
        
        .radio-label {
          font-size: 26rpx;
          color: $text-primary;
        }
        
        &:active {
          background: rgba(59, 130, 246, 0.08);
          border-color: $primary-blue;
        }
      }
    }
  }
  
  .submit-button {
    margin-top: 16rpx;
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

