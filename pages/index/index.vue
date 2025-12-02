<template>
  <view class="index-page">
    <view class="custom-navbar" :style="navbarStyle">
      <view class="nav-logo-row" :style="logoRowStyle">
        <image v-if="logoUrl" class="nav-logo" :src="logoUrl" mode="heightFix" lazy-load="true" />
      </view>
    </view>
    
    <scroll-view 
      class="page-content" 
      :style="pageContentStyle"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="hero-section">
        <text class="hero-title">Startupilot</text>
        <text class="hero-subtitle">Startup with you.</text>
      </view>
      
      <!-- 最新活动板块 -->
      <view class="section section-first">
        <view class="section-header">
          <text class="section-title">✨ 最新活动</text>
        </view>
        
        <!-- 活动列表 - 上下排列 -->
        <view v-if="eventList.length > 0" class="events-list">
          <view 
            v-for="event in eventList"
            :key="event._id"
            class="event-item-simple"
          >
            <!-- 活动图片 -->
            <image 
              :src="event.image"
              mode="widthFix"
              class="event-image"
              lazy-load="true"
            />
            
            <!-- 预约按钮 -->
            <button
              v-if="!userStore.isLogin"
              class="book-button-native"
              open-type="getPhoneNumber"
              @getphonenumber="(e) => handleAuthorize({ event, detail: e.detail })"
            >
              立即预约
            </button>
            <button
              v-else
              class="book-button"
              :class="{ 'book-button--booked': event.isBooked }"
              :disabled="event.isBooked"
              @tap="handleBookEvent(event)"
            >
              {{ event.isBooked ? '已预约' : '立即预约' }}
            </button>
          </view>
        </view>
        
        <skeleton v-else-if="loading" type="card" />
        <empty-state v-else icon="📭" title="暂无活动" />
      </view>
      
      <!-- 关于我们板块 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">✨ 关于我们</text>
        </view>
        
        <glass-card class="about-card" :opacity="1">
          <view class="about-images">
            <!-- 云存储图片 - 上下拼接 -->
            <image 
              v-for="(img, index) in aboutImages"
              :key="index"
              class="about-image"
              :src="img"
              mode="widthFix"
              lazy-load="true"
              :show-menu-by-longpress="false"
            />
          </view>
        </glass-card>
      </view>
      
      <!-- 常见问题板块 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">💡 常见问题</text>
        </view>
        
        <view class="faq-list">
          <view 
            v-for="(faq, index) in faqList" 
            :key="index"
            class="faq-item"
            @tap="toggleFAQ(index)"
          >
            <view class="faq-card" :class="{ 'faq-card--expanded': faq.expanded }">
              <view class="faq-question">
                <text class="question-text">Q: {{ faq.question }}</text>
                <text class="toggle-icon">{{ faq.expanded ? '∧' : '∨' }}</text>
              </view>
              
              <view v-if="faq.expanded" class="faq-answer">
                <text class="answer-text">{{ faq.answer }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 底部占位 -->
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
    
    <!-- 报名表单弹窗 -->
    <form-modal 
      :show="showFormModal" 
      @close="showFormModal = false"
      @success="onFormSuccess"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useEventStore } from '@/store/event'
import { useUserStore } from '@/store/user'
import GlassCard from '@/components/glass-card/glass-card.vue'
import EventCard from '@/components/event-card/event-card.vue'
import Skeleton from '@/components/skeleton/skeleton.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import FormModal from '@/components/modals/form-modal.vue'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'
import { CLOUD_STORAGE, buildCloudFilePath, getCdnUrl } from '@/utils/cloud-storage'
import { showError, showSuccess } from '@/utils/feedback'
import { logger } from '@/utils/logger'
import { useNavbar } from '@/composables/useNavbar'
import { useSafeAsync } from '@/composables/useSafeAsync'
import { getSharePreset } from '@/utils/share-presets'

const eventStore = useEventStore()
const userStore = useUserStore()

