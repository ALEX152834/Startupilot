<template>
  <view class="registrations-page">
    <scroll-view class="registrations-list" scroll-y>
      <view class="list-container">
        <!-- 骨架屏 -->
        <skeleton v-if="loading" type="card" :rows="3" />
        
        <!-- 预约卡片 -->
        <glass-card
          v-for="booking in bookingList"
          :key="booking._id"
          class="booking-item"
        >
          <view class="booking-header">
            <text class="event-title">{{ booking.eventTitle }}</text>
            <view class="status-badge" :class="'status-badge--' + booking.status">
              {{ getStatusText(booking.status) }}
            </view>
          </view>
          
          <view class="booking-info">
            <view class="info-row">
              <text class="info-icon">📅</text>
              <text class="info-text">{{ booking.date }} {{ booking.time }}</text>
            </view>
            
            <view class="info-row">
              <text class="info-icon">🎫</text>
              <text class="info-text">{{ booking.eventType === 'online' ? '线上活动' : '线下活动' }}</text>
            </view>
            
            <view v-if="booking.location" class="info-row">
              <text class="info-icon">📍</text>
              <text class="info-text">{{ booking.location }}</text>
            </view>
          </view>
          
          <view class="booking-footer" v-if="booking.status === 'confirmed'">
            <view class="action-buttons">
              <view class="cancel-button" @tap="handleCancel(booking)">
                <text class="cancel-icon">✕</text>
                <text class="cancel-text">取消报名</text>
              </view>
            </view>
          </view>
        </glass-card>
        
        <!-- 空状态 -->
        <empty-state 
          v-if="!loading && bookingList.length === 0"
          icon="📋"
          title="暂无报名"
          description="快去预约感兴趣的活动吧"
          buttonText="查看活动"
          @action="handleViewEvents"
        />
      </view>
      
      <!-- 底部占位 -->
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useEventStore } from '@/store/event'
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import Skeleton from '@/components/skeleton/skeleton.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import { logger } from '@/utils/logger'

const eventStore = useEventStore()

const loading = ref(false)
const bookingList = ref([])

const loadBookings = async () => {
  loading.value = true
  
  try {
    await eventStore.fetchMyBookings('confirmed')  // 只获取已确认的预约
    bookingList.value = eventStore.myBookings
  } catch (error) {
    logger.error('[registrations] 加载我的报名失败', error)
  } finally {
    loading.value = false
  }
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const handleCancel = (booking) => {
  uni.showModal({
    title: '取消报名',
    content: `确定要取消「${booking.eventTitle}」的报名吗？取消后可以重新预约。`,
    confirmText: '确定取消',
    cancelText: '再想想',
    confirmColor: '#EF4444',
    success: async (res) => {
      if (res.confirm) {
        let cancelLoadingVisible = false
        const hideCancelLoading = () => {
          if (cancelLoadingVisible) {
            cancelLoadingVisible = false
            uni.hideLoading()
          }
        }
        uni.showLoading({
          title: '取消中...',
          mask: true,
          success: () => {
            cancelLoadingVisible = true
          },
          fail: () => {
            cancelLoadingVisible = false
          }
        })
        
        try {
          await eventStore.cancelBooking(booking.eventId)
          
          hideCancelLoading()
          
          // 从列表中移除
          bookingList.value = bookingList.value.filter(b => b._id !== booking._id)
          
          uni.showToast({
            title: '已取消报名',
            icon: 'success'
          })
        } catch (error) {
          hideCancelLoading()
          logger.error('[registrations] 取消报名失败', error)
          uni.showToast({
            title: '取消失败，请重试',
            icon: 'none'
          })
        }
      }
    }
  })
}

const handleViewEvents = () => {
  uni.switchTab({
    url: '/pages/index/index'
  })
}

onMounted(() => {
  loadBookings()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.registrations-page {
  min-height: 100vh;
  background: $bg-color;
}

.registrations-list {
  height: 100vh;
}

.list-container {
  padding: $spacing-lg;
}

.booking-item {
  margin-bottom: $spacing-md;
  
  .booking-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
    
    .event-title {
      flex: 1;
      font-size: $font-lg;
      font-weight: bold;
      color: $text-primary;
    }
    
    .status-badge {
      padding: 8rpx 16rpx;
      border-radius: $radius-full;
      font-size: $font-xs;
      font-weight: bold;
      
      &--pending {
        background: rgba(251, 191, 36, 0.1);
        color: #f59e0b;
      }
      
      &--confirmed {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      
      &--cancelled {
        background: rgba(0, 0, 0, 0.05);
        color: $text-tertiary;
      }
    }
  }
  
  .booking-info {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-bottom: 24rpx;
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      
      .info-icon {
        font-size: 28rpx;
      }
      
      .info-text {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }
  }
  
  .booking-footer {
    padding-top: 24rpx;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    
    .action-buttons {
      display: flex;
      justify-content: center;
      
      .cancel-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8rpx;
        padding: 16rpx 48rpx;
        background: rgba(239, 68, 68, 0.08);
        border: 2px solid rgba(239, 68, 68, 0.2);
        border-radius: 12rpx;
        transition: all 0.3s ease;
        
        .cancel-icon {
          font-size: 28rpx;
          color: #EF4444;
          font-weight: bold;
        }
        
        .cancel-text {
          font-size: 28rpx;
          color: #EF4444;
          font-weight: 500;
        }
        
        &:active {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          transform: scale(0.98);
        }
      }
    }
  }
}

.bottom-placeholder {
  height: 32rpx;
}
</style>

