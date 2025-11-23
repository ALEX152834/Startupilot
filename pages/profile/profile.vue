<template>
  <view class="profile-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="navbarStyle">
      <view class="nav-logo-row" :style="logoRowStyle">
        <image v-if="logoUrl" class="nav-logo" :src="logoUrl" mode="heightFix" lazy-load="true" />
      </view>
    </view>
    
    <view class="page-content" :style="pageContentStyle">
      <view class="profile-header">
        <text class="profile-title">Founder</text>
        <text class="profile-subtitle">Design The Inevitable.</text>
      </view>
      
      <!-- 用户信息卡片 -->
      <view class="user-card-container">
        <glass-card :hover="false" :opacity="1">
          <!-- 统一的会员卡片外层容器 -->
          <view class="member-card-wrapper">
            <!-- 背景图层 -->
            <view 
              class="member-card-bg" 
              :style="{ backgroundImage: memberCardBgUrl ? `url(${memberCardBgUrl})` : 'none' }"
            ></view>
            
            <!-- 内容层 -->
              <view 
                class="member-card" 
                :class="{ 
                  'member-card--paid': isLogin,
                  'member-card--neo': isNeoMember,
                  'member-card--normal': isLogin && !isNeoMember,
                  'member-card--guest': !isLogin,
                  'neo-card': isNeoMember
                }"
              >
                <view v-if="isNeoMember" class="neo-card-glow"></view>
              <!-- 统一的内层容器 -->
              <view class="member-card-inner">
                <!-- 顶部标签行：所有状态都有这个DOM -->
                <view class="member-card__header-row">
                  <!-- NEO会员：左侧标签 + 右侧到期时间 -->
                  <template v-if="isNeoMember">
                    <view class="neo-badge">
                      <text class="badge-text">NEO会员</text>
                    </view>
                    <view class="expiry-info-top">
                      <text class="expiry-text">到期时间：{{ formatDate(vipExpiry) }}</text>
                    </view>
                  </template>
                  
                  <!-- 普通用户：左侧标签，右侧为空 -->
                  <template v-else-if="isLogin && !isNeoMember">
                    <view class="user-badge">
                      <text class="badge-text">普通用户</text>
                    </view>
                    <view></view>
                  </template>
                  
                  <!-- 未登录：左右都为空 -->
                  <template v-else>
                    <view></view>
                    <view></view>
                  </template>
                </view>
                
                <!-- 中间区域：所有状态都有这个DOM -->
                <view class="member-card__middle">
                  <!-- 续费引导 - NEO会员 -->
                  <view v-if="isNeoMember" class="member-card__cta action-section" @tap="showRedeemModal = true">
                    <view class="action-content">
                      <text class="action-icon">⚡</text>
                      <view class="action-info">
                        <text class="action-title">续费NEO会员</text>
                        <text class="action-desc">继续享受全部权益</text>
                      </view>
                    </view>
                    <text class="action-arrow">›</text>
                  </view>
                  
                  <!-- 升级引导 - 普通用户 -->
                  <view v-else-if="isLogin" class="member-card__cta action-section" @tap="showRedeemModal = true">
                    <view class="action-content">
                      <text class="action-icon">⚡</text>
                      <view class="action-info">
                        <text class="action-title">开通NEO会员</text>
                        <text class="action-desc">解锁全部智库内容</text>
                      </view>
                    </view>
                    <text class="action-arrow">›</text>
                  </view>
                  
                  <!-- 未登录提示 -->
                  <button
                    v-else
                    class="member-card-login-tip"
                    open-type="getPhoneNumber"
                    hover-class="none"
                    @getphonenumber="onGetPhoneNumber"
                  >
                    点击登录会员
                  </button>
                  
                  <!-- UID - 登录后显示 -->
                  <view v-if="isLogin" class="uid-section">
                    <view class="uid-item">
                      <text class="uid-label">Uid：</text>
                      <text class="uid-value" @tap="copyUid">{{ userUid }}</text>
                    </view>
                  </view>
                </view>
                
                <!-- 底部区域：所有状态都有这个DOM -->
                <view class="member-card__footer">
                  <view class="stats-section">
                    <view class="stat-box">
                      <text class="stat-num">{{ stats.favoritesCount }}</text>
                      <text class="stat-text">收藏</text>
                    </view>
                    <view class="stat-box">
                      <text class="stat-num">{{ stats.postsCount }}</text>
                      <text class="stat-text">发布</text>
                    </view>
                    <view class="stat-box">
                      <text class="stat-num">{{ stats.registrationsCount }}</text>
                      <text class="stat-text">报名</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </glass-card>
      </view>

      <view
        v-if="isLogin"
        class="profile-login-section"
      >
        <view class="official-account-entry">
          <official-account
            @load="onOfficialAccountLoad"
            @error="onOfficialAccountError"
          />
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-container">
        <view class="profile-menu">
          <view 
            v-for="menu in menuList" 
            :key="menu.id"
            class="profile-menu-item"
            @tap="handleMenuTap(menu)"
          >
            <image class="profile-menu-icon" :src="menu.icon" mode="aspectFit" />
            <text class="profile-menu-text">{{ menu.text }}</text>
          </view>
        </view>
      </view>
      
      <!-- 底部占位 -->
      <view class="bottom-placeholder safe-area-bottom"></view>
    </view>
    
    <!-- VIP兑换弹窗 -->
    <redeem-modal :show="showRedeemModal" @close="showRedeemModal = false" @success="onRedeemSuccess" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/user'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import GlassCard from '@/components/glass-card/glass-card.vue'