const loading = ref(false)
const refreshing = ref(false)
const showFormModal = ref(false)
const pendingEventId = ref('')
const NAV_EXTRA_PADDING = 8
const LOGO_CLOUD_PATH = buildCloudFilePath('profile/分享的静态图片/顶部白Logo.png')
const { title: shareTitle, path: sharePath, image: shareImage } = getSharePreset('index')
const LOGO_CDN_URL = getCdnUrl(LOGO_CLOUD_PATH)
const SHARE_CDN_IMAGE = shareImage
const { isAlive, safeRun } = useSafeAsync()
const {
  navbarHeightStyle,
  buildLogoRowStyle,
  buildContentPaddingStyle,
  refreshNavbarMetrics
} = useNavbar({
  defaultMenuButtonInfo: { top: 32, height: 32, left: 0, bottom: 64 },
  extraPadding: NAV_EXTRA_PADDING,
  enableWindowInfo: false,
  logPrefix: '[pages/index]'
})

// 分享给好友
onShareAppMessage(() => {
  return {
    title: shareTitle,
    path: sharePath,
    imageUrl: SHARE_CDN_IMAGE
  }
})

// 分享到朋友圈
onShareTimeline(() => {
  return {
    title: shareTitle,
    imageUrl: SHARE_CDN_IMAGE
  }
})
const logoUrl = ref('')
let loadEventsTaskId = 0
const navbarStyle = navbarHeightStyle
const logoRowStyle = buildLogoRowStyle()
const pageContentStyle = buildContentPaddingStyle()

// 活动列表
const eventList = ref([])
const bookingSyncing = ref(false)

// 本地活动数据（使用云存储图片）
const localEvents = [
  {
    _id: 'local-1',
    eventNumber: 'EVT-001',
    title: 'Bella Ren 创业分享会',
    date: '2025-11-20',
    time: '14:00-16:00',
    type: 'online',
    location: '线上直播',
    image: getCdnUrl('profile/活动/Bella Ren.png'),
    description: '创业经验分享与交流',
    isBooked: false
  },
  {
    _id: 'local-2',
    eventNumber: 'EVT-002',
    title: 'Phoebe 产品设计工作坊',
    date: '2025-11-22',
    time: '15:00-17:00',
    type: 'offline',
    location: '北京创业大街',
    image: getCdnUrl('profile/活动/Phoebe.png'),
    description: '产品设计思维与实践',
    isBooked: false
  },
  {
    _id: 'local-3',
    eventNumber: 'EVT-003',
    title: 'Luna 投资人见面会',
    date: '2025-11-25',
    time: '10:00-12:00',
    type: 'offline',
    location: '上海张江',
    image: getCdnUrl('profile/活动/Luna.png'),
    description: '投资人面对面交流',
    isBooked: false
  }
]

// 云存储图片 - 关于我们（带 jianjin 样式）
const aboutImages = ref([])

const initLogo = () => {
  if (logoUrl.value) return
  logoUrl.value = LOGO_CDN_URL
}

// 加载带样式的图片
const loadStyledImages = () => {
  safeRun(() => {
    aboutImages.value = CLOUD_STORAGE.about.map(getCdnUrl)
  })
}

// 加载带样式的活动图片
const loadStyledEventImages = async () => {
  return localEvents.map(event => ({ ...event, image: getCdnUrl(event.image) }))
}

// 根据预约记录同步活动状态
const syncBookingStatus = async (events = []) => {
  if (!Array.isArray(events) || events.length === 0) {
    return
  }

  if (!userStore.isLogin) {
    events.forEach(event => {
      event.isBooked = false
    })
    return
  }

  if (!isAlive.value) return
  bookingSyncing.value = true
  try {
    await eventStore.fetchMyBookings('confirmed')
  } catch (error) {
    logger.error('[pages/index] 获取预约状态失败', error)
  } finally {
    safeRun(() => {
      bookingSyncing.value = false
    })
  }

  if (!isAlive.value) return
  const bookedIds = new Set(eventStore.myBookings.map(item => item.eventId))
  events.forEach(event => {
    event.isBooked = bookedIds.has(event._id)
  })
}

