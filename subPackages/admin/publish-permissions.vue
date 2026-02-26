<template>
  <view class="permissions-page">
    <view class="custom-navbar safe-area-top">
      <view class="navbar-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="navbar-title">发布权限管理</text>
    </view>
    
    <scroll-view class="page-content" scroll-y>
      <view class="section">
        <glass-card>
          <view class="section-title">查询用户</view>
          
          <view class="form-group">
            <text class="form-label">用户 UID 或手机号</text>
            <input
              v-model="keyword"
              class="form-input"
              placeholder="请输入 UID 或手机号"
            />
          </view>
          
          <glass-button
            type="primary"
            block
            :loading="loading"
            @tap="handleSearch"
          >
            查询用户
          </glass-button>
        </glass-card>
      </view>
      
      <view v-if="userInfo" class="section">
        <glass-card>
          <view class="section-title">用户信息</view>
          <view class="user-row">
            <text class="user-label">UID</text>
            <text class="user-value">{{ userInfo.uid }}</text>
          </view>
          <view class="user-row">
            <text class="user-label">姓名</text>
            <text class="user-value">{{ userInfo.name || '-' }}</text>
          </view>
          <view class="user-row">
            <text class="user-label">手机号</text>
            <text class="user-value">{{ userInfo.phone || '-' }}</text>
          </view>
          <view class="user-row">
            <text class="user-label">身份</text>
            <text class="user-value">{{ userInfo.role || '-' }}</text>
          </view>
          
          <view class="permission-status" :class="{ disabled: userInfo.canPublishProject === false }">
            <text class="status-label">当前状态</text>
            <text class="status-value">
              {{ userInfo.canPublishProject === false ? '禁止发布' : '允许发布' }}
            </text>
          </view>
          
          <glass-button
            type="secondary"
            block
            :loading="updating"
            @tap="togglePermission"
          >
            {{ userInfo.canPublishProject === false ? '允许该用户发布' : '禁止该用户发布' }}
          </glass-button>
        </glass-card>
      </view>
      
      <view v-else-if="hasSearched && !loading" class="section">
        <glass-card>
          <view class="empty-text">未找到对应的用户，请确认输入是否正确。</view>
        </glass-card>
      </view>
      
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { logger } from '@/utils/logger'

const disableShare = true
defineExpose({
  disableShare
})

const keyword = ref('')
const loading = ref(false)
const updating = ref(false)
const userInfo = ref(null)
const hasSearched = ref(false)

const goBack = () => {
  uni.navigateBack()
}

const handleSearch = async () => {
  if (!keyword.value.trim()) {
    uni.showToast({
      title: '请输入 UID 或手机号',
      icon: 'none'
    })
    return
  }
  
  loading.value = true
  hasSearched.value = true
  userInfo.value = null
  
  const searchKeyword = keyword.value.trim()
  logger.log('查询关键词:', searchKeyword, '类型:', typeof searchKeyword)
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getPublishPermission',
        params: {
          keyword: searchKeyword
        }
      }
    })
    
    logger.log('云函数返回:', res.result)
    
    if (res.result.code === 0 && res.result.data) {
      userInfo.value = res.result.data.user
      uni.showToast({
        title: '查询成功',
        icon: 'success'
      })
    } else {
      throw new Error(res.result.message || '查询失败')
    }
  } catch (error) {
    logger.error('查询发布权限失败:', error)
    uni.showToast({
      title: error.message || '查询失败',
      icon: 'none',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

const togglePermission = async () => {
  if (!userInfo.value) return
  
  updating.value = true
  const isCurrentlyAllowed = userInfo.value.canPublishProject !== false
  const nextState = !isCurrentlyAllowed
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'setPublishPermission',
        params: {
          uid: userInfo.value.uid,
          canPublish: nextState
        }
      }
    })
    
    if (res.result.code === 0) {
      userInfo.value = {
        ...userInfo.value,
        canPublishProject: nextState
      }
      uni.showToast({
        title: '权限已更新',
        icon: 'success'
      })
    } else {
      throw new Error(res.result.message || '更新失败')
    }
  } catch (error) {
    logger.error('更新发布权限失败:', error)
    uni.showToast({
      title: error.message || '更新失败',
      icon: 'none'
    })
  } finally {
    updating.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.permissions-page {
  min-height: 100vh;
  background: $bg-color;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding: calc(env(safe-area-inset-top) + 16rpx) $spacing-lg 16rpx;
  padding-top: calc(constant(safe-area-inset-top) + 16rpx);
  background: #fff;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  
  .navbar-back {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    background: rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .back-icon {
    font-size: 40rpx;
    color: $text-primary;
  }
  
  .navbar-title {
    font-size: $font-lg;
    font-weight: bold;
    color: $text-primary;
  }
}

.page-content {
  position: absolute;
  top: calc(130rpx + env(safe-area-inset-top));
  left: 0;
  right: 0;
  bottom: 0;
}

.section {
  padding: $spacing-lg;
}

.section-title {
  font-size: $font-lg;
  font-weight: 600;
  margin-bottom: 32rpx;
  color: $text-primary;
}

.form-group {
  margin-bottom: 32rpx;
  
  .form-label {
    display: block;
    font-size: $font-sm;
    color: $text-secondary;
    margin-bottom: 12rpx;
  }
  
  .form-input {
    width: 100%;
    height: 92rpx;
    border-radius: $radius-md;
    border: 1px solid rgba(0,0,0,0.1);
    padding: 0 24rpx;
    box-sizing: border-box;
    font-size: $font-base;
    background: rgba(255,255,255,0.9);
  }
}

.user-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  
  .user-label {
    font-size: $font-sm;
    color: $text-tertiary;
  }
  
  .user-value {
    font-size: $font-base;
    color: $text-primary;
  }
}

.permission-status {
  margin: 32rpx 0;
  padding: 24rpx;
  border-radius: $radius-md;
  background: rgba(59,130,246,0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &.disabled {
    background: rgba(220,38,38,0.08);
    
    .status-value {
      color: #dc2626;
    }
  }
  
  .status-label {
    font-size: $font-sm;
    color: $text-secondary;
  }
  
  .status-value {
    font-size: $font-base;
    font-weight: 600;
    color: $primary-blue;
  }
}

.empty-text {
  font-size: $font-base;
  color: $text-secondary;
  text-align: center;
  padding: 24rpx 0;
}
</style>