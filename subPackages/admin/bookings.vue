<template>
  <view class="bookings-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar safe-area-top">
      <view class="navbar-back" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="navbar-title">预约数据管理</text>
    </view>
    
    <view class="header">
      <button class="export-btn" @tap="exportData">导出数据</button>
    </view>
    
    <!-- 统计信息 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-value">{{ totalCount }}</text>
        <text class="stat-label">总预约数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ todayCount }}</text>
        <text class="stat-label">今日新增</text>
      </view>
    </view>
    
    <!-- 筛选 -->
    <view class="filters">
      <picker mode="selector" :range="eventOptions" @change="onEventChange">
        <view class="picker">
          活动：{{ selectedEvent || '全部' }}
        </view>
      </picker>
      
      <picker mode="date" @change="onDateChange">
        <view class="picker">
          日期：{{ selectedDate || '全部' }}
        </view>
      </picker>
    </view>
    
    <!-- 预约列表 -->
    <scroll-view class="list" scroll-y>
      <view v-for="booking in filteredBookings" :key="booking._id" class="booking-item">
        <view class="booking-header">
          <view class="title-section">
            <text class="event-number" v-if="booking.eventNumber">{{ booking.eventNumber }}</text>
            <text class="event-title">{{ booking.eventTitle }}</text>
          </view>
          <text class="status" :class="'status-' + booking.status">
            {{ statusText[booking.status] }}
          </text>
        </view>
        
        <view class="booking-info">
          <text class="info-item">称呼：{{ booking.userName || booking.uid }}</text>
          <text class="info-item">电话：{{ booking.userPhone || '-' }}</text>
          <text class="info-item" v-if="booking.userWechat">微信：{{ booking.userWechat }}</text>
          <text class="info-item" v-if="booking.userRole">身份：{{ getRoleText(booking.userRole) }}</text>
          <text class="info-item">时间：{{ formatDate(booking.registeredAt) }}</text>
        </view>
      </view>
      
      <view v-if="filteredBookings.length === 0" class="empty">
        暂无预约数据
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { logger } from '@/utils/logger'

const disableShare = true
defineExpose({
  disableShare
})

const bookings = ref([])
const totalCount = ref(0)
const todayCount = ref(0)
const selectedEvent = ref('')
const selectedDate = ref('')

// 返回
const goBack = () => {
  uni.navigateBack()
}

const statusText = {
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成'
}

const eventOptions = computed(() => {
  const events = ['全部', ...new Set(bookings.value.map(b => b.eventTitle))]
  return events
})

const filteredBookings = computed(() => {
  let result = bookings.value
  
  if (selectedEvent.value && selectedEvent.value !== '全部') {
    result = result.filter(b => b.eventTitle === selectedEvent.value)
  }
  
  if (selectedDate.value) {
    result = result.filter(b => {
      const date = new Date(b.registeredAt)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const bookingDate = `${year}-${month}-${day}`
      return bookingDate === selectedDate.value
    })
  }
  
  return result
})

// 加载预约数据
const loadBookings = async () => {
  let bookingsLoadingVisible = false
  const hideBookingsLoading = () => {
    if (bookingsLoadingVisible) {
      bookingsLoadingVisible = false
      uni.hideLoading()
    }
  }

  try {
    uni.showLoading({
      title: '加载中...',
      success: () => {
        bookingsLoadingVisible = true
      },
      fail: () => {
        bookingsLoadingVisible = false
      }
    })
    
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getAllBookings'
      }
    })
    
    if (res.result.code === 0) {
      bookings.value = res.result.data.list
      totalCount.value = res.result.data.total
      todayCount.value = res.result.data.todayCount
    }
  } catch (error) {
    logger.error('加载失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    hideBookingsLoading()
  }
}

