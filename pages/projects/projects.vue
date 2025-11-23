<template>
  <view class="projects-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="navbarStyle">
      <view class="navbar-top" :style="navbarRowStyle">
        <view class="navbar-search" :style="searchContainerStyle">
          <view class="search-box" :style="searchBoxStyle">
            <text class="search-icon">🔍</text>
            <input 
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索项目..."
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
    </view>
    
    <view class="page-content" :style="pageContentStyle">
      <view class="fs-header">
        <view class="fs-header-row">
          <view class="fs-title-block">
            <text class="fs-title">Founder Square</text>
            <text class="fs-subtitle">Turn Potential into Success.</text>
          </view>
          <view class="fs-cta">
            <button
              v-if="!userStore.isLogin"
              class="fs-publish-native"
              open-type="getPhoneNumber"
              hover-class="none"
              @tap="onClickPublish"
              @getphonenumber="onClickPublish"
            >
              ✨ 发布项目
            </button>
            <button
              v-else
              class="fs-publish-native fs-publish-native--logged"
              hover-class="none"
              @tap="onClickPublish"
            >
              ✨ 发布项目
            </button>
          </view>
       </view>
     </view>

      <!-- 分类标签 -->
      <view class="categories-container">
        <scroll-view class="categories-scroll" scroll-x :show-scrollbar="false">
          <view class="categories">
            <view 
              v-for="category in categories" 
              :key="category.value"
              class="category-item"
              :class="{ 'category-item--active': currentCategory === category.value }"
              @tap="handleCategoryChange(category.value)"
            >
              <text class="category-text">{{ category.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      
      <!-- 项目列表 -->
      <scroll-view 
        class="project-list" 
        scroll-y
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="loadMore"
      >
        <view class="list-container">
          <!-- 骨架屏 -->
          <skeleton v-if="loading && projectList.length === 0" type="card" :rows="3" />
          
          <!-- 项目卡片 -->
          <view
            v-for="project in projectList"
            :key="project._id"
            class="project-item"
          >
            <project-card
              :project="project"
              :is-login="userStore.isLogin"
              :action-type="isAdmin ? 'delete' : 'connect'"
              @connect="handleConnect"
              @authorize="handleConnectAuthorize"
              @delete="handleAdminDelete"
            />
          </view>
          
          <!-- 加载更多 -->
          <view v-if="loading && projectList.length > 0" class="loading-more">
            <loading :show="true" size="small" />
          </view>
          
          <!-- 没有更多 -->
          <view v-if="!hasMore && projectList.length > 0" class="no-more">
            <text>没有更多了</text>
          </view>
          
          <!-- 空状态 -->
          <empty-state
            v-if="!loading && projectList.length === 0"
            type="project"
            :use-phone-auth="!userStore.isLogin"
            @action="onClickPublish"
            @authorize="handleEmptyAuthorize"
          />
        </view>
        
        <!-- 底部占位 -->
        <view class="bottom-placeholder safe-area-bottom"></view>
      </scroll-view>
    </view>
    
    <!-- 报名表单弹窗 -->
    <form-modal 
      :show="showFormModal" 
      @close="showFormModal = false"
      @success="onFormSuccess"
    />
    
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useProjectStore, sanitizeProjectForPublic } from '@/store/project'
import { useUserStore } from '@/store/user'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import ProjectCard from '@/components/project-card/project-card.vue'
import Skeleton from '@/components/skeleton/skeleton.vue'
import Loading from '@/components/loading/loading.vue'
import FormModal from '@/components/modals/form-modal.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import { openEnterpriseCustomerService } from '@/utils/customer-service-config'
import { showError, showSuccess } from '@/utils/feedback'
import { logger } from '@/utils/logger'
import { useShare } from '@/composables/useShare'
import { useSafeAsync } from '@/composables/useSafeAsync'
import { buildCloudFilePath } from '@/utils/cloud-storage'

const projectStore = useProjectStore()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const shareTitle = '创业者-赋能社群'
const sharePath = '/pages/projects/projects'
const shareImage = buildCloudFilePath('profile/分享的静态图片/链接-分享.png')
const { isAlive, safeRun } = useSafeAsync()

useShare({
  title: shareTitle,
  path: sharePath,
  image: shareImage
})

defineExpose({
  shareTitle,
  sharePath,
  shareImage
})

const categories = [
  { label: '全部', value: 'all' },
  { label: '项目合作', value: '项目合作' },
  { label: '融资需求', value: '融资需求' },
  { label: '其他', value: '其他' }
]

const currentCategory = ref('all')
const searchKeyword = ref('')
const loading = ref(false)
const refreshing = ref(false)
const projectList = ref([])
const hasMore = ref(true)
const SEARCH_DEBOUNCE_DELAY = 300
const EXTRA_GAP = 12
const menuButtonInfo = ref({ height: 64, top: 32, left: 0 })
const windowInfo = ref({ windowWidth: 375 })
let searchDebounceTimer = null
let loadProjectsTaskId = 0

const showFormModal = ref(false)
const adminDeleteLock = ref(false)

// 分类切换
const handleCategoryChange = (category) => {
  currentCategory.value = category
  projectStore.setCategory(category)
  
  // 数据埋点
  trackEvent(TRACK_EVENTS.TAB_SWITCH, {
    tab: category,
    type: 'project-category'
  })
  
  loadProjects(true)
}

const doProjectSearch = (keyword, { track = false } = {}) => {
  searchKeyword.value = keyword
  projectStore.setSearchKeyword(keyword)

  if (track) {
    trackEvent(TRACK_EVENTS.SEARCH, {
      keyword,
      type: 'project'
    })
  }

  loadProjects(true)
}

const scheduleProjectSearch = (keyword) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    doProjectSearch(keyword)
    searchDebounceTimer = null
  }, SEARCH_DEBOUNCE_DELAY)
}

