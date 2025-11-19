<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-close" @tap="handleClose">
        <text class="close-icon">✕</text>
      </view>
      
      <view class="qrcode-modal">
        <text class="modal-title">{{ title || '扫码联系我们' }}</text>
        
        <text v-if="description" class="modal-desc">{{ description }}</text>
        
        <!-- 二维码展示 -->
        <view class="qrcode-container">
          <image 
            v-if="qrcodeUrl" 
            :src="qrcodeUrl" 
            mode="aspectFit"
            class="qrcode-image"
          />
          <view v-else class="qrcode-placeholder">
            <text class="placeholder-text">📱</text>
          </view>
        </view>
        
        <text v-if="tip" class="qrcode-tip">{{ tip }}</text>
        
        <glass-button
          class="close-button"
          type="secondary"
          block
          @tap="handleClose"
        >
          关闭
        </glass-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import GlassButton from '@/components/glass-button/glass-button.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  // 标题
  title: {
    type: String,
    default: '扫码联系我们'
  },
  // 描述
  description: {
    type: String,
    default: ''
  },
  // 二维码图片URL
  qrcodeUrl: {
    type: String,
    default: ''
  },
  // 提示文字
  tip: {
    type: String,
    default: '添加时请备注: "Startupilot用户咨询"'
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
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

.qrcode-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .modal-title {
    font-size: $font-xl;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  .modal-desc {
    font-size: $font-sm;
    color: $text-secondary;
    text-align: center;
    margin-bottom: 32rpx;
  }
  
  .qrcode-container {
    width: 400rpx;
    height: 400rpx;
    padding: 24rpx;
    background: #fff;
    border-radius: $radius-lg;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 24rpx;
    
    .qrcode-image,
    .qrcode-placeholder {
      width: 100%;
      height: 100%;
    }
    
    .qrcode-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.03);
      border-radius: $radius-md;
      
      .placeholder-text {
        font-size: 120rpx;
      }
    }
  }
  
  .qrcode-tip {
    font-size: $font-xs;
    color: $text-tertiary;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 32rpx;
  }
  
  .close-button {
    width: 100%;
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