import RedeemModal from '@/components/modals/redeem-modal.vue'
import { openEnterpriseCustomerService } from '@/utils/customer-service-config'
import { buildCloudFilePath } from '@/utils/cloud-storage'
import { logger } from '@/utils/logger'
import { useShare } from '@/composables/useShare'
import { useSafeAsync } from '@/composables/useSafeAsync'

const userStore = useUserStore()
const { stats } = storeToRefs(userStore)
const defaultStats = {
  favoritesCount: 0,
  postsCount: 0,
  registrationsCount: 0
}

const showRedeemModal = ref(false)
const LOGO_CLOUD_PATH = buildCloudFilePath('profile/分享的静态图片/白色Logo.png')
const shareTitle = '创业者-赋能社群'
const sharePath = '/pages/profile/profile'
const shareImage = buildCloudFilePath('profile/分享的静态图片/开始和我-分享.png')
const guestBgUrl = ref(buildCloudFilePath('profile/images/未登录用户.png'))
const regularBgUrl = ref(buildCloudFilePath('profile/images/普通用户测试2.png'))
const neoBgUrl = ref(buildCloudFilePath('profile/images/NEO会员测试2.png'))
const logoUrl = ref('')
const NAV_EXTRA_PADDING = 8
const DEFAULT_MENU_BUTTON_INFO = { top: 32, height: 32, bottom: 64 }
const DEFAULT_NAVBAR_HEIGHT = DEFAULT_MENU_BUTTON_INFO.bottom + NAV_EXTRA_PADDING
const isValidNumber = (value) => typeof value === 'number' && !Number.isNaN(value)
const ensureNumber = (value, fallback) => (isValidNumber(value) ? value : fallback)
const toPx = (value, fallback) => `${ensureNumber(value, fallback)}px`
const menuButtonInfo = ref({ ...DEFAULT_MENU_BUTTON_INFO })
const { isAlive, safeRun } = useSafeAsync()

useShare({
  title: shareTitle,
  path: sharePath,
  image: shareImage
})

const initNavbarMetrics = () => {
  try {
    let info = null
    if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
      info = wx.getMenuButtonBoundingClientRect()
    } else if (typeof uni !== 'undefined' && typeof uni.getMenuButtonBoundingClientRect === 'function') {
      info = uni.getMenuButtonBoundingClientRect()
    }
    if (info && info.height && info.top !== undefined) {
      menuButtonInfo.value = {
        ...DEFAULT_MENU_BUTTON_INFO,
        ...info
      }
    }
  } catch (error) {
    logger.error('[pages/profile] 获取胶囊信息失败', error)
  }
}

