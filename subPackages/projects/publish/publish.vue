<template>
  <view class="publish-page">
    <scroll-view class="form-container" scroll-y>
      <view class="form-content">
        <!-- 项目 Logo -->
        <view class="form-group">
          <text class="form-label">项目 Logo *</text>
          <view class="logo-upload">
            <view 
              v-if="formData.logo" 
              class="logo-preview"
            >
              <image :src="formData.logo" mode="aspectFill" class="logo-image" lazy-load="true" />
              <view class="logo-actions">
                <text 
                  class="logo-action" 
                  :class="{ 'logo-action--disabled': uploadingLogo }"
                  @tap="chooseLogo"
                >
                  {{ uploadingLogo ? '上传中...' : '重新上传' }}
                </text>
                <text 
                  class="logo-action" 
                  :class="{ 'logo-action--disabled': uploadingLogo }"
                  @tap="editLogo"
                >
                  裁剪
                </text>
                <text class="logo-action logo-action--danger" @tap="removeLogo">删除</text>
              </view>
            </view>
            <view 
              v-else 
              class="logo-placeholder"
              :class="{ 'logo-placeholder--loading': uploadingLogo }"
              @tap="chooseLogo"
            >
              <text class="logo-icon">{{ uploadingLogo ? '⏳' : '📁' }}</text>
              <text class="logo-text">{{ uploadingLogo ? '上传中...' : '上传项目 Logo' }}</text>
              <text class="logo-hint">建议1:1，PNG/JPG ≤ 2MB</text>
            </view>
          </view>
        </view>
        
        <!-- 项目名称 -->
        <view class="form-group">
          <text class="form-label">项目名称 *</text>
          <input 
            :value="formData.projectName"
            @input="formData.projectName = $event.detail.value"
            class="form-input"
            placeholder="请输入项目名称"
            placeholder-class="input-placeholder"
            maxlength="50"
          />
        </view>
        
        <!-- 已注册主体 -->
        <view class="form-group">
          <text class="form-label">已注册主体 *</text>
          <input 
            :value="formData.registeredEntity"
            @input="formData.registeredEntity = $event.detail.value"
            class="form-input"
            placeholder="请输入已注册主体"
            placeholder-class="input-placeholder"
            maxlength="50"
          />
        </view>
        
        <!-- 一句话介绍 -->
        <view class="form-group">
          <text class="form-label">一句话介绍 *</text>
          <textarea 
            :value="formData.oneLiner"
            @input="formData.oneLiner = $event.detail.value"
            class="form-textarea"
            placeholder="用一句话描述您的项目"
            placeholder-class="textarea-placeholder"
            maxlength="100"
            :auto-height="false"
          />
          <text class="char-count">{{ formData.oneLiner.length }}/100</text>
        </view>
        
        <!-- 项目赛道 -->
        <view class="form-group">
          <text class="form-label">项目赛道 * (可多选)</text>
          <view class="track-grid">
            <view 
              v-for="track in trackOptions" 
              :key="track"
              class="track-item"
              :class="{ 'track-item--selected': formData.track.includes(track) }"
              @tap="toggleTrack(track)"
            >
              <text class="track-checkbox" :class="{ 'track-checkbox--checked': formData.track.includes(track) }">
                {{ formData.track.includes(track) ? '✓' : '' }}
              </text>
              <text class="track-text">{{ track }}</text>
            </view>
          </view>
        </view>
        
        <!-- 项目介绍 -->
        <view class="form-group">
          <text class="form-label">项目介绍 *</text>
          <textarea 
            :value="formData.introduction"
            @input="formData.introduction = $event.detail.value"
            class="form-textarea large"
            placeholder="详细介绍您的项目"
            placeholder-class="textarea-placeholder"
            maxlength="500"
            :auto-height="false"
          />
          <text class="char-count">{{ formData.introduction.length }}/500</text>
        </view>

        <!-- 合作诉求 -->
        <view class="form-group">
          <text class="form-label">合作诉求 *</text>
          <textarea 
            :value="formData.description"
            @input="formData.description = $event.detail.value"
            class="form-textarea medium"
            placeholder="介绍您希望获得的资源、投资或合作形式"
            placeholder-class="textarea-placeholder"
            maxlength="500"
            :auto-height="false"
          />
          <text class="char-count">{{ formData.description.length }}/500</text>
        </view>
        
        <!-- 核心竞争力 -->
        <view class="form-group">
          <text class="form-label">核心竞争力 *</text>
          <textarea 
            :value="formData.coreCompetitiveness"
            @input="formData.coreCompetitiveness = $event.detail.value"
            class="form-textarea medium"
            placeholder="请描述您的核心竞争力"
            placeholder-class="textarea-placeholder"
            maxlength="300"
            :auto-height="false"
          />
        </view>
        
        <!-- 项目类别 -->
        <view class="form-group">
          <text class="form-label">项目类别 *</text>
          <view class="radio-group">
            <view 
              v-for="category in categoryOptions" 
              :key="category.value"
              class="radio-item"
              :class="{ 'radio-item--selected': formData.category === category.value }"
              @tap="formData.category = category.value"
            >
              <text class="radio-icon">{{ formData.category === category.value ? '●' : '○' }}</text>
              <text class="radio-label">{{ category.label }}</text>
            </view>
          </view>
        </view>
        
        <!-- 项目标签 -->
        <view class="form-group">
          <text class="form-label">项目标签 *</text>
          <view class="tag-input">
            <input 
              :value="currentTag"
              @input="currentTag = $event.detail.value"
              class="tag-input-field"
              placeholder="请输入标签"
              placeholder-class="input-placeholder"
              maxlength="10"
              @confirm="addTag"
            />
            <glass-button size="small" @tap="addTag">添加</glass-button>
          </view>
          <view v-if="formData.tags.length > 0" class="tag-list">
            <view 
              v-for="(tag, index) in formData.tags" 
              :key="index"
              class="tag-item"
            >
              <text class="tag-text">{{ tag }}</text>
              <text class="tag-remove" @tap="removeTag(index)">✕</text>
            </view>
          </view>
        </view>
        
        <!-- 提交按钮 -->
        <glass-button
          class="submit-button"
          type="primary"
          block
          :loading="submitting"
          @tap="handleSubmit"
        >
          提交发布
        </glass-button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useProjectStore } from '@/store/project'
