<template>
  <view class="redeem-codes-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar safe-area-top">
      <view class="navbar-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="navbar-title">兑换码管理</text>
    </view>
    
    <scroll-view class="page-content" scroll-y>
      <!-- 生成兑换码 -->
      <view class="generate-section">
        <glass-card>
          <view class="section-title">生成新兑换码</view>
          
          <view class="form-group">
            <text class="form-label">数量</text>
            <input 
              v-model.number="generateCount"
              class="form-input"
              type="number"
              placeholder="输入生成数量"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">有效期（天）</text>
            
            <!-- 快捷选择按钮 -->
            <view class="quick-select">
              <view 
                class="quick-btn"
                :class="{ active: validDays === 31 }"
                @tap="validDays = 31"
              >
                <text class="btn-text">31天</text>
              </view>
              <view 
                class="quick-btn"
                :class="{ active: validDays === 90 }"
                @tap="validDays = 90"
              >
                <text class="btn-text">一季度(90天)</text>
              </view>
              <view 
                class="quick-btn"
                :class="{ active: validDays === 365 }"
                @tap="validDays = 365"
              >
                <text class="btn-text">一年(365天)</text>
              </view>
            </view>
            
            <input 
              v-model.number="validDays"
              class="form-input"
              type="number"
              placeholder="或输入自定义天数"
            />
          </view>
          
          <glass-button
            type="primary"
            block
            :loading="generating"
            @tap="handleGenerate"
          >
            生成兑换码
          </glass-button>
        </glass-card>
      </view>
      
      <!-- 兑换码列表 -->
      <view class="codes-section">
        <glass-card>
          <view class="section-title">兑换码列表</view>
          
          <view v-if="loading" class="loading-state">
            <text>加载中...</text>
          </view>
          
          <view v-else-if="codes.length === 0" class="empty-state">
            <text>暂无兑换码</text>
          </view>
          
          <view v-else class="codes-list">
            <view 
              v-for="code in codes" 
              :key="code._id"
              class="code-item"
            >
              <view class="code-info">
                <view class="code-value" @tap="copyCode(code.code)">
                  <text class="code-text">{{ code.code }}</text>
                  <text class="copy-icon">📋</text>
                </view>
                <view class="code-meta">
                  <text class="meta-item">有效期: {{ code.validDays }}天</text>
                  <text class="meta-item">状态: {{ code.used ? '已使用' : '未使用' }}</text>
                </view>
                <view v-if="code.usedBy" class="code-used">
                  <text class="used-text">使用者: {{ code.usedBy }}</text>
                  <text class="used-text">使用时间: {{ formatDate(code.usedAt) }}</text>
                </view>
              </view>
            </view>
          </view>
        </glass-card>
      </view>
      
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { logger } from '@/utils/logger'

const disableShare = true
defineExpose({
  disableShare
})

const generateCount = ref(1)
const validDays = ref(31)
const generating = ref(false)
const loading = ref(false)
const codes = ref([])

// 返回
const goBack = () => {
  uni.navigateBack()
}

// 生成兑换码
const handleGenerate = async () => {
  if (!generateCount.value || generateCount.value < 1) {
    uni.showToast({
      title: '请输入有效数量',
      icon: 'none'
    })
    return
  }
  
  if (!validDays.value || validDays.value < 1) {
    uni.showToast({
      title: '请输入有效天数',
      icon: 'none'
    })
    return
  }
  
  generating.value = true
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'generateRedeemCodes',
        params: {
          count: generateCount.value,
          validDays: validDays.value
        }
      }
    })
    
    if (res.result.code === 0) {
      uni.showToast({
        title: `成功生成${generateCount.value}个兑换码`,
        icon: 'success'
      })
      
      // 刷新列表
      loadCodes()
      
      // 重置表单
      generateCount.value = 1
      validDays.value = 31
    } else {
      throw new Error(res.result.message || '生成失败')
    }
  } catch (error) {
    logger.error('生成兑换码失败:', error)
    uni.showToast({
      title: error.message || '生成失败',
      icon: 'none'
    })
  } finally {
    generating.value = false
  }
}

