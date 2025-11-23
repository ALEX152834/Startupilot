<template>
  <view class="admin-projects-page">
    <view class="custom-navbar" :style="navbarStyle">
      <view class="navbar-inner" :style="navbarInnerStyle">
        <view class="back-button" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="navbar-titles">
          <text class="navbar-title">项目管理（管理员视图）</text>
          <text class="navbar-subtitle">包含注册主体及联系方式，仅内部可见</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="admin-project-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      :style="pageContentStyle"
      @refresherrefresh="handleRefresh"
    >
      <view v-if="loading && adminProjects.length === 0" class="admin-loading">
        <loading :show="true" size="small" />
        <text class="loading-text">正在加载项目...</text>
      </view>

      <view v-else-if="adminProjects.length === 0" class="admin-empty">
        <text class="empty-icon">📂</text>
        <text class="empty-text">暂无项目记录</text>
      </view>

      <view v-else class="admin-project-cards">
        <project-card
          v-for="project in adminProjects"
          :key="project._id"
          class="admin-project-card"
          :project="project"
          admin-view
          :is-login="true"
          :show-admin-actions="true"
          action-type="delete"
          @delete="handleAdminDelete"
        />
      </view>

      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useProjectStore } from '@/store/project'
import ProjectCard from '@/components/project-card/project-card.vue'
import Loading from '@/components/loading/loading.vue'
import { logger } from '@/utils/logger'
import { useShare } from '@/composables/useShare'
import { useSafeAsync } from '@/composables/useSafeAsync'

const disableShare = true
defineExpose({
  disableShare
})

useShare({
  disable: true
})

const projectStore = useProjectStore()
const loading = ref(false)
const refreshing = ref(false)
const deletingProjectId = ref('')

const DEFAULT_MENU_BUTTON_INFO = { top: 32, height: 32, bottom: 64 }
const NAV_EXTRA_PADDING = 12
const DEFAULT_NAVBAR_HEIGHT = (DEFAULT_MENU_BUTTON_INFO.bottom || 64) + NAV_EXTRA_PADDING

const menuButtonInfo = ref({ ...DEFAULT_MENU_BUTTON_INFO })
const { isAlive } = useSafeAsync()

const isValidNumber = (value) => typeof value === 'number' && !Number.isNaN(value)
const toPx = (value, fallback) => `${isValidNumber(value) ? value : fallback}px`

const navHeight = computed(() => {
  const info = menuButtonInfo.value || DEFAULT_MENU_BUTTON_INFO
  if (isValidNumber(info.bottom)) {
    return info.bottom + NAV_EXTRA_PADDING
  }
  const top = isValidNumber(info.top) ? info.top : DEFAULT_MENU_BUTTON_INFO.top
  const height = isValidNumber(info.height) ? info.height : DEFAULT_MENU_BUTTON_INFO.height
  return top + height + NAV_EXTRA_PADDING
})

const navbarStyle = computed(() => ({
  height: toPx(navHeight.value, DEFAULT_NAVBAR_HEIGHT)
}))

const navbarInnerStyle = computed(() => ({
  marginTop: toPx(menuButtonInfo.value?.top, DEFAULT_MENU_BUTTON_INFO.top),
  height: toPx(menuButtonInfo.value?.height, DEFAULT_MENU_BUTTON_INFO.height)
}))

const pageContentStyle = computed(() => ({
  paddingTop: toPx(navHeight.value + 16, DEFAULT_NAVBAR_HEIGHT + 16)
}))

const adminProjects = computed(() => projectStore.projectList)

const initNavbarMetrics = () => {
  try {
    let info = null
    if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
      info = wx.getMenuButtonBoundingClientRect()
    } else if (typeof uni !== 'undefined' && typeof uni.getMenuButtonBoundingClientRect === 'function') {
      info = uni.getMenuButtonBoundingClientRect()
    }
    if (info && info.height && info.top !== undefined && isAlive.value) {
      menuButtonInfo.value = {
        ...DEFAULT_MENU_BUTTON_INFO,
        ...info
      }
    }
  } catch (error) {
    logger.error('获取胶囊信息失败:', error)
  }
}

const fetchProjects = async (refresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    await projectStore.fetchProjectList(refresh, { includePrivate: true })
  } finally {
    loading.value = false
  }
}

const handleRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await fetchProjects(true)
  } finally {
    refreshing.value = false
  }
}

const handleAdminDelete = (project) => {
  if (!project?._id || deletingProjectId.value) {
    return
  }

  uni.showModal({
    title: '删除项目',
    content: `确定要删除【${project.projectName || project.title}】吗？此操作不可恢复。`,
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      deletingProjectId.value = project._id
      try {
        await projectStore.deleteProject(project._id)
        await projectStore.fetchProjectList(true, { includePrivate: true })
      } catch (error) {
        logger.error('删除项目失败:', error)
      } finally {
        deletingProjectId.value = ''
      }
    }
  })
}

const handleBack = () => {
  const fallback = () => {
    uni.switchTab({
      url: '/pages/profile/profile'
    })
  }
  const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (stack && stack.length > 1) {
    uni.navigateBack({
      delta: 1,
      fail: fallback
    })
  } else {
    fallback()
  }
}

onLoad(() => {
  initNavbarMetrics()
  fetchProjects(true)
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.admin-projects-page {
  min-height: 100vh;
  background: $bg-color;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #fff;
  padding: 0 $spacing-lg 12rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.08);
}

.navbar-inner {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.back-button {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-full;
  background: rgba(15, 23, 42, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;

  .back-icon {
    font-size: 36rpx;
    color: $text-primary;
  }
}

.navbar-titles {
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  .navbar-title {
    font-size: 34rpx;
    font-weight: 700;
    color: $text-primary;
  }

  .navbar-subtitle {
    font-size: $font-sm;
    color: $text-secondary;
  }
}

.admin-project-list {
  width: 100%;
  box-sizing: border-box;
  padding: 0 $spacing-lg $spacing-lg;
}

.admin-loading,
.admin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 16rpx;

  .loading-text,
  .empty-text {
    font-size: $font-base;
    color: $text-secondary;
  }

  .empty-icon {
    font-size: 80rpx;
  }
}

.admin-project-cards {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.admin-project-card {
  border: 1px solid rgba(17, 24, 39, 0.08);
}
</style>
