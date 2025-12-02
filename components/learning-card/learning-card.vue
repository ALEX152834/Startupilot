<template>
  <glass-card class="learning-card" :opacity="1" @tap="handleTap">
    <!-- VIP标识 -->
    <view v-if="isNeoResource" class="learning-card__vip-badge">
      <text class="badge-text">NEO会员</text>
    </view>
    
    <!-- 收藏按钮 -->
    <view class="learning-card__favorite" @tap.stop="handleFavorite">
      <view class="favorite-icon" :class="{ 'is-favorited': resource.isFavorited }">
        <text>{{ resource.isFavorited ? '❤️' : '♡' }}</text>
      </view>
    </view>
    
    <!-- 资源封面 -->
    <view class="learning-card__image" :class="{ 'is-locked': !resource.canAccess }">
      <image 
        v-if="resource.image" 
        :src="resource.image" 
        mode="aspectFill"
        class="image"
        lazy-load="true"
      />
      <view v-else class="image-placeholder">
        <text class="placeholder-text">📚</text>
      </view>
      <view class="image-overlay"></view>
      
      <!-- 锁标识 -->
      <view v-if="!resource.canAccess" class="lock-overlay">
        <text class="lock-icon">🔒</text>
        <text class="lock-text">需要升级至NEO会员才能访问此内容</text>
      </view>
    </view>
    
    <!-- 资源信息 -->
    <view class="learning-card__content">
      <text class="learning-card__title">{{ resource.title }}</text>
      
      <text v-if="resource.description" class="learning-card__description">
        {{ resource.description }}
      </text>
      
      <!-- 案例分享 -->
      <view v-if="resource.caseExample" class="learning-card__case">
        <view class="case-icon">📘</view>
        <view class="case-content">
          <text class="case-label">案例分享</text>
          <text class="case-text">{{ resource.caseExample }}</text>
        </view>
      </view>
      
      <!-- 分类标签 -->
      <view class="learning-card__footer">
        <view class="tag-group">
          <view
            v-for="(tag, index) in normalizeCategory(resource.category)"
            :key="`category-${resource._id || ''}-${index}`"
            class="category-tag"
          >
            {{ tag }}
          </view>
        </view>
        <text class="date-text">{{ formatDate(resource.publishedAt, resource.createdAt, resource._id) }}</text>
      </view>
      
      <!-- 查看按钮 -->
      <button
        v-if="!isLogin"
        class="learning-card__native-button"
        open-type="getPhoneNumber"
        @getphonenumber.stop="handleAuthorize"
      >
        <view class="learning-card__button-text">
          {{ resource.canAccess ? '学习资源' : '需要NEO会员' }}
        </view>
      </button>
      <glass-button
        v-else
        class="learning-card__button"
        :type="resource.canAccess ? 'primary' : 'secondary'"
        size="small"
        block
        @tap.stop="handleView"
      >
        {{ resource.canAccess ? '学习资源' : '需要NEO会员' }}
      </glass-button>
    </view>
  </glass-card>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { logger } from '@/utils/logger'