// 加载兑换码列表
const loadCodes = async () => {
  loading.value = true
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getRedeemCodes'
      }
    })
    
    if (res.result.code === 0) {
      codes.value = res.result.data || []
    } else {
      throw new Error(res.result.message || '加载失败')
    }
  } catch (error) {
    logger.error('加载兑换码失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 复制兑换码
const copyCode = (code) => {
  uni.setClipboardData({
    data: code,
    success: () => {
      uni.showToast({
        title: '已复制兑换码',
        icon: 'success'
      })
    }
  })
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loadCodes()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.redeem-codes-page {
  min-height: 100vh;
  background: $bg-color;
}

.custom-navbar {
  position: relative;
  padding: 32rpx $spacing-lg 24rpx;
  padding-top: calc(32rpx + env(safe-area-inset-top));
  padding-top: calc(32rpx + constant(safe-area-inset-top));
  background: #fff;
  display: flex;
  align-items: center;
  
  .navbar-back {
    position: absolute;
    left: $spacing-lg;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .back-icon {
      font-size: 48rpx;
      color: $text-primary;
      font-weight: 300;
    }
  }
  
  .navbar-title {
    flex: 1;
    font-size: $font-2xl;
    font-weight: bold;
    color: $text-primary;
    text-align: center;
  }
}

.page-content {
  height: calc(100vh - 140rpx);
}

.generate-section,
.codes-section {
  padding: $spacing-lg;
  
  .section-title {
    font-size: $font-lg;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: $spacing-lg;
  }
  
  .form-group {
    margin-bottom: $spacing-lg;
    
    .form-label {
      display: block;
      font-size: $font-sm;
      color: $text-secondary;
      margin-bottom: $spacing-sm;
    }
    
    .quick-select {
      display: flex;
      gap: $spacing-sm;
      margin-bottom: $spacing-md;
      
      .quick-btn {
        flex: 1;
        padding: $spacing-sm $spacing-xs;
        background: rgba(0, 0, 0, 0.03);
        border: 2px solid transparent;
        border-radius: $radius-sm;
        text-align: center;
        transition: all 0.2s ease;
        
        .btn-text {
          font-size: $font-xs;
          color: $text-secondary;
        }
        
        &.active {
          background: $primary-blue;
          border-color: $primary-blue;
          
          .btn-text {
            color: #fff;
            font-weight: bold;
          }
        }
        
        &:active {
          opacity: 0.8;
        }
      }
    }
    
    .form-input {
      width: 100%;
      height: 88rpx;
      padding: 0 $spacing-md;
      background: rgba(0, 0, 0, 0.03);
      border: 2px solid transparent;
      border-radius: $radius-md;
      font-size: $font-lg;
      color: $text-primary;
      box-sizing: border-box;
      line-height: 88rpx;
      
      &:focus {
        background: #fff;
        border-color: $primary-blue;
      }
    }
  }
}

.loading-state,
.empty-state {
  padding: 80rpx 0;
  text-align: center;
  color: $text-tertiary;
  font-size: $font-sm;
}

.codes-list {
  .code-item {
    padding: $spacing-lg;
    background: rgba(0, 0, 0, 0.02);
    border-radius: $radius-md;
    margin-bottom: $spacing-md;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .code-value {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-md;
      background: #fff;
      border-radius: $radius-sm;
      margin-bottom: $spacing-sm;
      
      .code-text {
        font-size: $font-lg;
        font-weight: bold;
        color: $primary-blue;
        letter-spacing: 2rpx;
      }
      
      .copy-icon {
        font-size: $font-xl;
      }
    }
    
    .code-meta {
      display: flex;
      gap: $spacing-md;
      margin-bottom: $spacing-sm;
      
      .meta-item {
        font-size: $font-xs;
        color: $text-secondary;
      }
    }
    
    .code-used {
      padding-top: $spacing-sm;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      
      .used-text {
        display: block;
        font-size: $font-xs;
        color: $text-tertiary;
        margin-top: 4rpx;
      }
    }
  }
}

.bottom-placeholder {
  height: 32rpx;
}
</style>