// FAQ列表
const faqList = ref([
  {
    question: '报名参加活动后如何取得联系？',
    answer: '这个不用担心，我们会有专门的小助手联系您的，但是请您务必保证表单的信息填写无误，如果需要更改，您可通过点击导航栏“我”页面-“个人设置”中进行更改。',
    expanded: false
  },
  {
    question: '所有知识都是开源的吗？',
    answer: '我们的核心理念是最大化知识开源，但是为了组织的可持续发展，也需要各位创友通过订阅我们的NEO会员来解锁全部会员权益，感谢您支持我们继续运营下去。',
    expanded: false
  },
  {
    question: '如何主动联系我们？',
    answer: '您可通过点击导航栏“我”页面-“联系我们”摁钮，来与我们主动取得联系。',
    expanded: false
  }
])

// 加载活动列表
const loadEvents = async () => {
  if (!isAlive.value) return
  const taskId = ++loadEventsTaskId
  loading.value = true
  let eventsToRender = []
  try {
    // 优先使用本地活动（带样式的图片）
    const styledEvents = await loadStyledEventImages()
    await syncBookingStatus(styledEvents)
    eventsToRender = styledEvents
    
    // 如果需要，也可以加载云端活动并合并
    // await eventStore.fetchEventList(true)
    // eventList.value = [...styledEvents, ...eventStore.eventList]
  } catch (error) {
    logger.error('[pages/index] 加载活动失败', error)
    // 失败时使用原始本地活动
    const fallbackEvents = localEvents.map(event => ({ ...event }))
    await syncBookingStatus(fallbackEvents)
    eventsToRender = fallbackEvents
  } finally {
    if (!isAlive.value || taskId !== loadEventsTaskId) {
      return
    }
    eventList.value = eventsToRender
    loading.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  if (!isAlive.value) return
  refreshing.value = true
  try {
    await loadEvents()
  } finally {
    safeRun(() => {
      refreshing.value = false
    })
  }
}

// 预约活动
const handleBookEvent = async (event) => {
  // 如果已预约，不执行任何操作
  if (event.isBooked) {
    return
  }
  
  // 数据埋点
  trackEvent(TRACK_EVENTS.EVENT_BOOK, {
    eventId: event._id,
    eventTitle: event.title
  })
  
  // 检查登录状态
  if (!userStore.isLogin) {
    logger.log('[pages/index] 用户未登录，无法预约')
    return
  }
  
  logger.log('[pages/index] 检查报名信息', {
    hasFilledRegistrationInfo: userStore.hasFilledRegistrationInfo,
    uid: userStore.uid
  })
  
  // 检查是否已填写报名信息
  if (!userStore.hasFilledRegistrationInfo) {
    logger.log('[pages/index] 未填写报名信息，弹出表单')
    pendingEventId.value = event._id
    showFormModal.value = true
    return
  }
  
  logger.log('[pages/index] 已填写报名信息，直接预约')
  
  try {
    // 调用预约接口（传递活动信息）
    const success = await eventStore.bookEvent(event._id, event)
    
    // 更新本地状态
    if (success && isAlive.value) {
      event.isBooked = true
    }
  } catch (error) {
    logger.error('[pages/index] 预约失败', error)
    
    // 如果不是"已预约"的错误，才显示失败提示
    if (!error.message || !error.message.includes('已预约')) {
      showError('预约失败，请重试')
    }
  }
}

// 表单提交成功后继续预约
const onFormSuccess = async () => {
  if (pendingEventId.value) {
    try {
      // 查找活动信息
      const event = eventList.value.find(e => e._id === pendingEventId.value)
      
      // 调用预约接口（本地活动会传递活动信息）
      if (event) {
        await eventStore.bookEvent(pendingEventId.value, event)
        // 更新本地状态
        safeRun(() => {
          event.isBooked = true
        })
      }
    } catch (error) {
      logger.error('[pages/index] 表单提交后预约失败', error)
    }
    safeRun(() => {
      pendingEventId.value = ''
    })
  }
}

const handleAuthorize = async ({ event, detail }) => {
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

    logger.log('[pages/index] 登录成功', { uid: userStore.uid })
    logger.log('[pages/index] 是否已填写报名信息', { hasFilledRegistrationInfo: userStore.hasFilledRegistrationInfo })

    showSuccess('登录成功')

    // 保存待预约的活动ID
    pendingEventId.value = event._id
    
    // 检查是否需要填写报名信息
    if (!userStore.hasFilledRegistrationInfo) {
      logger.log('[pages/index] 需要填写报名信息，弹出表单')
      showFormModal.value = true
    } else {
      // 直接预约
      await handleBookEvent(event)
    }
  } catch (error) {
    logger.error('[pages/index] 登录失败', error)
    showError('登录失败，请重试')
  }
}