const props = defineProps({
  resource: {
    type: Object,
    required: true
  },
  isLogin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['tap', 'view', 'favorite', 'authorize'])

const normalizedVipLevel = computed(() => {
  const level = props.resource?.requiredVipLevel
  return typeof level === 'string' ? level.trim().toLowerCase() : ''
})

const isNeoResource = computed(() => normalizedVipLevel.value === 'neo')

const normalizeCategory = (category) => {
  if (!category) return []
  if (Array.isArray(category)) {
    return category.filter(Boolean)
  }
  return [category]
}

const parseDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const [datePart, timePart] = value.split('T')
    if (timePart) {
      const [year, month = '1', day = '1'] = datePart.split('-')
      value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`
    }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const formatDate = (publishedAt, fallback, itemId = '') => {
  const value = parseDateValue(publishedAt) || parseDateValue(fallback)
  if (!value) {
    logger.warn('[learning-card] Invalid date for resource', { itemId, publishedAt, fallback })
    return ''
  }
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const handleTap = () => {
  emit('tap', props.resource)
}

const handleView = () => {
  emit('view', props.resource)
}

const handleFavorite = () => {
  emit('favorite', props.resource)
}

const handleAuthorize = (e) => {
  emit('authorize', {
    resource: props.resource,
    detail: e.detail
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.learning-card {
  position: relative;
  overflow: hidden;
  
  &__vip-badge {
    position: absolute;
    top: 24rpx;
    left: 24rpx;
    z-index: 2;
    padding: 8rpx 24rpx;
    border-radius: $radius-full;
    background: $neo-gradient;
    box-shadow: 0 8rpx 20rpx rgba(17, 94, 89, 0.3);
    
    .badge-text {
      font-size: $font-xs;
      font-weight: bold;
      color: #fff;
    }
  }
  
  &__favorite {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    z-index: 2;
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    backdrop-filter: blur(10px);
    
    .favorite-icon {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2rpx solid rgba(59, 130, 246, 0.4);
      font-size: 34rpx;
      color: rgba(15, 23, 42, 0.6);
      transition: all 0.2s ease;
      background: #fff;
    }
    
    .favorite-icon.is-favorited {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(254, 226, 226, 0.8);
      color: #ef4444;
      animation: heartBeat 0.3s ease;
    }
  }
  
  &__image {
    position: relative;
    width: 100%;
    height: 320rpx;
    overflow: hidden;
    border-radius: $radius-lg;
    
    .image,
    .image-placeholder {
      width: 100%;
      height: 100%;
    }
    
    .image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      
      .placeholder-text {
        font-size: 120rpx;
      }
    }
    
    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0) 20%, rgba(15, 23, 42, 0.35) 100%);
      pointer-events: none;
    }
    
    &.is-locked {
      .image,
      .image-placeholder {
        filter: blur(6px);
        transform: scale(1.05);
      }
      
      .image-overlay {
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(6px);
      }
    }
    
    .lock-overlay {
      position: absolute;
      top: 55%;
      left: 50%;
      width: 80%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16rpx;
      padding: 0 20rpx;
      text-align: center;
      color: #fff;
      
      .lock-icon {
        font-size: 86rpx;
      }
      
      .lock-text {
        font-size: $font-sm;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.95);
      }
    }
  }
  
  &__content {
    padding: 24rpx;
  }
  
  &__title {
    display: block;
    font-size: $font-lg;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__description {
    font-size: $font-sm;
    color: $text-secondary;
    line-height: 1.6;
    margin-bottom: 16rpx;
  }
  
  &__case {
    display: flex;
    gap: 16rpx;
    padding: 24rpx;
    border-radius: $radius-md;
    margin-bottom: 16rpx;
    background: linear-gradient(145deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.1));
    border: 1px solid rgba(99, 102, 241, 0.2);
    
    .case-icon {
      width: 72rpx;
      height: 72rpx;
      border-radius: $radius-md;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40rpx;
      color: $primary-blue;
      box-shadow: 0 12rpx 24rpx rgba(59, 130, 246, 0.15);
      flex-shrink: 0;
    }
    
    .case-content {
      flex: 1;
    }
    
    .case-label {
      display: block;
      font-size: $font-xs;
      color: $primary-blue;
      font-weight: bold;
      margin-bottom: 8rpx;
      letter-spacing: 1rpx;
    }
    
    .case-text {
      font-size: $font-sm;
      color: $text-secondary;
      line-height: 1.6;
    }
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
    gap: 16rpx;
    
    .tag-group {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;
      align-items: center;
      flex: 1;
    }
    
    .category-tag {
      padding: 8rpx 16rpx;
      background: rgba(147, 51, 234, 0.1);
      color: $primary-purple;
      font-size: $font-xs;
      border-radius: $radius-full;
    }
    
    .date-text {
      font-size: $font-xs;
      color: $text-tertiary;
      white-space: nowrap;
    }
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
    background: linear-gradient(90deg, #3B82F6, #9333EA, #EC4899);
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

@keyframes heartBeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}
</style>

