<template>
  <glass-card class="project-card" :opacity="1" @tap="handleTap">
    <view class="project-card__header">
      <!-- 创意项目标识 -->
      <view class="project-symbol">
        <image
          v-if="projectLogoUrl"
          :src="projectLogoUrl"
          mode="aspectFill"
          class="project-logo"
          lazy-load="true"
        />
        <view v-else class="symbol-core">
          <text class="symbol-text">{{ getFirstChar(project.projectName || project.title) }}</text>
          <view class="symbol-glow"></view>
        </view>
      </view>
      
      <!-- 项目概要 -->
      <view class="project-overview">
        <view class="project-title-row">
          <text class="project-title ellipsis">{{ project.title }}</text>
          <view class="meta-chip">
            {{ project.category || '未分类' }}
          </view>
        </view>
        <text v-if="project.oneLiner" class="project-summary ellipsis-2">{{ project.oneLiner }}</text>
        <view v-if="project.tags && project.tags.length" class="project-overview-tags">
          <view 
            v-for="(tag, index) in project.tags.slice(0, 3)" 
            :key="`header-tag-${index}`" 
            class="overview-tag"
          >
            {{ tag }}
          </view>
          <view 
            v-if="project.tags.length > 3" 
            class="overview-tag overview-tag--more"
          >
            +{{ project.tags.length - 3 }}
          </view>
        </view>
        <text v-if="project.createdAt" class="project-date">发布 {{ formatDate(project.createdAt) }}</text>
      </view>
    </view>
    
    <!-- 项目详情 -->
    <view class="project-card__content">
      <!-- 项目名称 -->
      <view v-if="project.projectName" class="project-field">
        <text class="field-label">📋 项目名称:</text>
        <text class="field-value">{{ project.projectName }}</text>
      </view>

      <!-- 管理员可见：注册主体 -->
      <view v-if="adminView && project.registeredEntity" class="project-field project-field--private">
        <text class="field-label">🏢 注册主体:</text>
        <text class="field-value">{{ project.registeredEntity }}</text>
      </view>

      <!-- 管理员可见：发布人与联系方式 -->
      <view
        v-if="adminView && (publisherNameDisplay || publisherPhoneDisplay || publisherWechatDisplay)"
        class="project-field project-field--private"
      >
        <text class="field-label">👤 发布人:</text>
        <text class="field-value">{{ publisherNameDisplay }}</text>
        <view class="private-meta">
          <text class="private-label">☎ 联系方式：</text>
          <text class="private-value">{{ publisherPhoneDisplay || '未填写' }}</text>
        </view>
        <view v-if="publisherWechatDisplay" class="private-meta">
          <text class="private-label">💬 微信号：</text>
          <text class="private-value">{{ publisherWechatDisplay }}</text>
        </view>
      </view>
      
      <!-- 一句话介绍 -->
      <view v-if="project.oneLiner" class="project-field">
        <text class="field-label">💡 一句话:</text>
        <text class="field-value" :class="{ 'ellipsis-2': !isExpanded }">{{ project.oneLiner }}</text>
      </view>
      
      <!-- 项目赛道 -->
      <view v-if="project.track && project.track.length > 0" class="project-tracks">
        <text class="field-label">🏷️ 项目赛道:</text>
        <view class="track-tags">
          <view v-for="(track, index) in project.track.slice(0, 3)" :key="index" class="track-tag">
            {{ track }}
          </view>
          <view v-if="project.track.length > 3" class="track-tag more">
            +{{ project.track.length - 3 }}
          </view>
        </view>
      </view>
      
      <!-- 项目介绍 -->
      <view v-if="project.introduction" class="project-field">
        <text class="field-label">📝 项目介绍:</text>
        <text class="field-value" :class="{ 'ellipsis-3': !isExpanded }">{{ project.introduction }}</text>
      </view>
      
      <!-- 核心竞争力 -->
      <view v-if="project.coreCompetitiveness" class="project-field">
        <text class="field-label">⚡ 核心竞争力:</text>
        <text class="field-value" :class="{ 'ellipsis-2': !isExpanded }">{{ project.coreCompetitiveness }}</text>
      </view>

      <!-- 项目说明 -->
      <view v-if="project.description" class="project-field">
        <text class="field-label">🎯 合作诉求:</text>
        <text class="field-value" :class="{ 'ellipsis-3': !isExpanded }">{{ project.description }}</text>
      </view>

      <!-- 核心产品 -->
      <view v-if="project.coreProducts" class="project-field">
        <text class="field-label">🧩 核心产品:</text>
        <text class="field-value" :class="{ 'ellipsis-2': !isExpanded }">{{ project.coreProducts }}</text>
      </view>

      <!-- 最佳实践 -->
      <view v-if="project.bestPractices" class="project-field">
        <text class="field-label">🚀 里程碑:</text>
        <text class="field-value" :class="{ 'ellipsis-2': !isExpanded }">{{ project.bestPractices }}</text>
      </view>

      <!-- 主营区域 -->
      <view v-if="project.mainRegion" class="project-field">
        <text class="field-label">📍 主营区域:</text>
        <text class="field-value">{{ project.mainRegion }}</text>
      </view>

      <!-- 更多信息 -->
      <view v-if="project.moreInfo" class="project-field">
        <text class="field-label">🧭 更多信息:</text>
        <text class="field-value" :class="{ 'ellipsis-3': !isExpanded }">{{ project.moreInfo }}</text>
      </view>
    </view>

    <view v-if="hasExpandableContent" class="project-card__expand">
      <text class="expand-button" @tap.stop="toggleExpand">
        {{ isExpanded ? '收起内容' : '展开更多' }}
      </text>
    </view>
    
    <!-- UID 信息 -->
    <view class="project-card__uid" @tap.stop="handleCopyUid">
      <text class="uid-label">UID</text>
      <text class="uid-value">{{ project.publisherUid || '未知' }}</text>
    </view>

    <!-- 底部信息 -->
    <view class="project-card__footer">
      <view class="project-card__actions">
        <template v-if="currentActionType === 'delete'">
          <glass-button
            type="primary"
            size="small"
            block
            class="project-card__action-full"
            @tap.stop="handleDelete"
          >
            删除
          </glass-button>
        </template>
        <template v-else>
          <button
            v-if="!isLogin"
            class="project-card__native-button project-card__action-full"
            open-type="getPhoneNumber"
            @getphonenumber.stop="handleAuthorize"
          >
            <view class="project-card__button-text">链接项目</view>
          </button>
          <glass-button
            v-else
            size="small"
            block
            class="project-card__action-full"
            @tap.stop="handleConnect"
          >
            链接项目
          </glass-button>
        </template>
      </view>
    </view>
  </glass-card>