import { validateProjectForm } from '@/utils/validator'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS, PROJECT_TRACKS } from '@/utils/constants'
import { logger } from '@/utils/logger'
import GlassButton from '@/components/glass-button/glass-button.vue'

const projectStore = useProjectStore()

const trackOptions = PROJECT_TRACKS

const categoryOptions = [
  { label: '项目合作', value: '项目合作' },
  { label: '融资需求', value: '融资需求' },
  { label: '其他', value: '其他' }
]

const formData = reactive({
  logo: '',
  projectName: '',
  registeredEntity: '',
  oneLiner: '',
  track: [],
  introduction: '',
  description: '',
  coreCompetitiveness: '',
  category: '',
  tags: []
})

const currentTag = ref('')
const submitting = ref(false)
const uploadingLogo = ref(false)

// 切换赛道选择
const toggleTrack = (track) => {
  const index = formData.track.indexOf(track)
  if (index > -1) {
    formData.track.splice(index, 1)
  } else {
    formData.track.push(track)
  }
}

// 添加标签
const addTag = () => {
  const tag = currentTag.value.trim()
  if (!tag) return
  
  if (formData.tags.includes(tag)) {
    uni.showToast({
      title: '标签已存在',
      icon: 'none'
    })
    return
  }
  
  if (formData.tags.length >= 5) {
    uni.showToast({
      title: '最多添加5个标签',
      icon: 'none'
    })
    return
  }
  
  formData.tags.push(tag)
  currentTag.value = ''
}

// 删除标签
const removeTag = (index) => {
  formData.tags.splice(index, 1)
}

// 上传 Logo
const chooseLogo = () => {
  if (uploadingLogo.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const filePath = res.tempFilePaths && res.tempFilePaths[0]
      if (filePath) {
        openLogoCropper(filePath)
      }
    }
  })
}

const openLogoCropper = (filePath) => {
  if (!filePath) return
  if (typeof wx === 'undefined' || typeof wx.cropImage !== 'function') {
    uploadLogo(filePath)
    return
  }
  
  wx.cropImage({
    src: filePath,
    cropScale: '1:1',
    success: (res) => {
      const target = res.tempFilePath || (res.tempFilePaths && res.tempFilePaths[0])
      uploadLogo(target || filePath)
    },
    fail: (error) => {
      logger.error('[publish] 裁剪Logo失败', error)
      uploadLogo(filePath)
    }
  })
}