// 切换FAQ展开/收起
const toggleFAQ = (index) => {
  const list = faqList.value
  const isOpen = list[index].expanded

  list.forEach((item, i) => {
    item.expanded = i === index ? !isOpen : false
  })

  // 触发视图更新
  faqList.value = [...list]
}

onLoad(() => {
  refreshNavbarMetrics()
  initLogo()
})

onMounted(() => {
  // 数据埋点
  trackEvent(TRACK_EVENTS.PAGE_VIEW, { page: 'index' })
  
  // 加载带样式的图片
  loadStyledImages()
  
  // 加载数据
  loadEvents()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.index-page {
  min-height: 100vh;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  height: 100%;
  box-sizing: border-box;
}

.hero-section {
  padding: 64rpx $spacing-lg 24rpx;
  background: #fff;
  margin-bottom: $spacing-lg;

  .hero-title {
    display: block;
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

.section {
  padding: $spacing-lg;
  
  &-header {
    margin-bottom: $spacing-md;
  }
  
  &-title {
    font-size: $font-xl;
    font-weight: bold;
    color: $text-primary;
  }
}

.section-first {
  padding-top: 0 !important;
  
  .section-header {
    padding-top: 0;
    margin-top: 0;
    margin-bottom: $spacing-md;
  }
}

// 活动列表 - 上下排列
.events-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  
  .event-item-simple {
    position: relative;
    padding: $spacing-md;
    background: #fff;
    border: 2px solid #E5E7EB;
    border-radius: $radius-lg;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08), 0 2rpx 6rpx rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
    
    &:active {
      box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12), 0 3rpx 8rpx rgba(0, 0, 0, 0.06);
      transform: translateY(-2rpx);
    }
    
    .event-image {
      width: 100%;
      display: block;
      border-radius: $radius-md;
    }
    
    .book-button,
    .book-button-native {
      width: 100%;
      height: 88rpx;
      margin-top: $spacing-md;
      border-radius: $radius-full;
      border: none;
      background: linear-gradient(90deg, #3B82F6, #9333EA);
      color: #fff;
      font-size: $font-base;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      &:active {
        transform: scale(0.98);
        opacity: 0.9;
      }
      
      // 已预约状态
      &.book-button--booked {
        background: #9CA3AF !important;
        color: #6B7280 !important;
        cursor: not-allowed;
        
        &:active {
          transform: none;
          opacity: 1;
        }
      }
    }
    
    .book-button-native {
      padding: 0;
      line-height: 88rpx;
    }
  }
}

// 关于板块
.about-card {
  padding: 0;
  overflow: hidden;
  
  .about-images {
    display: flex;
    flex-direction: column;
    
    .about-image {
      width: 100%;
      display: block;
      
      &:not(:last-child) {
        margin-bottom: 2rpx;
      }
    }
  }
}

// FAQ列表
.faq-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
  
  .faq-item {
    .faq-card {
      @include glass-effect;
      border-radius: $radius-lg;
      padding: $spacing-md;
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
      transition: all $transition-base ease;
    }

    .faq-card--expanded {
      box-shadow: 0 12rpx 24rpx rgba(59, 130, 246, 0.18);
    }

    .faq-question {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: $font-base;
      font-weight: 600;
      color: $text-primary;
    }
    
    .faq-answer {
      font-size: $font-sm;
      color: $text-secondary;
      line-height: 1.6;
      animation: faq-expand 0.25s ease;
    }
    
    .toggle-icon {
      font-size: $font-lg;
    }
  }
}

@keyframes faq-expand {
  from {
    opacity: 0;
    transform: translateY(-10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bottom-placeholder {
  height: 32rpx;
}
</style>