</template>

<script setup>
import { computed, ref, watch, toRef } from 'vue'
import GlassCard from '@/components/glass-card/glass-card.vue'
import GlassButton from '@/components/glass-button/glass-button.vue'
import { logger } from '@/utils/logger'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  adminView: {
    type: Boolean,
    default: false
  },
  isLogin: {
    type: Boolean,
    default: false
  },
  showAdminActions: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    default: 'connect'
  }
})

const emit = defineEmits(['tap', 'connect', 'authorize', 'delete'])
const adminView = toRef(props, 'adminView')
const projectRef = toRef(props, 'project')

const publisherNameDisplay = computed(() => {
  const project = projectRef.value || {}
  return project.publisherName || project.publisherUid || '未填写'
})

const publisherPhoneDisplay = computed(() => {
  const project = projectRef.value || {}
  return project.publisherPhone || project.contactPhone || project.phone || ''
})

const publisherWechatDisplay = computed(() => {
  const project = projectRef.value || {}
  return project.publisherWechat || project.contactWechat || project.wechat || ''
})

const isExpanded = ref(false)

const EXPAND_FIELD_LIMITS = {
  oneLiner: 36,
  introduction: 60,
  description: 60,
  coreCompetitiveness: 60,
  coreProducts: 50,
  bestPractices: 50,
  moreInfo: 50
}

