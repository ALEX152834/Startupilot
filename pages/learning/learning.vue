<template>
  <view class="learning-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="navbarStyle">
      <view class="navbar-top" :style="navbarRowStyle">
        <view class="navbar-search" :style="searchContainerStyle">
          <view class="search-box" :style="searchBoxStyle">
            <text class="search-icon">🔍</text>
            <input 
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索学习资源..."
              confirm-type="search"
              @input="handleSearchInput"
              @confirm="handleSearchConfirm"
            />
            <text 
              v-if="searchKeyword" 
              class="clear-icon"
              @tap="clearSearch"
            >✕</text>
          </view>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="tabs-container">
        <view class="tabs">
          <view 
            v-for="tab in tabs" 
            :key="tab.value"
            class="tab-item"
            :class="{ 'tab-item--active': currentTab === tab.value }"
            @tap="handleTabChange(tab.value)"
          >
            <text class="tab-text">{{ tab.label }}</text>
            <view v-if="currentTab === tab.value" class="tab-indicator"></view>
          </view>
        </view>
      </view>
    </view>
    
    <view class="page-content">
      <!-- 资源列表 -->
      <scroll-view 
        class="resource-list" 
        scroll-y
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="loadMore"
      >
        <view class="scroll-content">
          <view class="hero-section">
            <text class="hero-title">{{ heroTitle }}</text>
            <text class="hero-subtitle">{{ heroSubtitle }}</text>
          </view>
        
          <view class="list-container">
            <!-- 骨架屏 -->
            <skeleton v-if="loading && resourceList.length === 0" type="card" :rows="3" />
            
            <!-- 资源卡片 -->
            <learning-card
              v-for="resource in resourceList"
              :key="resource._id"
              :resource="resource"
              :is-login="userStore.isLogin"
              class="resource-item"
              @view="handleViewResource"
              @favorite="handleFavorite"
              @authorize="handleResourceAuthorize"
            />
            
            <!-- 加载更多 -->
            <view v-if="loading && resourceList.length > 0" class="loading-more">
              <loading :show="true" size="small" />
            </view>
            
            <!-- 没有更多 -->
            <view v-if="!hasMore && resourceList.length > 0" class="no-more">
              <text>没有更多了</text>
            </view>
            
            <!-- 空状态 -->
            <empty-state 
              v-if="!loading && resourceList.length === 0"
              icon="📚"
              title="暂无学习资源"
              description="敬请期待更多精彩内容"
            />
          </view>
          
          <!-- 底部占位 -->
          <view class="bottom-placeholder safe-area-bottom"></view>
        </view>
      </scroll-view>
    </view>
    <!-- VIP兑换弹窗 -->
    <redeem-modal :show="showRedeemModal" @close="showRedeemModal = false" @success="onRedeemSuccess" />
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { learningApi, favoriteApi } from '@/utils/request'
import { checkVipPermission, trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import LearningCard from '@/components/learning-card/learning-card.vue'
import Skeleton from '@/components/skeleton/skeleton.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import Loading from '@/components/loading/loading.vue'
import RedeemModal from '@/components/modals/redeem-modal.vue'
import { logger } from '@/utils/logger'

const userStore = useUserStore()
const shareTitle = 'Founder Think - Startupilot'
const sharePath = '/pages/learning/learning'

defineExpose({
  shareTitle,
  sharePath
})

const tabs = [
  { label: '案例分析', value: 'ceo' },
  { label: '管理工具', value: 'best' }
]

const currentTab = ref('ceo')
const searchKeyword = ref('')
const loading = ref(false)
const refreshing = ref(false)
const resourceList = ref([])
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

const showRedeemModal = ref(false)
const pendingResource = ref(null)
const reading = ref(false)
const menuButtonInfo = ref({ height: 64, top: 32, left: 0 })
const windowInfo = ref({ windowWidth: 375 })
const EXTRA_GAP = 12
const SEARCH_DEBOUNCE_DELAY = 300
let searchDebounceTimer = null
let pageAlive = true
let loadResourcesTaskId = 0

const rightSafeWidth = computed(() => {
  const width = windowInfo.value?.windowWidth || 0
  const left = menuButtonInfo.value?.left || width
  const value = Math.max(0, width - left + EXTRA_GAP)
  return value
})
const searchRowHeight = computed(() => menuButtonInfo.value?.height || 64)
const navbarStyle = computed(() => ({
  paddingTop: `${menuButtonInfo.value?.top || 0}px`
}))
const navbarRowStyle = computed(() => ({
  height: `${searchRowHeight.value}px`
}))
const searchContainerStyle = computed(() => ({
  height: `${searchRowHeight.value}px`,
  marginRight: `${rightSafeWidth.value}px`
}))
const searchBoxStyle = computed(() => ({
  height: `${searchRowHeight.value}px`
}))

const heroTitle = computed(() => (
  currentTab.value === 'ceo' ? "Founders' Mindset" : "Founders' Thinking"
))

const heroSubtitle = computed(() => (
  currentTab.value === 'ceo' ? 'Develop ourselves' : 'Direct ourselves'
))

const initNavbarMetrics = () => {
  try {
    let info = null
    if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
      info = wx.getMenuButtonBoundingClientRect()
    } else if (typeof uni !== 'undefined' && typeof uni.getMenuButtonBoundingClientRect === 'function') {
      info = uni.getMenuButtonBoundingClientRect()
    }

    if (info && info.height && info.top !== undefined) {
      menuButtonInfo.value = info
    }
  } catch (error) {
    logger.error('[pages/learning] 获取胶囊信息失败', error)
  }

  const getWindowInfo = () => {
    if (typeof wx !== 'undefined' && typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo()
    }
    if (typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo()
    }
    return null
  }

  try {
    const info = getWindowInfo()
    if (info && info.windowWidth) {
      windowInfo.value = info
    }
  } catch (error) {
    logger.error('[pages/learning] 获取 window 信息失败', error)
  }
}