const uploadLogo = async (filePath) => {
  if (!filePath) return
  if (typeof wx === 'undefined' || !wx.cloud) {
    uni.showToast({
      title: '请在微信内上传Logo',
      icon: 'none'
    })
    return
  }
  
  uploadingLogo.value = true
  let uploadLoadingVisible = false
  const hideUploadLoading = () => {
    if (uploadLoadingVisible) {
      uploadLoadingVisible = false
      uni.hideLoading()
    }
  }
  uni.showLoading({
    title: '上传中...',
    mask: true,
    success: () => {
      uploadLoadingVisible = true
    },
    fail: () => {
      uploadLoadingVisible = false
    }
  })
  
  try {
    const extMatch = filePath.match(/\.[^.]+$/)
    const ext = extMatch ? extMatch[0] : '.png'
    const cloudPath = `projects/logos/${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`
    
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    
    formData.logo = uploadRes.fileID
    uni.showToast({
      title: '上传成功',
      icon: 'success'
    })
  } catch (error) {
    logger.error('[publish] 上传Logo失败', error)
    uni.showToast({
      title: '上传失败，请重试',
      icon: 'none'
    })
  } finally {
    uploadingLogo.value = false
    hideUploadLoading()
  }
}

const removeLogo = () => {
  formData.logo = ''
}

const editLogo = async () => {
  if (uploadingLogo.value || !formData.logo) return
  let editLogoLoadingVisible = false
  const hideEditLogoLoading = () => {
    if (editLogoLoadingVisible) {
      editLogoLoadingVisible = false
      uni.hideLoading()
    }
  }

  try {
    let tempPath = formData.logo
    if (formData.logo.startsWith('cloud://')) {
      uni.showLoading({
        title: '载入Logo...',
        mask: true,
        success: () => {
          editLogoLoadingVisible = true
        },
        fail: () => {
          editLogoLoadingVisible = false
        }
      })
      const downloadRes = await wx.cloud.downloadFile({
        fileID: formData.logo
      })
      tempPath = downloadRes.tempFilePath
      hideEditLogoLoading()
    }
    openLogoCropper(tempPath)
  } catch (error) {
    logger.error('加载Logo失败:', error)
    hideEditLogoLoading()
    uni.showToast({
      title: '加载Logo失败',
      icon: 'none'
    })
  }
}