const initLogo = async () => {
  if (logoUrl.value) return
  try {
    if (typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.getTempFileURL === 'function') {
      const res = await wx.cloud.getTempFileURL({
        fileList: [LOGO_CLOUD_PATH]
      })
      const tempFileURL = res.fileList?.[0]?.tempFileURL
      if (tempFileURL && isAlive.value) {
        logoUrl.value = tempFileURL
        return
      }
    }
  } catch (error) {
    logger.error('[pages/profile] 加载Logo失败', error)
  }
  safeRun(() => {
    logoUrl.value = LOGO_CLOUD_PATH
  })
}
const navHeight = computed(() => {
  const info = menuButtonInfo.value || DEFAULT_MENU_BUTTON_INFO
  if (isValidNumber(info.bottom)) {
    return info.bottom + NAV_EXTRA_PADDING
  }
  const top = ensureNumber(info.top, DEFAULT_MENU_BUTTON_INFO.top)
  const height = ensureNumber(info.height, DEFAULT_MENU_BUTTON_INFO.height)
  return top + height + NAV_EXTRA_PADDING
})

const navbarStyle = computed(() => ({
  height: toPx(navHeight.value, DEFAULT_NAVBAR_HEIGHT)
}))

const logoRowStyle = computed(() => ({
  marginTop: toPx(menuButtonInfo.value?.top, DEFAULT_MENU_BUTTON_INFO.top),
  height: toPx(menuButtonInfo.value?.height, DEFAULT_MENU_BUTTON_INFO.height)
}))

const pageContentStyle = computed(() => ({
  paddingTop: toPx(navHeight.value + 12, DEFAULT_NAVBAR_HEIGHT + 12)
}))

// 计算属性
const isLogin = computed(() => userStore.isLogin)
const isNeoMember = computed(() => userStore.isNeoMember)
const userUid = computed(() => userStore.uid)
const vipExpiry = computed(() => (userStore.userInfo && userStore.userInfo.vipExpiry) || '')
const memberCardBgUrl = computed(() => {
  if (isNeoMember.value) {
    return neoBgUrl.value
  }
  if (isLogin.value) {
    return regularBgUrl.value
  }
  return guestBgUrl.value
})


// 导入云存储配置
import { CLOUD_STORAGE, getTempFileURL } from '@/utils/cloud-storage'

// 是否为管理员
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')

// 功能菜单 - 使用云存储图标（带 jianjin 样式）
const baseMenuList = ref([
  { id: 'favorites', icon: '', text: '我的收藏', url: '/subPackages/profile/favorites/favorites' },
  { id: 'posts', icon: '', text: '我的发布', url: '/subPackages/profile/posts/posts' },
  { id: 'registrations', icon: '', text: '我的报名', url: '/subPackages/profile/registrations/registrations' },
  { id: 'contact', icon: '', text: '联系我们', action: 'openCustomerService' },
  { id: 'settings', icon: '', text: '设置与条款', url: '/subPackages/profile/settings/settings' },
  { id: 'logout', icon: '', text: '退出登录', action: 'logout' }
])

// 管理员菜单
const adminMenuList = ref([
  { id: 'admin-projects', icon: '', text: '项目管理', url: '/pages/admin/projects-admin' },
  { id: 'admin-codes', icon: '', text: '兑换码管理', url: '/pages/admin/redeem-codes' },
  { id: 'admin-bookings', icon: '', text: '预约管理', url: '/pages/admin/bookings' },
  { id: 'admin-publish-permissions', icon: '', text: '发布权限管理', url: '/pages/admin/publish-permissions' }
])

// 动态菜单列表
const menuList = computed(() => {
  if (isAdmin.value) {
    // 管理员：在"我的报名"后插入管理员菜单
    const list = [...baseMenuList.value]
    list.splice(3, 0, ...adminMenuList.value)
    return list
  }
  return baseMenuList.value
})