const hasExpandableContent = computed(() => {
  const project = projectRef.value || {}
  return Object.entries(EXPAND_FIELD_LIMITS).some(([key, limit]) => {
    const value = project[key]
    return typeof value === 'string' && value.length > limit
  })
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

watch(projectRef, () => {
  isExpanded.value = false
})

const projectLogoUrl = ref('')
let logoResolveId = 0

const currentActionType = computed(() => {
  return props.showAdminActions ? 'delete' : props.actionType
})

const isHttpUrl = (url = '') => /^https?:\/\//i.test(url)

const resolveProjectLogo = async () => {
  const logo = props.project?.logo || ''
  logoResolveId += 1
  const currentId = logoResolveId
  
  if (!logo) {
    projectLogoUrl.value = ''
    return
  }

  if (logo.startsWith('data:') || isHttpUrl(logo)) {
    projectLogoUrl.value = logo
    return
  }

  if (logo.startsWith('cloud://')) {
    if (typeof wx !== 'undefined' && wx.cloud?.getTempFileURL) {
      try {
        const res = await wx.cloud.getTempFileURL({
          fileList: [logo]
        })
        if (logoResolveId === currentId) {
          projectLogoUrl.value = res?.fileList?.[0]?.tempFileURL || ''
        }
      } catch (error) {
        logger.error('[project-card] 加载项目Logo失败', error)
        projectLogoUrl.value = ''
      }
    } else {
      projectLogoUrl.value = ''
    }
    return
  }

  projectLogoUrl.value = logo
}

watch(
  () => props.project?.logo,
  () => {
    resolveProjectLogo()
  },
  { immediate: true }
)

const getFirstChar = (str) => {
  if (!str) return '💼'
  return str.charAt(0).toUpperCase()
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const handleTap = () => {
  emit('tap', props.project)
}

const handleConnect = () => {
  emit('connect', props.project)
}

const handleAuthorize = (e) => {
  emit('authorize', {
    project: props.project,
    detail: e.detail
  })
}

const handleDelete = () => {
  emit('delete', props.project)
}

const handleCopyUid = () => {
  const uid = props.project?.publisherUid
  if (!uid) {
    uni.showToast({
      title: '暂无UID',
      icon: 'none'
    })
    return
  }
  
  uni.setClipboardData({
    data: String(uid),
    success: () => {
      uni.showToast({
        title: 'UID已复制',
        icon: 'success'
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
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.project-card {
  position: relative;
  overflow: hidden;
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 260rpx;
    height: 260rpx;
    border-radius: 50%;
    filter: blur(30rpx);
    opacity: 0.6;
    pointer-events: none;
  }
  
  &::before {
    top: -120rpx;
    right: -60rpx;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.35), transparent 70%);
  }
  
  &::after {
    bottom: -140rpx;
    left: -40rpx;
    background: radial-gradient(circle, rgba(147, 51, 234, 0.25), transparent 65%);
  }
  
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 24rpx;
    margin-bottom: 32rpx;
    
    .project-symbol {
      width: 120rpx;
      height: 120rpx;
      position: relative;
      flex-shrink: 0;
      
      .project-logo {
        width: 100%;
        height: 100%;
        border-radius: 36rpx;
        object-fit: cover;
        box-shadow: inset 0 0 12rpx rgba(0, 0, 0, 0.12);
      }
      
      .symbol-core {
        width: 100%;
        height: 100%;
        border-radius: 36rpx;
        background: linear-gradient(135deg, #d8eafe, #f6f0ff);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        box-shadow: inset 0 0 20rpx rgba(59, 130, 246, 0.1);
      }
      
      .symbol-text {
        font-size: 52rpx;
        font-weight: 800;
        color: #3b82f6;
        letter-spacing: 2rpx;
        z-index: 1;
      }
      
      .symbol-glow {
        position: absolute;
        width: 160rpx;
        height: 80rpx;
        background: radial-gradient(circle, rgba(147, 51, 234, 0.2), transparent);
        bottom: -20rpx;
        left: 50%;
        transform: translateX(-50%);
        filter: blur(10rpx);
      }
    }
    
    .project-overview {
      flex: 1;
      overflow: hidden;
      
      .project-title-row {
        display: flex;
        align-items: center;
        gap: 12rpx;
        margin-bottom: 8rpx;
      }
      
      .project-title {
        display: block;
        font-size: 36rpx;
        font-weight: 700;
        color: $text-primary;
        flex: 1;
      }
      
      .meta-chip {
        padding: 8rpx 20rpx;
        border-radius: $radius-full;
        background: rgba(59, 130, 246, 0.1);
        font-size: $font-xs;
        color: $primary-blue;
        font-weight: 600;
        white-space: nowrap;
      }
      
      .project-summary {
        font-size: $font-sm;
        color: $text-secondary;
        line-height: 1.6;
        margin-bottom: 16rpx;
      }
      
      .project-overview-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;
        margin-bottom: 12rpx;
      }
      
      .overview-tag {
        padding: 6rpx 16rpx;
        border-radius: $radius-full;
        font-size: $font-xs;
        background: rgba(0, 0, 0, 0.04);
        color: $text-secondary;
      }
      
      .overview-tag--more {
        background: rgba(0, 0, 0, 0.08);
        color: $text-tertiary;
      }
      
      .project-date {
        font-size: $font-xs;
        color: $text-tertiary;
      }
    }
  }
  
  &__content {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-bottom: 24rpx;
    
    .project-field {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .field-label {
        font-size: $font-xs;
        color: $text-tertiary;
        font-weight: 500;
      }
      
      .field-value {
        font-size: $font-sm;
        color: $text-secondary;
        line-height: 1.6;
      }
    }

    .project-field--private {
      border: 1px dashed rgba(59, 130, 246, 0.2);
      border-radius: $radius-md;
      padding: 16rpx;
      background-color: rgba(59, 130, 246, 0.03);

      .private-meta {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: $font-xs;
        color: $text-secondary;
        margin-top: 6rpx;
      }

      .private-label {
        color: $text-tertiary;
      }

      .private-value {
        font-weight: 500;
      }
    }
    
    .project-tracks {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .track-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;
        
        .track-tag {
          padding: 8rpx 16rpx;
          background: rgba(59, 130, 246, 0.1);
          color: $primary-blue;
          font-size: $font-xs;
          border-radius: $radius-full;
          
          &.more {
            background: rgba(0, 0, 0, 0.05);
            color: $text-tertiary;
          }
        }
      }
    }
  }

  &__expand {
    display: flex;
    justify-content: flex-end;
    margin-top: 8rpx;

    .expand-button {
      font-size: $font-sm;
      color: $primary-blue;
      padding: 8rpx 16rpx;
      border-radius: $radius-full;
      background: rgba(59, 130, 246, 0.1);
    }
  }
  
  &__uid {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 16rpx;
  }
  
  .uid-label {
    font-size: $font-xs;
    color: $text-tertiary;
    letter-spacing: 1rpx;
  }
  
  .uid-value {
    font-size: 24rpx;
    color: $text-secondary;
    letter-spacing: 0.5rpx;
  }
  
  &__footer {
    padding-top: 24rpx;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    
    .project-card__actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
    }
    
    .project-card__native-button {
      width: 100%;
      height: 72rpx;
      padding: 0 32rpx;
      border-radius: $radius-full;
      border: none;
      background: linear-gradient(90deg, #3B82F6, #9333EA);
      color: #fff;
      font-size: $font-sm;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .project-card__button-text {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    
    .project-card__action-full {
      width: 100%;
    }
    
    :deep(.project-card__action-full) {
      width: 100%;
    }
    
  }
}
</style>