// 提交发布
const handleSubmit = async () => {
  // 防止重复提交
  if (submitting.value) {
    logger.log('正在提交中，忽略重复点击')
    return
  }
  
  logger.log('开始提交，表单数据:', formData)
  
  // 表单验证
  const validation = validateProjectForm(formData)
  logger.log('验证结果:', validation)
  
  if (!validation.valid) {
    uni.showToast({
      title: validation.message,
      icon: 'none',
      duration: 3000
    })
    return
  }
  
  submitting.value = true
  
  try {
    const result = await projectStore.publishProject({
      ...formData,
      title: formData.projectName,  // title和projectName保持一致
      description: formData.description  // description 使用单独的合作诉求描述
    })
    
    logger.log('发布成功:', result)
    
    // 数据埋点
    trackEvent(TRACK_EVENTS.PROJECT_PUBLISH, {
      category: formData.category,
      trackCount: formData.track.length
    })
    
    // 返回项目列表页
    uni.switchTab({
      url: '/pages/projects/projects'
    })
  } catch (error) {
    logger.error('发布失败:', error)
    uni.showToast({
      title: error.message || '发布失败，请重试',
      icon: 'none',
      duration: 3000
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.publish-page {
  min-height: 100vh;
  background: $bg-color;
}

.form-container {
  height: 100vh;
}

.form-content {
  padding: $spacing-lg;
  
  .form-group {
    margin-bottom: 48rpx;
    
    .form-label {
      display: block;
      font-size: $font-base;
      font-weight: 500;
      color: $text-primary;
      margin-bottom: 16rpx;
    }
    
    .logo-upload {
      display: flex;
      flex-direction: column;
      gap: 16rpx;
    }
    
    .logo-placeholder,
    .logo-preview {
      width: 40%;
      aspect-ratio: 1 / 1;
      border-radius: $radius-md;
      border: 2px dashed rgba(17, 24, 39, 0.15) !important;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32rpx;
      box-sizing: border-box;
    }
    
    .logo-placeholder--loading {
      opacity: 0.6;
    }
    
    .logo-icon {
      font-size: 56rpx;
      margin-bottom: 12rpx;
    }
    
    .logo-text {
      font-size: $font-base;
      color: $text-primary;
      font-weight: 500;
    }
    
    .logo-hint {
      font-size: $font-xs;
      color: $text-tertiary;
      margin-top: 8rpx;
    }
    
    .logo-preview {
      border-style: solid;
      padding: 0;
      overflow: hidden;
    }
    
    .logo-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .logo-actions {
      display: flex;
      justify-content: flex-end;
      gap: 24rpx;
      padding: 20rpx 24rpx;
    }
    
    .logo-action {
      font-size: $font-sm;
      color: $primary-blue;
    }
    
    .logo-action--danger {
      color: #EF4444;
    }
    
    .logo-action--disabled {
      opacity: 0.6;
    }
    
    .form-input,
    .form-textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(17, 24, 39, 0.1) !important;
      border-radius: $radius-md;
      font-size: $font-base;
      color: $text-primary;
      transition: all 0.2s ease;
      box-sizing: border-box;
      
      &:focus {
        border-color: $primary-blue !important;
        background: #fff;
      }
    }
    
    .form-input {
      height: 96rpx;
      line-height: 96rpx;
      padding: 0 24rpx;
    }
    
    .form-textarea {
      height: 160rpx;
      padding: 20rpx 24rpx;
      line-height: 1.5;
      
      &.medium {
        height: 240rpx;
      }
      
      &.large {
        height: 360rpx;
      }
    }
    
    .char-count {
      display: block;
      text-align: right;
      font-size: $font-xs;
      color: $text-tertiary;
      margin-top: 8rpx;
    }
    
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 16rpx;
      
      .radio-item {
        display: flex;
        align-items: center;
        gap: 12rpx;
        padding: 20rpx;
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #D1D5DB !important;
        border-radius: $radius-md;
        transition: all 0.2s ease;
        box-sizing: border-box;
        
        .radio-icon {
          font-size: 32rpx;
          color: $text-tertiary;
          flex-shrink: 0;
        }
        
        .radio-label {
          font-size: $font-base;
          color: $text-primary;
        }
        
        &--selected {
          background: rgba(59, 130, 246, 0.1) !important;
          border-color: $primary-blue !important;
          
          .radio-icon {
            color: $primary-blue;
          }
          
          .radio-label {
            font-weight: 500;
          }
        }
        
        &:active {
          background: rgba(59, 130, 246, 0.1);
        }
      }
    }
    
    .track-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      
      .track-item {
        display: flex;
        align-items: center;
        gap: 12rpx;
        padding: 18rpx 24rpx !important;
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #D1D5DB !important;
        border-radius: $radius-md;
        transition: all 0.2s ease;
        box-sizing: border-box !important;
        
        .track-checkbox {
          width: 32rpx;
          height: 32rpx;
          border: 2px solid #D1D5DB;
          border-radius: 6rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24rpx;
          color: transparent;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-sizing: border-box;
          
          &--checked {
            background: $primary-blue;
            border-color: $primary-blue;
            color: #fff;
          }
        }
        
        .track-text {
          font-size: $font-sm;
          color: $text-primary;
          white-space: nowrap;
        }
        
        &--selected {
          background: rgba(59, 130, 246, 0.1) !important;
          border-color: $primary-blue !important;
          
          .track-text {
            font-weight: 500;
          }
        }
      }
    }
    
    .tag-input {
      display: flex;
      align-items: stretch;
      gap: 16rpx;
      margin-bottom: 16rpx;
      
      .tag-input-field {
        flex: 1;
        height: 88rpx;
        line-height: 88rpx;
        padding: 0 24rpx;
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #000000 !important;
        border-radius: $radius-md;
        font-size: $font-base;
        box-sizing: border-box;
        
        &:focus {
          border-color: $primary-blue !important;
        }
      }
      
      // 确保按钮与输入框高度一致
      ::v-deep .glass-button {
        height: 88rpx !important;
        min-height: 88rpx !important;
        padding: 0 32rpx !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }
    
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      
      .tag-item {
        display: flex;
        align-items: center;
        gap: 12rpx;
        padding: 12rpx 24rpx;
        background: rgba(147, 51, 234, 0.1);
        color: $primary-purple;
        border-radius: $radius-full;
        
        .tag-text {
          font-size: $font-sm;
        }
        
        .tag-remove {
          font-size: 24rpx;
        }
      }
    }
  }
  
  .submit-button {
    margin-top: 32rpx;
  }
}

// Placeholder 样式类
.input-placeholder {
  color: #9CA3AF !important;
  font-size: 32rpx !important;
  line-height: 96rpx !important;
}

.textarea-placeholder {
  color: #9CA3AF !important;
  font-size: 32rpx !important;
  line-height: 1.5 !important;
}
</style>

