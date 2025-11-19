<template>
  <view class="settings-page">
    <scroll-view class="settings-scroll" scroll-y>
      <view v-if="!isLogin" class="empty-state">
        <text class="empty-title">请先登录后再设置个人信息</text>
        <text class="empty-desc">前往“我的”页面完成快捷登录即可继续。</text>
      </view>
      
      <view v-else>
        <view class="section">
          <text class="section-title">个人资料</text>
          
          <view class="form-group">
            <text class="form-label required">称呼</text>
            <input
              v-model="formData.name"
              class="form-input"
              placeholder="请输入称呼"
              placeholder-class="input-placeholder"
              maxlength="20"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label required">联系电话</text>
            <input
              v-model="formData.phone"
              class="form-input"
              type="number"
              placeholder="请输入手机号"
              placeholder-class="input-placeholder"
              maxlength="11"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">微信号（选填）</text>
            <input
              v-model="formData.wechat"
              class="form-input"
              placeholder="请输入微信号"
              placeholder-class="input-placeholder"
              maxlength="20"
            />
          </view>
          
          <glass-button
            type="primary"
            block
            :loading="saving"
            @tap="handleSave"
          >
            保存修改
          </glass-button>
        </view>
        
        <view class="section section-docs">
          <text class="section-title">条款</text>
          <view class="doc-card">
            <view class="doc-info">
              <text class="doc-title doc-title--primary">隐私政策</text>
            </view>
            <glass-button
              size="small"
              type="text"
              class="doc-button"
              :loading="docLoading === 'privacy'"
              @tap="openDocument('privacy')"
            >
              <text class="doc-button__text">查看</text>
            </glass-button>
          </view>
          <view class="doc-card">
            <view class="doc-info">
              <text class="doc-title doc-title--primary">用户协议</text>
            </view>
            <glass-button
              size="small"
              type="text"
              class="doc-button"
              :loading="docLoading === 'agreement'"
              @tap="openDocument('agreement')"
            >
              <text class="doc-button__text">查看</text>
            </glass-button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { reactive, computed, watch, ref } from 'vue'
import { useUserStore } from '@/store/user'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { validateRequired, validateLength, validatePhone, validateWechat } from '@/utils/validator'
import { CLOUD_STORAGE } from '@/utils/cloud-storage'
import { logger } from '@/utils/logger'

const userStore = useUserStore()
const isLogin = computed(() => userStore.isLogin)

const formData = reactive({
  name: '',
  phone: '',
  wechat: ''
})

const saving = ref(false)
const docLoading = ref('')

watch(
  () => userStore.userInfo,
  (info) => {
    formData.name = info?.name || ''
    formData.phone = info?.phone || ''
    formData.wechat = info?.wechat || ''
  },
  { immediate: true }
)

const openDocument = async (type) => {
  if (docLoading.value) return
  const linkMap = {
    privacy: CLOUD_STORAGE.documents.privacyPolicy,
    agreement: CLOUD_STORAGE.documents.userAgreement
  }
  
  const target = linkMap[type]
  if (!target) {
    uni.showToast({
      title: '请先配置文档链接',
      icon: 'none'
    })
    return
  }
  
  docLoading.value = type
  try {
    let filePath = target
    if (target.startsWith('cloud://')) {
      const res = await wx.cloud.downloadFile({ fileID: target })
      filePath = res.tempFilePath
    } else if (/^https?:\/\//.test(target)) {
      filePath = await downloadHttpFile(target)
    }
    
    await wx.openDocument({
      filePath,
      fileType: 'pdf'
    })
  } catch (error) {
    logger.error('[settings] 打开文档失败', error)
    uni.showToast({
      title: '无法打开文档',
      icon: 'none'
    })
  } finally {
    docLoading.value = ''
  }
}

const downloadHttpFile = (url) => {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error('下载失败'))
        }
      },
      fail: reject
    })
  })
}

const handleSave = async () => {
  if (!isLogin.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  const name = formData.name.trim()
  const phone = formData.phone.trim()
  const wechat = formData.wechat.trim()
  
  if (!validateRequired(name)) {
    uni.showToast({
      title: '请输入称呼',
      icon: 'none'
    })
    return
  }
  
  if (!validateLength(name, 2, 20)) {
    uni.showToast({
      title: '称呼长度应在2-20个字符之间',
      icon: 'none'
    })
    return
  }
  
  if (phone && !validatePhone(phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  
  if (wechat && !validateWechat(wechat)) {
    uni.showToast({
      title: '请输入正确的微信号',
      icon: 'none'
    })
    return
  }
  
  saving.value = true
  try {
    await userStore.updateProfile({ name, phone, wechat })
    uni.showToast({
      title: '已保存',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: error.message || '保存失败，请重试',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.settings-page {
  min-height: 100vh;
  background: $bg-color;
}

.settings-scroll {
  height: 100vh;
  padding: $spacing-lg;
  box-sizing: border-box;
}

.empty-state {
  background: #fff;
  border-radius: $radius-lg;
  padding: 80rpx 40rpx;
  text-align: center;
  box-shadow: 0 24rpx 40rpx rgba(15, 23, 42, 0.08);
  margin-top: 80rpx;
  
  .empty-title {
    display: block;
    font-size: $font-lg;
    color: $text-primary;
    margin-bottom: 12rpx;
    font-weight: 600;
  }
  
  .empty-desc {
    font-size: $font-sm;
    color: $text-secondary;
    line-height: 1.6;
  }
}

.section {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 24rpx 40rpx rgba(15, 23, 42, 0.08);
}

.section-title {
  display: block;
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
  
  &:last-of-type {
    margin-bottom: 48rpx;
  }
  
  .form-label {
    display: block;
    margin-bottom: 12rpx;
    font-size: $font-sm;
    color: $text-secondary;
  }
  
  .required::after {
    content: '*';
    color: #ef4444;
    margin-left: 6rpx;
  }
  
  .form-input {
    width: 100%;
    height: 96rpx;
    border-radius: $radius-md;
    border: 1px solid rgba(17, 24, 39, 0.1);
    padding: 0 24rpx;
    font-size: $font-base;
    box-sizing: border-box;
  }
}

.section-docs {
.doc-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24rpx;
    padding: 24rpx 0;
    
    &:not(:last-of-type) {
      border-bottom: 1px solid rgba(17, 24, 39, 0.05);
    }
    
    .doc-info {
      flex: 1;
      
      .doc-title {
        display: block;
        font-size: 36rpx;
        font-weight: 600;
        color: $text-primary;
      }
      
      .doc-title--primary {
        font-size: 38rpx;
      }
    }
  }
  
  .doc-button {
    :deep(.glass-button) {
      background: #ffffff !important;
      border: 1px solid rgba(17, 24, 39, 0.1) !important;
      box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
      color: $text-primary !important;
      border-radius: $radius-full;
      padding: 16rpx 40rpx;
    }
    
    .doc-button__text {
      color: $text-primary;
      font-size: $font-sm;
      font-weight: 600;
    }
  }
}
</style>