const handleSearchInput = (event) => {
  const keyword = event?.detail?.value ?? ''
  searchKeyword.value = keyword
  scheduleProjectSearch(keyword)
}

const handleSearchConfirm = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  doProjectSearch(searchKeyword.value, { track: true })
}

// 清除搜索
const clearSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  doProjectSearch('', { track: false })
}

const rightSafeWidth = computed(() => {
  const width = windowInfo.value?.windowWidth || 0
  const left = menuButtonInfo.value?.left || width
  return Math.max(0, width - left + EXTRA_GAP)
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
const pageTopOffset = computed(() => {
  const top = menuButtonInfo.value?.top || 0
  const height = searchRowHeight.value
  const extra = 24
  return top + height + extra
})
const pageContentStyle = computed(() => ({
  top: `${pageTopOffset.value}px`
}))

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
    logger.error('[pages/projects] 获取胶囊信息失败', error)
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
    logger.error('[pages/projects] 获取 window 信息失败', error)
  }
}

// 加载项目列表
const loadProjects = async (refresh = false) => {
  if (!isAlive.value) return
  logger.log('[pages/projects] loadProjects start', { refresh })
  
  if (refresh) {
    hasMore.value = true
    projectList.value = []
  }
  
  if (!hasMore.value || loading.value) {
    logger.log('[pages/projects] loadProjects 跳过', { hasMore: hasMore.value, loading: loading.value })
    return
  }
  
  const taskId = ++loadProjectsTaskId
  loading.value = true
  
  try {
    await projectStore.fetchProjectList(refresh)
    logger.log('[pages/projects] loadProjects 获取到的项目列表', { count: projectStore.projectList?.length })
    
    // 根据_id去重
    const uniqueProjects = []
    const seenIds = new Set()
    
    for (const project of projectStore.projectList) {
      if (project && project._id && !seenIds.has(project._id)) {
        seenIds.add(project._id)
        uniqueProjects.push(project)
      }
    }
    
    const filteredProjects = currentCategory.value === 'all'
      ? uniqueProjects
      : uniqueProjects.filter(project => project.category === currentCategory.value)
    
    if (isAlive.value && taskId === loadProjectsTaskId) {
      projectList.value = filteredProjects.map(project => sanitizeProjectForPublic(project))
      hasMore.value = projectStore.hasMore
    }
    logger.log('[pages/projects] loadProjects 完成', { length: projectList.value.length })
  } catch (error) {
    logger.error('[pages/projects] 加载项目失败', error)
  } finally {
    if (isAlive.value && taskId === loadProjectsTaskId) {
      loading.value = false
    }
  }
}

// 下拉刷新
const onRefresh = async () => {
  if (!isAlive.value) return
  refreshing.value = true
  try {
    await loadProjects(true)
  } finally {
    safeRun(() => {
      refreshing.value = false
    })
  }
}

// 加载更多
const loadMore = () => {
  if (!isAlive.value) return
  if (!loading.value && hasMore.value) {
    loadProjects()
  }
}

// 发布项目
const handlePublish = () => {
  if (userStore.userInfo?.canPublishProject === false) {
    showError('暂无发布权限，请联系管理员')
    return
  }
  
  // 跳转到发布页面
  uni.navigateTo({
    url: '/subPackages/projects/publish/publish'
  })
}

const onClickPublish = (event) => {
  if (!userStore.isLogin) {
    if (event?.type === 'getphonenumber') {
      handlePublishAuthorize(event)
    }
    return
  }
  handlePublish()
}

const handleEmptyAuthorize = (detail) => {
  onClickPublish({
    type: 'getphonenumber',
    detail
  })
}

const handleConnect = (project) => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.PROJECT_CONNECT, {
    projectId: project._id
  })
  
  // 检查是否已填写报名信息
  if (!userStore.hasFilledRegistrationInfo) {
    showFormModal.value = true
    return
  }
  
  openEnterpriseCustomerService()
}

// 表单提交成功后显示二维码
const onFormSuccess = () => {
  openEnterpriseCustomerService()
}

