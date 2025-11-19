<template>
  <view class="customer-service">
    <!-- 方式 1：微信客服按钮 -->
    <button
      v-if="type === 'wechat'"
      class="service-button"
      open-type="contact"
      :session-from="sessionFrom"
      :send-message-title="messageTitle"
      :send-message-path="messagePath"
      :send-message-img="messageImg"
      :show-message-card="showMessageCard"
    >
      <text class="button-icon">💬</text>
      <text class="button-text">{{ buttonText }}</text>
    </button>
    
    <!-- 方式 2：企业微信客服按钮 -->
    <button
      v-else-if="type === 'enterprise'"
      class="service-button"
      @tap="openEnterpriseService"
    >
      <text class="button-icon">👨‍💼</text>
      <text class="button-text">{{ buttonText }}</text>
    </button>
    
    <!-- 方式 3：显示企业微信二维码 -->
    <view
      v-else-if="type === 'qrcode'"
      class="service-button"
      @tap="showQrcode"
    >
      <text class="button-icon">📱</text>
      <text class="button-text">{{ buttonText }}</text>
    </view>
    
    <!-- 方式 4：复制企业微信号 -->
    <view
      v-else-if="type === 'copy'"
      class="service-button"
      @tap="copyWechatId"
    >
      <text class="button-icon">📋</text>
      <text class="button-text">{{ buttonText }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { ENTERPRISE_WECHAT_CONFIG, openEnterpriseCustomerService } from '@/utils/customer-service-config'

const props = defineProps({
  // 类型：wechat(微信客服) | enterprise(企业微信客服) | qrcode(二维码) | copy(复制微信号)
  type: {
    type: String,
    default: 'wechat'
  },
  // 按钮文字
  buttonText: {
    type: String,
    default: '联系客服'
  },
  // 会话来源
  sessionFrom: {
    type: String,
    default: '小程序'
  },
  // 消息卡片标题
  messageTitle: {
    type: String,
    default: '咨询客服'
  },
  // 消息卡片路径
  messagePath: {
    type: String,
    default: '/pages/index/index'
  },
  // 消息卡片图片
  messageImg: {
    type: String,
    default: ''
  },
  // 是否显示消息卡片
  showMessageCard: {
    type: Boolean,
    default: true
  },
  // 企业微信客服链接
  enterpriseUrl: {
    type: String,
    default: ''
  },
  // 企业ID
  corpId: {
    type: String,
    default: ''
  },
  // 企业微信二维码
  qrcodeUrl: {
    type: String,
    default: ''
  },
  // 企业微信号
  wechatId: {
    type: String,
    default: ''
  }
})

// 打开企业微信客服
const openEnterpriseService = () => {
  const serviceUrl = props.enterpriseUrl || ENTERPRISE_WECHAT_CONFIG.url
  const corpId = props.corpId || ENTERPRISE_WECHAT_CONFIG.corpId
  
  if (!serviceUrl || !corpId) {
    uni.showToast({
      title: '客服配置错误',
      icon: 'none'
    })
    return
  }
  
  openEnterpriseCustomerService({ url: serviceUrl, corpId })
}

// 显示二维码
const showQrcode = () => {
  if (!props.qrcodeUrl) {
    uni.showToast({
      title: '二维码未配置',
      icon: 'none'
    })
    return
  }
  
  wx.previewImage({
    urls: [props.qrcodeUrl],
    current: props.qrcodeUrl
  })
}

// 复制企业微信号
const copyWechatId = () => {
  if (!props.wechatId) {
    uni.showToast({
      title: '微信号未配置',
      icon: 'none'
    })
    return
  }
  
  wx.setClipboardData({
    data: props.wechatId,
    success() {
      uni.showToast({
        title: '微信号已复制',
        icon: 'success'
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.customer-service {
  .service-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    padding: 24rpx 48rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 16rpx;
    box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
    
    .button-icon {
      font-size: 36rpx;
    }
    
    .button-text {
      font-size: 28rpx;
      color: #fff;
      font-weight: 600;
    }
    
    &:active {
      transform: scale(0.98);
      box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.2);
    }
    
    // 去除按钮默认样式
    &::after {
      border: none;
    }
  }
}
</style>