// 加载带样式的图标
const loadStyledIcons = async () => {
  try {
    const icons = await Promise.all([
      getTempFileURL(CLOUD_STORAGE.profile.favorites, 'jianjin'),
      getTempFileURL(CLOUD_STORAGE.profile.posts, 'jianjin'),
      getTempFileURL(CLOUD_STORAGE.profile.registrations, 'jianjin'),
      getTempFileURL(CLOUD_STORAGE.profile.contact, 'jianjin'),
      getTempFileURL(CLOUD_STORAGE.profile.settings, 'jianjin'),
      getTempFileURL(CLOUD_STORAGE.profile.logout, 'jianjin')
    ])
    if (!isAlive.value) {
      return
    }
    
    // 更新基础菜单的图标
    baseMenuList.value.forEach((item, index) => {
      item.icon = icons[index]
    })
    
    // 管理员菜单使用默认图标（可以后续添加专门的图标）
    adminMenuList.value.forEach(item => {
      item.icon = icons[0] // 暂时使用收藏图标
    })
  } catch (error) {
    logger.error('[pages/profile] 加载图标失败', error)
    // 失败时使用原始 URL
    if (!isAlive.value) {
      return
    }
    baseMenuList.value[0].icon = CLOUD_STORAGE.profile.favorites
    baseMenuList.value[1].icon = CLOUD_STORAGE.profile.posts
    baseMenuList.value[2].icon = CLOUD_STORAGE.profile.registrations
    baseMenuList.value[3].icon = CLOUD_STORAGE.profile.contact
    baseMenuList.value[4].icon = CLOUD_STORAGE.profile.settings
    baseMenuList.value[5].icon = CLOUD_STORAGE.profile.logout
  }
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 加载用户统计
const loadStats = async () => {
  if (!isAlive.value) return
  logger.log('[pages/profile] 开始加载统计', { isLogin: userStore.isLogin })
  
  if (!userStore.isLogin) {
    userStore.$patch({ stats: { ...defaultStats } })
    logger.log('[pages/profile] 未登录，使用默认统计', stats.value)
    return
  }
  
  try {
    logger.log('[pages/profile] 调用 fetchStats')
    await userStore.fetchStats()
    logger.log('[pages/profile] fetchStats 返回', userStore.stats)
    logger.log('[pages/profile] 最终设置的 stats', stats.value)
  } catch (error) {
    logger.error('[pages/profile] 加载统计失败', error)
    safeRun(() => {
      userStore.$patch({ stats: { ...defaultStats } })
    })
  }
}

// 手机号快捷登录
const onGetPhoneNumber = async (event) => {
  let loginLoadingVisible = false
  const hideLoginLoading = () => {
    if (loginLoadingVisible) {
      loginLoadingVisible = false
      uni.hideLoading()
    }
  }

  try {
    // 检查是否授权手机号
    const { cloudID, errMsg } = event.detail || {}
    if (!cloudID) {
      if (errMsg && errMsg.includes('fail user deny')) {
        uni.showToast({
          title: '需要授权手机号才能登录',
          icon: 'none',
          duration: 2000
        })
      } else {
        uni.showToast({
          title: '获取手机号失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
      return
    }
    
    uni.showLoading({
      title: '登录中...',
      success: () => {
        loginLoadingVisible = true
      },
      fail: () => {
        loginLoadingVisible = false
      }
    })
    
    // 使用默认头像和昵称登录
    // 注意：根据微信最新规范，无法在登录时直接获取用户头像昵称
    // 需要用户主动设置，或使用默认值
    const userProfile = {
      nickName: '微信用户',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    }
    
    // 微信登录
    const loginResult = await userStore.login(userProfile)
    logger.log('[pages/profile] 登录成功', loginResult)
    
    // 第二步：绑定手机号
    const res = await wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'bindPhone',
        params: {
          cloudID
        }
      }
    })
    
    if (res.result.code === 0) {
      // 更新用户信息（添加手机号）
      if (res.result.data && res.result.data.phone) {
        userStore.updateUserInfo({ phone: res.result.data.phone })
      }
      
      // 刷新统计数据
      await loadStats()
      

      hideLoginLoading()
      
      // 追踪登录事件
      trackEvent(TRACK_EVENTS.USER_LOGIN)
      
      // 显示成功提示
      uni.showToast({
        title: '登录成功！',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟一下，让用户看到成功提示，然后刷新页面
      setTimeout(() => {
        // 方法1：重新加载当前页面
        uni.reLaunch({
          url: '/pages/profile/profile'
        })
      }, 1500)
    } else {
      throw new Error(res.result.message || '登录失败')
    }
    
  } catch (error) {
    hideLoginLoading()
    logger.error('[pages/profile] 一键登录失败', error)
    uni.showToast({
      title: error.message || '登录失败，请重试',
      icon: 'none',
      duration: 2000
    })
  }
}

const onOfficialAccountLoad = (event) => {
  logger.log('[pages/profile] official-account load', event)
}

const onOfficialAccountError = (event) => {
  logger.error('[pages/profile] official-account error', event?.detail || event)
}



// 菜单点击
const handleMenuTap = (menu) => {
  if (menu.action) {
    // 执行特殊操作
    switch (menu.action) {
      case 'openCustomerService':
        openEnterpriseCustomerService()
        break
      case 'logout':
        uni.showModal({
          title: '退出登录',
          content: '确定要退出登录吗?',
          success: (res) => {
            if (res.confirm) {
              userStore.logout()
            }
          }
        })
        break
    }
  } else if (menu.url) {
    // 跳转页面
    uni.navigateTo({
      url: menu.url
    })
  }
}

// 复制 UID
const copyUid = () => {
  if (!userUid.value) {
    uni.showToast({
      title: '暂无UID',
      icon: 'none'
    })
    return
  }
  
  uni.setClipboardData({
    data: userUid.value,
    success: () => {
      uni.showToast({
        title: '已复制UID',
        icon: 'success',
        duration: 1500
      })
    },
    fail: () => {
      uni.showToast({
        title: '复制失败',
        icon: 'none'
      })
    }
  })
}

// VIP兑换成功
const onRedeemSuccess = () => {
  loadStats()
}

onLoad(() => {
  initNavbarMetrics()
  initLogo()
})

onMounted(async () => {
  // 检查登录状态
  userStore.checkLogin()
  
  // 数据埋点
  trackEvent(TRACK_EVENTS.PAGE_VIEW, { page: 'profile' })
  
  // 加载图片资源
  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [
        buildCloudFilePath('profile/images/未登录用户.png'),
        buildCloudFilePath('profile/images/普通用户测试2.png'),
        buildCloudFilePath('profile/images/NEO会员测试2.png')
      ]
    })
    const fileList = (res && res.fileList) || []
    if (!isAlive.value) {
      return
    }
    if (fileList[0] && fileList[0].tempFileURL) {
      guestBgUrl.value = fileList[0].tempFileURL
    }
    if (fileList[1] && fileList[1].tempFileURL) {
      regularBgUrl.value = fileList[1].tempFileURL
    }
    if (fileList[2] && fileList[2].tempFileURL) {
      neoBgUrl.value = fileList[2].tempFileURL
    }
  } catch (error) {
    logger.error('[pages/profile] 加载图片资源失败', error)
  }
  
  // 加载带样式的图标
  loadStyledIcons()
  
  // 加载统计
  loadStats()
})