// Tab切换
const handleTabChange = (tab) => {
  currentTab.value = tab
  
  // 数据埋点
  trackEvent(TRACK_EVENTS.TAB_SWITCH, {
    tab: tab
  })
}

// 监听Tab变化,重新加载
watch(currentTab, () => {
  loadResources(true)
})

// 加载资源列表
const loadResources = async (refresh = false) => {
  if (!pageAlive) return
  if (refresh) {
    page.value = 1
    hasMore.value = true
    if (pageAlive) {
      resourceList.value = []
    }
  }
  
  if (!hasMore.value || loading.value) return
  
  const taskId = ++loadResourcesTaskId
  loading.value = true
  
  try {
    const result = await learningApi.getList({
      type: currentTab.value,
      keyword: searchKeyword.value,
      page: page.value,
      pageSize
    })
    
    const { list, total } = result
    
    if (!pageAlive || taskId !== loadResourcesTaskId) {
      return
    }

    if (refresh) {
      resourceList.value = list
    } else {
      resourceList.value.push(...list)
    }
    
    hasMore.value = resourceList.value.length < total
    page.value++
  } catch (error) {
    logger.error('[pages/learning] 加载资源失败', error)
  } finally {
    if (pageAlive && taskId === loadResourcesTaskId) {
      loading.value = false
    }
  }
}

// 下拉刷新
const onRefresh = async () => {
  if (!pageAlive) return
  refreshing.value = true
  try {
    await loadResources(true)
  } finally {
    if (pageAlive) {
      refreshing.value = false
    }
  }
}

// 加载更多
const loadMore = () => {
  if (!pageAlive) return
  if (!loading.value && hasMore.value) {
    loadResources()
  }
}

const doSearch = (keyword, { track = false } = {}) => {
  searchKeyword.value = keyword

  if (track) {
    trackEvent(TRACK_EVENTS.SEARCH, {
      keyword,
      type: 'learning'
    })
  }

  loadResources(true)
}

const scheduleSearch = (keyword) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    doSearch(keyword)
    searchDebounceTimer = null
  }, SEARCH_DEBOUNCE_DELAY)
}

// 搜索输入
const handleSearchInput = (event) => {
  const keyword = event?.detail?.value ?? ''
  searchKeyword.value = keyword
  scheduleSearch(keyword)
}

// 搜索确认
const handleSearchConfirm = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  doSearch(searchKeyword.value, { track: true })
}

// 清除搜索
const clearSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  doSearch('', { track: false })
}

