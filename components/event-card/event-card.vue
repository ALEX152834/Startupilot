<template>
  <glass-card class="event-card" :opacity="1" @tap="handleTap">
    <!-- 活动封面 -->
    <view class="event-card__image">
      <image 
        v-if="event.image" 
        :src="event.image" 
        mode="aspectFill"
        class="image"
        lazy-load="true"
      />
      <view v-else class="image-placeholder">
        <text class="placeholder-text">🎯</text>
      </view>
      
      <!-- 类型标签 -->
      <view
        class="event-card__type"
        :class="event.type === 'online' ? 'event-card__type--online' : 'event-card__type--offline'"
      >
        {{ event.type === 'online' ? '线上' : '线下' }}
      </view>
    </view>
    
    <!-- 活动信息 -->
    <view class="event-card__content">
      <text class="event-card__title">{{ event.title }}</text>
      
      <view class="event-card__info">
        <view class="info-item">
          <text class="info-icon">📅</text>
          <text class="info-text">{{ event.date }} {{ event.time }}</text>
        </view>
        
        <view v-if="event.location" class="info-item">
          <text class="info-icon">📍</text>
          <text class="info-text ellipsis">{{ event.location }}</text>
        </view>
      </view>
      
      <text v-if="event.description" class="event-card__description ellipsis-2">
        {{ event.description }}
      </text>
      
      <!-- 预约按钮 -->
      <button
        v-if="!isLogin"
        class="event-card__native-button"
        open-type="getPhoneNumber"
        @getphonenumber.stop="handleAuthorize"
      >
        <view class="event-card__button-text">立即预约</view>
      </button>
      <glass-button
        v-else
        class="event-card__button"
        :type="event.isBooked ? 'secondary' : 'primary'"
        size="small"
        block
        @tap.stop="handleBook"
      >
        {{ event.isBooked ? '已预约 ✓' : '立即预约' }}
      </glass-button>
    </view>
  </glass-card>
</template>

<script setup>
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  isLogin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['tap', 'book', 'authorize'])

const handleTap = () => {
  emit('tap', props.event)
}

const handleBook = () => {
  emit('book', props.event)
}

const handleAuthorize = (e) => {
  emit('authorize', {
    event: props.event,
    detail: e.detail
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.event-card {
  overflow: hidden;
  
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
  }
  
  &__type {
    position: absolute;
    top: 24rpx;
    left: 24rpx;
    padding: 8rpx 24rpx;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: bold;
    color: #fff;
    backdrop-filter: blur(10px);
    
    &--online {
      background: rgba(59, 130, 246, 0.8);
    }
    
    &--offline {
      background: rgba(236, 72, 153, 0.8);
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
  
  &__info {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    margin-bottom: 16rpx;
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 8rpx;
      
      .info-icon {
        font-size: $font-sm;
      }
      
      .info-text {
        font-size: $font-sm;
        color: $text-secondary;
        flex: 1;
      }
    }
  }
  
  &__description {
    font-size: $font-sm;
    color: $text-tertiary;
    line-height: 1.6;
    margin-bottom: 24rpx;
  }
  
  &__button {
    margin-top: 16rpx;
  }

  &__native-button {
    width: 100%;
    height: 88rpx;
    border-radius: $radius-full;
    margin-top: 16rpx;
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