// 使用一个标记来避免频繁刷新
let lastRefreshTime = 0
onShow(() => {
  const now = Date.now()
  // 如果距离上次刷新超过3秒，才重新加载
  if (now - lastRefreshTime > 3000) {
    logger.log('[pages/profile] onShow 刷新统计数据')
    loadStats()
    lastRefreshTime = now
  }
})

onUnmounted(() => {
  // no-op: alive flag handled by useSafeAsync
})

onUnload(() => {
  // no-op: alive flag handled by useSafeAsync
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.profile-page {
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

.nav-logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-logo {
  height: 56rpx;
  width: auto;
  max-height: 100%;
}

.page-content {
  padding: 0 $spacing-lg $spacing-lg;
  box-sizing: border-box;
}

.profile-header {
  margin-bottom: $spacing-md;
}

.profile-title {
  font-size: 60rpx;
  font-weight: bold;
  color: $text-primary;
}

.profile-subtitle {
  display: block;
  margin-top: $spacing-xs;
  font-size: 28rpx;
  color: $text-tertiary;
  font-style: italic;
}

.user-card-container {
  padding: 0;
  margin-top: $spacing-md;
  
  ::v-deep .glass-card {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
  }
}

.profile-login-section {
  padding: 0;
  margin-top: $spacing-lg;
  margin-bottom: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  .official-account-entry {
    width: 100%;
    border-radius: 24rpx;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.04);
  }
}

// 绑定手机号按钮
.bind-phone-wrapper {
  padding: 0 $spacing-lg;
  margin-top: -16rpx;
  margin-bottom: $spacing-lg;

  .bind-phone-button {
    width: 100%;
    height: 96rpx;
    border-radius: $radius-full;
    border: none;
    background: linear-gradient(90deg, #3B82F6, #9333EA);
    color: #fff;
    font-size: $font-base;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 统一的会员卡片外层容器 - 三种状态共用，固定尺寸
.member-card-wrapper {
  width: 100%;
  height: 428rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
  margin-bottom: $spacing-md;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24rpx;
}

// 背景图层 - 保持比例，不变形
.member-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

// 内容层 - 覆盖在背景图上
.member-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  z-index: 1;
  
  // NEO会员卡片样式
  &.member-card--neo {
    color: #FFFFF0;
  }
  
  // 普通会员卡片样式
  &.member-card--normal {
    color: #000;
  }
  
  // 统一的横条样式（CTA区域）
  .member-card__cta {
    width: 100%;
    margin: 0;
    margin-bottom: 14rpx;
    border-radius: 16rpx;
    box-sizing: border-box;
  }
  
  // 统一的行动区域（续费/升级引导）
  .action-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14rpx 20rpx;
    backdrop-filter: blur(10px);
    
    .action-content {
      display: flex;
      align-items: center;
      gap: 10rpx;
      
      .action-icon {
        font-size: 36rpx;
      }
      
      .action-info {
        display: flex;
        flex-direction: column;
        gap: 2rpx;
        
        .action-title {
          font-size: 28rpx;
          font-weight: bold;
        }
        
        .action-desc {
          font-size: 22rpx;
          opacity: 0.8;
        }
      }
    }
    
    .action-arrow {
      font-size: 42rpx;
    }
  }
  
  // NEO会员卡片的行动区域样式
  &.member-card--neo {
    .action-section {
      background: rgba(0, 0, 0, 0.3);
      
      .action-title,
      .action-desc {
        color: #FFFFF0;
      }
      
      .action-arrow {
        color: #FFFFF0;
        opacity: 0.6;
      }
    }
  }
  
  // 普通会员卡片的行动区域样式
  &.member-card--normal {
    .action-section {
      background: rgba(255, 255, 255, 0.8);
      
      .action-title,
      .action-desc {
        color: #000;
      }
      
      .action-arrow {
        color: #999;
      }
    }
  }
  
  
  // VIP头部
  .vip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .vip-badge {
      display: flex;
      align-items: center;
      gap: 8rpx;
      padding: 8rpx 16rpx;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20rpx;
      backdrop-filter: blur(10px);
      
      .vip-icon {
        font-size: 24rpx;
      }
      
      .vip-text {
        font-size: 28rpx;
        font-weight: bold;
      }
    }
    
    .renew-btn {
      font-size: 28rpx;
      opacity: 0.9;
    }
  }
  
  // UID区域 - 居中显示
  .uid-section {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 0;
    margin-bottom: 12rpx;
    
    .member-card--paid & {
      margin-bottom: 12rpx;
    }
    
    .uid-item {
      display: flex;
      align-items: center;
      gap: 10rpx;
      
      .uid-label {
        font-size: 26rpx;
        font-weight: 500;
      }
      
      .uid-value {
        font-size: 28rpx;
        font-weight: 600;
      }
    }
  }
  
  // NEO会员卡片的UID样式
  &.member-card--neo {
    .uid-section {
      .uid-label,
      .uid-value {
        color: #FFFFF0;
      }
    }
  }
  
  // 普通会员卡片的UID样式
  &.member-card--normal {
    .uid-section {
      .uid-label,
      .uid-value {
        color: #000;
      }
    }
  }
  
  // 权益区域
  .benefits-section {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 24rpx;
    
    .benefit-tag {
      padding: 8rpx 16rpx;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16rpx;
      font-size: 24rpx;
      backdrop-filter: blur(10px);
    }
  }
  
  // 到期时间
  .expiry-section {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 24rpx;
    
    .expiry-label {
      font-size: 28rpx;
      opacity: 0.8;
    }
    
    .expiry-date {
      font-size: 28rpx;
      font-weight: 500;
    }
  }
  
  // 统一的内层容器
  .member-card-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  
  // 有会员卡（普通用户、NEO会员）的统一布局
  &.member-card--paid {
    .member-card-inner {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      padding: 24rpx 24rpx 20rpx;
      box-sizing: border-box;
    }
    
    // 顶部标签行
    .member-card__header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10rpx;
      width: 100%;
    }
    
    // 中间区域
    .member-card__middle {
      margin-bottom: 14rpx;
    }
    
    // 底部区域
    .member-card__footer {
      padding-bottom: 8rpx;
    }
  }
  
  // 顶部标签行样式
  .member-card__header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    
    .neo-badge {
      display: inline-flex;
      align-items: center;
      padding: 10rpx 24rpx;
      background: #ffffff;
      border-radius: 999rpx;
      box-shadow: 0 4rpx 12rpx rgba(0, 102, 88, 0.4);
      width: auto;
      max-width: fit-content;
      
      text {
        font-size: 32rpx !important;
        color: #000000 !important;
        font-weight: bold !important;
      }
      
      .badge-text {
        font-size: 32rpx !important;
        color: #000000 !important; 
        font-weight: bold !important;
      }
    }
    
    .user-badge {
      display: inline-flex;
      align-items: center;
      padding: 10rpx 24rpx;
      background: linear-gradient(135deg, #3B82F6 0%, #1E85EE 100%);
      border-radius: 999rpx;
      width: auto;
      max-width: fit-content;
      
      .badge-text {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
    }
    
    .expiry-info-top {
      display: flex;
      align-items: center;
      padding: 8rpx 16rpx;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 16rpx;
      backdrop-filter: blur(10px);
      
      .expiry-text {
        font-size: 22rpx;
        color: #FFFFF0;
        opacity: 0.95;
        font-weight: 500;
        white-space: nowrap;
      }
    }
  }
  
  // 中间区域
  .member-card__middle {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  // 未登录卡片的特殊布局
  &.member-card--guest {
    display: flex;
    
    .member-card-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 0 24rpx;
      box-sizing: border-box;
    }

    .member-card__header-row,
    .member-card__footer,
    .member-card__middle .uid-section {
      display: none;
    }

    .member-card__middle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .member-card-login-tip {
      position: absolute;
      top: 42%;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12rpx 44rpx;
      border-radius: 999rpx;
      border: none;
      outline: none;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12rpx);
      color: #111;
      font-size: 30rpx;
      font-weight: 600;
      line-height: 1.2;
      box-shadow: 0 14rpx 32rpx rgba(0, 0, 0, 0.08);
      white-space: nowrap;
      margin: 0;
    }

    .member-card-login-tip::after {
      border: none;
    }
  }
  
  // 底部区域
  .member-card__footer {
    width: 100%;
    flex-shrink: 0;
    padding-bottom: 4rpx;
    margin-top: auto;
  }
  
  // 统计数据
  .stats-section {
    display: flex;
    justify-content: space-around;
    margin-top: 0;
    
    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6rpx;
      
      .stat-num {
        font-size: 36rpx;
        font-weight: bold;
      }
      
      .stat-text {
        font-size: 22rpx;
        font-weight: 500;
      }
    }
  }
  
  // NEO会员卡片的统计数据样式
  &.member-card--neo {
    .stats-section {
      .stat-num,
      .stat-text {
        color: #FFFFF0;
      }
    }
  }
  
  // 普通会员卡片的统计数据样式
  &.member-card--normal {
    .stats-section {
      .stat-num,
      .stat-text {
        color: #000;
      }
    }
  }
}

// 功能菜单
.menu-container {
  padding: 0 $spacing-lg $spacing-lg;
  margin-top: $spacing-lg;
}

.neo-card {
  position: relative;
  overflow: hidden;
}

.neo-card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    circle at 30% 0%,
    rgba(255, 255, 255, 0.35),
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0)
  );
  opacity: 0;
  animation: neoGlow 3s ease-in-out infinite;
}

.neo-card > view:not(.neo-card-glow),
.neo-card > text,
.neo-card > image {
  position: relative;
  z-index: 2;
}

@keyframes neoGlow {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}

.profile-menu {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  row-gap: $spacing-md;
}

.profile-menu-item {
  box-sizing: border-box;
  width: 32%;
  height: 150rpx;
  border-radius: $radius-lg;
  padding: 16rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.08);
}

.profile-menu-icon {
  width: 56rpx;
  height: 56rpx;
  margin-bottom: 12rpx;
}

.profile-menu-text {
  font-size: $font-sm;
  color: $text-primary;
  text-align: center;
  white-space: nowrap;
  line-height: 1.2;
}

.bottom-placeholder {
  height: 32rpx;
}

</style>