// 查看资源
const handleViewResource = async (resource) => {
  if (reading.value) {
    uni.showToast({ title: '正在打开，请稍候', icon: 'none' })
    return
  }
  trackEvent(TRACK_EVENTS.RESOURCE_VIEW, {
    resourceId: resource._id,
    resourceTitle: resource.title
  })

  if (!userStore.isLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    pendingResource.value = resource
    return
  }

  if (!checkVipPermission(resource.requiredVipLevel)) {
    showRedeemModal.value = true
    pendingResource.value = resource
    return
  }

  try {
    reading.value = true
    const result = await learningApi.getResource(resource._id)
    trackEvent(TRACK_EVENTS.RESOURCE_DOWNLOAD, { resourceId: resource._id })
    let downloadLoadingVisible = false
    const hideDownloadLoading = () => {
      if (downloadLoadingVisible) {
        downloadLoadingVisible = false
        uni.hideLoading()
      }
    }
    uni.showLoading({
      title: '准备下载...',
      success: () => {
        downloadLoadingVisible = true
      },
      fail: () => {
        downloadLoadingVisible = false
      }
    })
    uni.downloadFile({
      url: result.downloadUrl,
      success: (res) => {
        reading.value = false
        hideDownloadLoading()
        if (res.statusCode === 200) {
          uni.openDocument({
            filePath: res.tempFilePath,
            success: () => uni.showToast({ title: '打开成功', icon: 'success' })
          })
        }
      },
      fail: () => {
        reading.value = false
        hideDownloadLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  } catch (error) {
    logger.error('[pages/learning] 获取资源失败', error)
    reading.value = false
  }
}

// 收藏/取消收藏
const handleFavorite = async (resource) => {
  // 检查登录状态
  if (!userStore.isLogin) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  try {
    if (resource.isFavorited) {
      await favoriteApi.remove(resource._id)
      resource.isFavorited = false
      uni.$emit('favoriteChanged', {
        itemId: resource._id,
        itemType: 'learning',
        isFavorited: false
      })
      
      uni.showToast({
        title: '取消收藏',
        icon: 'none'
      })
      
      // 数据埋点
      trackEvent(TRACK_EVENTS.FAVORITE_REMOVE, {
        itemId: resource._id,
        itemType: 'learning'
      })
    } else {
      await favoriteApi.add({
        itemId: resource._id,
        itemType: 'learning',
        title: resource.title,
        description: resource.description,
        image: resource.image,
        category: resource.category
      })
      resource.isFavorited = true
      uni.$emit('favoriteChanged', {
        itemId: resource._id,
        itemType: 'learning',
        isFavorited: true
      })
      
      uni.showToast({
        title: '收藏成功',
        icon: 'success'
      })
      
      // 数据埋点
      trackEvent(TRACK_EVENTS.FAVORITE_ADD, {
        itemId: resource._id,
        itemType: 'learning'
      })
    }
  } catch (error) {
    logger.error('[pages/learning] 收藏操作失败', error)
  }
}

// VIP兑换成功后继续操作
const onRedeemSuccess = () => {
  if (pendingResource.value) {
    handleViewResource(pendingResource.value)
    pendingResource.value = null
  }
}

const favoriteSyncHandler = ({ itemId, itemType, isFavorited }) => {
  if (itemType !== 'learning' || !pageAlive) return
  const target = resourceList.value.find(item => item._id === itemId)
  if (target) {
    target.isFavorited = isFavorited
  }
}

const handleResourceAuthorize = async ({ resource, detail }) => {
  const cloudID = detail?.cloudID || detail?.cloudId
  
  if (!cloudID) {
    uni.showToast({
      title: '授权失败，请重试',
      icon: 'none'
    })
    return
  }

  try {
    // 先登录（不获取用户信息）
    await userStore.login()
    
    // 绑定手机号
    await userStore.bindPhone(cloudID)

    if (!pageAlive) {
      return
    }

    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })

    // 查看资源
    handleViewResource(resource)
  } catch (error) {
    logger.error('[pages/learning] 登录失败', error)
    uni.showToast({
      title: '登录失败，请重试',
      icon: 'none'
    })
  }
}

onLoad(() => {
  pageAlive = true
  initNavbarMetrics()
})

onMounted(() => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.PAGE_VIEW, { page: 'learning' })
  
  // 加载数据
  loadResources(true)

  uni.$on('favoriteChanged', favoriteSyncHandler)
})

onUnmounted(() => {
  pageAlive = false
  uni.$off('favoriteChanged', favoriteSyncHandler)

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

onUnload(() => {
  pageAlive = false
  uni.$off('favoriteChanged', favoriteSyncHandler)
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.learning-page {
  min-height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding: 0 $spacing-lg $spacing-md;
  background: #fff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.08);
}

.navbar-top {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: $spacing-md;
}

.page-content {
  position: absolute;
  top: 280rpx;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
}

// Tab标签
.tabs-container {
  padding: 0 $spacing-lg;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tabs {
  display: flex;
  gap: 48rpx;
  
  .tab-item {
    position: relative;
    padding: 24rpx 0;
    
    .tab-text {
      font-size: $font-base;
      color: $text-tertiary;
      transition: all 0.3s ease;
    }
    
    .tab-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 6rpx;
      background: $gradient-primary;
      border-radius: 3rpx;
      animation: slideIn 0.3s ease;
    }
    
    &--active {
      .tab-text {
        color: $primary-blue;
        font-weight: bold;
      }
    }
  }
}

// 搜索框
.navbar-search {
  flex: 1;
  display: flex;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  background: rgba(0, 0, 0, 0.03);
  border-radius: $radius-full;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  
  .search-icon {
    font-size: 32rpx;
  }
  
  .search-input {
    flex: 1;
    font-size: $font-base;
    color: $text-primary;
  }
  
  .clear-icon {
    font-size: 28rpx;
    color: $text-tertiary;
  }
}

// 资源列表
.resource-list {
  flex: 1;
  height: 0;
}

.scroll-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.hero-section {
  padding: 48rpx $spacing-lg 24rpx;
  background: transparent;

  .hero-title {
    font-size: 60rpx;
    font-weight: bold;
    color: $text-primary;
  }

  .hero-subtitle {
    display: block;
    margin-top: $spacing-xs;
    font-size: 28rpx;
    color: $text-tertiary;
    font-style: italic;
  }
}

.list-container {
  padding: $spacing-md $spacing-lg;
  
  .resource-item {
    margin-bottom: $spacing-md;
  }
  
  .loading-more,
  .no-more {
    padding: 32rpx;
    text-align: center;
    color: $text-tertiary;
    font-size: $font-sm;
  }
}

.bottom-placeholder {
  height: 32rpx;
}

@keyframes slideIn {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
</style>
