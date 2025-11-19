<template>
  <view class="favorites-page">
    <scroll-view class="favorites-list" scroll-y>
      <view class="list-container">
        <!-- 骨架屏 -->
        <skeleton v-if="loading" type="card" :rows="3" />
        
        <!-- 收藏卡片 -->
        <learning-card
          v-for="item in favoriteList"
          :key="item._id"
          :resource="mapFavoriteToResource(item)"
          :is-login="true"
          @view="handleViewItem(item)"
          @favorite="() => handleUnfavorite(item)"
        />
        
        <!-- 空状态 -->
        <empty-state 
          v-if="!loading && favoriteList.length === 0"
          type="favorite"
          @action="handleEmptyAction"
        />
      </view>
      
      <!-- 底部占位 -->
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { favoriteApi, learningApi } from '@/utils/request'
import LearningCard from '@/components/learning-card/learning-card.vue'
import Skeleton from '@/components/skeleton/skeleton.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import { withLoading, showError, showSuccess } from '@/utils/feedback'
import { logger } from '@/utils/logger'

const loading = ref(false)
const favoriteList = ref([])
const reading = ref(false)

const loadFavorites = async () => {
  loading.value = true
  
  try {
    const result = await favoriteApi.getMyFavorites('learning')
    favoriteList.value = result.list || []
  } catch (error) {
    logger.error('[favorites] 加载收藏失败', error)
  } finally {
    loading.value = false
  }
}

const downloadFile = (url) => new Promise((resolve, reject) => {
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        resolve(res.tempFilePath)
      } else {
        reject(new Error('下载失败，请稍后重试'))
      }
    },
    fail: reject
  })
})

const openDocument = (filePath) => new Promise((resolve, reject) => {
  uni.openDocument({
    filePath,
    showMenu: true,
    success: resolve,
    fail: reject
  })
})

const handleViewItem = async (item) => {
  if (reading.value) {
    showError('正在打开，请稍候')
    return
  }

  try {
    reading.value = true
    const result = await learningApi.getResource(item.itemId)
    const tempFilePath = await withLoading(() => downloadFile(result.downloadUrl), {
      title: '准备下载...'
    })
    await openDocument(tempFilePath)
    showSuccess('打开成功')
  } catch (error) {
    logger.error('[favorites] 查看收藏详情失败', error)
    showError(error.message || '打开失败，请重试')
  } finally {
    reading.value = false
  }
}

const handleUnfavorite = async (item) => {
  try {
    await favoriteApi.remove(item.itemId)
    favoriteList.value = favoriteList.value.filter(f => f._id !== item._id)
    uni.$emit('favoriteChanged', {
      itemId: item.itemId,
      itemType: 'learning',
      isFavorited: false
    })
    showSuccess('已取消收藏')
  } catch (error) {
    logger.error('[favorites] 取消收藏失败', error)
    showError(error.message || '取消收藏失败')
  }
}

const handleEmptyAction = () => {
  uni.switchTab({
    url: '/pages/learning/learning'
  })
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const mapFavoriteToResource = (item) => ({
  _id: item.itemId,
  title: item.title,
  description: item.description,
  image: item.image,
  category: '学习资源',
  publishedAt: item.favoritedAt,
  requiredVipLevel: 'regular',
  canAccess: true,
  caseExample: '',
  isFavorited: true
})

onMounted(() => {
  loadFavorites()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.favorites-page {
  min-height: 100vh;
  background: $bg-color;
}

.favorites-list {
  height: 100vh;
}

.list-container {
  padding: $spacing-lg;
}

.favorite-item {
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08);
  padding: 24rpx;
  margin-bottom: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-image {
  width: 100%;
  height: 320rpx;
  border-radius: $radius-md;
  object-fit: cover;
}

.item-title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.item-description {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.6;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-tag {
  padding: 8rpx 16rpx;
  background: rgba(59, 130, 246, 0.1);
  color: $primary-blue;
  font-size: $font-xs;
  border-radius: $radius-full;
}

.date-text {
  font-size: $font-xs;
  color: $text-tertiary;
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.bottom-placeholder {
  height: 32rpx;
}
</style>