const handlePublishAuthorize = async (event) => {
  const detail = event?.detail || {}
  const cloudID = detail.cloudID || detail.cloudId
  
  if (!cloudID) {
    showError('授权失败，请重试')
    return
  }

  try {
    // 先登录（不获取用户信息）
    await userStore.login()
    
    // 绑定手机号
    await userStore.bindPhone(cloudID)

    if (!isAlive.value) {
      return
    }

    showSuccess('登录成功')

    // 跳转到发布页面
    handlePublish()
  } catch (error) {
    logger.error('[pages/projects] 登录失败', error)
    showError('登录失败，请重试')
  }
}

const handleConnectAuthorize = async ({ project, detail }) => {
  const cloudID = detail?.cloudID || detail?.cloudId
  
  if (!cloudID) {
    showError('授权失败，请重试')
    return
  }

  try {
    // 先登录（不获取用户信息）
    await userStore.login()
    
    // 绑定手机号
    await userStore.bindPhone(cloudID)

    if (!isAlive.value) {
      return
    }

    showSuccess('登录成功')

    // 链接项目
    handleConnect(project)
  } catch (error) {
    logger.error('[pages/projects] 登录失败', error)
    showError('登录失败，请重试')
  }
}

const handleAdminDelete = (project) => {
  if (!isAdmin.value) return
  if (adminDeleteLock.value) return
  adminDeleteLock.value = true
  
  const releaseLock = () => {
    adminDeleteLock.value = false
  }
  
  uni.showModal({
    title: '删除项目',
    content: '确定要删除该项目吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await projectStore.deleteProject(project._id)
          if (!isAlive.value) {
            releaseLock()
            return
          }
          projectList.value = projectList.value.filter(p => p._id !== project._id)
          showSuccess('删除成功')
        } catch (error) {
          logger.error('[pages/projects] 管理员删除项目失败', error)
          showError(error.message || '删除失败，请重试')
        } finally {
          releaseLock()
        }
      } else {
        releaseLock()
      }
    },
    fail: () => {
      releaseLock()
    }
  })
}

onLoad(() => {
  initNavbarMetrics()
})

onMounted(() => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.PAGE_VIEW, { page: 'projects' })
  
  // 加载数据
  loadProjects(true)
})

onShow(() => {
  // 页面显示时刷新数据（从发布页面返回时）
  if (isAlive.value) {
    loadProjects(true)
  }
})

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

onUnload(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.projects-page {
  min-height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  touch-action: pan-y;
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
}

.navbar-search {
  flex: 1;
  display: flex;
  align-items: center;
}

.page-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
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
}

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

.fs-header {
  padding: 24rpx $spacing-lg 12rpx;
}

.fs-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-lg;
  flex-wrap: nowrap;
}

.fs-title-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  min-width: 0;
}

.fs-title {
  font-size: 56rpx;
  font-weight: bold;
  color: $text-primary;
  white-space: nowrap;
}

.fs-subtitle {
  font-size: 30rpx;
  color: $text-tertiary;
}

.fs-cta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.fs-publish-native {
  min-width: 220rpx;
  height: 88rpx;
  border-radius: 999rpx;
  padding: 0 32rpx;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.fs-publish-native {
  border: none;
  font-size: $font-base;
  font-weight: 600;
  color: $text-white;
  @include gradient-bg($gradient-primary);
  box-shadow: $shadow-button;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &::after {
    border: none;
  }
}

.categories-container {
  padding: 0 0 $spacing-md;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.categories-scroll {
  white-space: nowrap;
  padding: 0 $spacing-lg;
}

.categories {
  display: inline-flex;
  gap: 24rpx;
  
  .category-item {
    padding: 16rpx 32rpx;
    background: rgba(0, 0, 0, 0.03);
    border-radius: $radius-full;
    transition: all 0.3s ease;
    
    .category-text {
      font-size: $font-sm;
      color: $text-secondary;
      white-space: nowrap;
    }
    
    &--active {
      background: $gradient-primary;
      
      .category-text {
        color: #fff;
        font-weight: bold;
      }
    }
  }
}

.project-list {
  flex: 1;
  height: 0;
  width: 100%;
  overflow-x: hidden;
  touch-action: pan-y;
}

.list-container {
  padding: $spacing-md $spacing-lg;
  
  .project-item {
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

.project-empty-state {
  padding: 140rpx 48rpx 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: $text-primary;
}

.project-empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.project-empty-title {
  font-size: 40rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.project-empty-desc {
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.link-empty-publish-btn {
  margin: 0 auto;
  width: 80%;
  max-width: 520rpx;
  height: 92rpx;
  padding: 0 48rpx;
  border-radius: 999rpx;
  border: none;
  outline: none;
  background: linear-gradient(90deg, #3F8CFF, #A048FF);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(63, 140, 255, 0.35);
  line-height: 1.2;
  letter-spacing: 2rpx;
}

.link-empty-publish-btn::after {
  border: none;
}

.bottom-placeholder {
  height: 32rpx;
}
</style>