// 导出数据为 CSV 文件
const exportData = async () => {
  if (bookings.value.length === 0) {
    uni.showToast({
      title: '暂无数据可导出',
      icon: 'none'
    })
    return
  }
  
  uni.showLoading({ title: '正在导出...' })
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'exportBookings',
        params: {}
      }
    })
    
    uni.hideLoading()
    
    if (res.result.code === 0) {
      const csv = res.result.data.csv
      const fileName = res.result.data.filename
      
      const fs = wx.getFileSystemManager()
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
      
      try {
        fs.writeFileSync(filePath, csv, 'utf8')
        
        wx.shareFileMessage({
          filePath: filePath,
          fileName: fileName,
          success: () => {
            uni.showToast({ title: '导出成功', icon: 'success' })
          },
          fail: () => {
            uni.setClipboardData({
              data: csv,
              success: () => {
                uni.showToast({ title: 'CSV数据已复制到剪贴板', icon: 'success' })
              }
            })
          }
        })
      } catch (error) {
        logger.error('文件写入失败:', error)
        uni.setClipboardData({
          data: csv,
          success: () => {
            uni.showToast({ title: 'CSV数据已复制到剪贴板', icon: 'success' })
          }
        })
      }
    } else {
      uni.showToast({ title: res.result.message || '导出失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    logger.error('导出失败:', error)
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

// 格式化日期
const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取身份文本
const getRoleText = (role) => {
  const roleMap = {
    entrepreneur: '创业者',
    investor: '投资人',
    advisor: '顾问',
    other: '其他'
  }
  return roleMap[role] || role
}

const onEventChange = (e) => {
  selectedEvent.value = eventOptions.value[e.detail.value]
}

const onDateChange = (e) => {
  selectedDate.value = e.detail.value
}

onMounted(() => {
  loadBookings()
})
</script>

<style lang="scss" scoped>
.bookings-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.custom-navbar {
  position: relative;
  padding: 32rpx 32rpx 24rpx;
  padding-top: calc(32rpx + env(safe-area-inset-top));
  padding-top: calc(32rpx + constant(safe-area-inset-top));
  background: #fff;
  display: flex;
  align-items: center;
  
  .navbar-back {
    position: absolute;
    left: 32rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .back-icon {
      font-size: 48rpx;
      color: #333;
      font-weight: 300;
    }
  }
  
  .navbar-title {
    flex: 1;
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
  }
}

.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  margin: 20rpx;
  margin-top: 0;
  
  .export-btn {
    padding: 12rpx 24rpx;
    background: linear-gradient(90deg, #3B82F6, #9333EA);
    color: #fff;
    border-radius: 8rpx;
    font-size: 26rpx;
    border: none;
  }
}

.stats {
  display: flex;
  gap: 20rpx;
  margin: 0 20rpx 20rpx;
  
  .stat-item {
    flex: 1;
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    text-align: center;
    
    .stat-value {
      display: block;
      font-size: 48rpx;
      font-weight: bold;
      color: #3B82F6;
      margin-bottom: 8rpx;
    }
    
    .stat-label {
      font-size: 24rpx;
      color: #666;
    }
  }
}

.filters {
  display: flex;
  gap: 20rpx;
  margin: 0 20rpx 20rpx;
  
  .picker {
    flex: 1;
    background: #fff;
    padding: 20rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
  }
}

.list {
  height: calc(100vh - 500rpx);
  padding: 0 20rpx;
  
  .booking-item {
    background: #fff;
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 16rpx;
    max-width: 680rpx;
    margin-left: auto;
    margin-right: auto;
    
    .booking-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16rpx;
      gap: 16rpx;
      
      .title-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4rpx;
        
        .event-number {
          font-size: 22rpx;
          color: #999;
          font-family: monospace;
        }
        
        .event-title {
          font-size: 30rpx;
          font-weight: bold;
        }
      }
      
      .status {
        padding: 8rpx 16rpx;
        border-radius: 8rpx;
        font-size: 24rpx;
        flex-shrink: 0;
        
        &.status-confirmed {
          background: #D1FAE5;
          color: #059669;
        }
        
        &.status-cancelled {
          background: #FEE2E2;
          color: #DC2626;
        }
        
        &.status-completed {
          background: #E0E7FF;
          color: #4F46E5;
        }
      }
    }
    
    .booking-info {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .info-item {
        font-size: 26rpx;
        color: #666;
      }
    }
  }
  
  .empty {
    text-align: center;
    padding: 100rpx 0;
    color: #999;
    font-size: 28rpx;
  }
}
</style>
