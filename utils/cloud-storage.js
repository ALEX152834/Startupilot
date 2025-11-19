import { logger } from './logger'

/**
 * 云存储资源配置
 * 所有静态资源的云存储 URL
 */

const DEFAULT_CLOUD_ENV_ID = 'cloud1-3gx5i5y8f78c0ac6'
const DEFAULT_CLOUD_BASE = `cloud://${DEFAULT_CLOUD_ENV_ID}.636c-${DEFAULT_CLOUD_ENV_ID}-1384942786`

let CLOUD_ENV = DEFAULT_CLOUD_ENV_ID
let CLOUD_BASE = DEFAULT_CLOUD_BASE

// #ifndef MP-WEIXIN
if (typeof process !== 'undefined' && process && process.env) {
  if (process.env.VITE_CLOUD_ENV_ID) {
    CLOUD_ENV = process.env.VITE_CLOUD_ENV_ID
  }
  if (process.env.VITE_CLOUD_RESOURCE_BASE) {
    CLOUD_BASE = process.env.VITE_CLOUD_RESOURCE_BASE
  } else {
    CLOUD_BASE = `cloud://${CLOUD_ENV}.636c-${CLOUD_ENV}-1384942786`
  }
}
// #endif

export const CLOUD_ENV_ID = CLOUD_ENV
export const CLOUD_RESOURCE_BASE = CLOUD_BASE

export const buildCloudFilePath = (relativePath = '') => {
  if (!relativePath) return CLOUD_BASE
  const normalized = relativePath.replace(/^\/+/, '')
  return `${CLOUD_BASE}/${normalized}`
}

export const DEFAULT_SHARE_IMAGE = buildCloudFilePath('profile/分享的静态图片/大道至简.png')

/**
 * 云存储资源路径配置
 */
export const CLOUD_STORAGE = {
  // TabBar 图标（必须使用本地路径，不能用云存储）
  tabbar: {
    home: '/static/tabbar/home.png',
    homeActive: '/static/tabbar/home-active.png',
    learning: '/static/tabbar/learning.png',
    learningActive: '/static/tabbar/learning-active.png',
    projects: '/static/tabbar/projects.png',
    projectsActive: '/static/tabbar/projects-active.png',
    profile: '/static/tabbar/profile.png',
    profileActive: '/static/tabbar/profile-active.png'
  },

  // Profile 页面图标（云存储）
  profile: {
    favorites: buildCloudFilePath('profile/profile/我的收藏.png'),
    posts: buildCloudFilePath('profile/profile/我的发布.png'),
    registrations: buildCloudFilePath('profile/profile/我的报名.png'),
    contact: buildCloudFilePath('profile/profile/联系我们.png'),
    settings: buildCloudFilePath('profile/profile/官方公众号.png'),
    logout: buildCloudFilePath('profile/profile/退出登录.png')
  },

  // PDF 文档（请将 PDF 上传后填入路径）
  documents: {
    privacyPolicy: buildCloudFilePath('profile/隐私与用户政策文档/隐私政策1117.pdf'),
    userAgreement: buildCloudFilePath('profile/隐私与用户政策文档/用户协议1117.pdf')
  },

  // 关于我们图片（云存储 - 使用你提供的实际地址）
  about: [
    buildCloudFilePath('profile/about/about-1.png'),
    buildCloudFilePath('profile/about/about-2.png'),
    buildCloudFilePath('profile/about/about-3.png'),
    buildCloudFilePath('profile/about/about-4.png')
  ]
}

/**
 * 获取云存储文件的临时链接（带图片处理样式）
 * @param {string} fileID - 云存储文件ID
 * @param {string} styleName - 图片处理样式名称（默认：jianjin）
 * @param {number} size - 图片尺寸（可选，单位：px）
 * @returns {Promise<string>}
 */
export async function getTempFileURL(fileID, styleName = 'jianjin', size = null) {
  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    if (res.fileList && res.fileList.length > 0) {
      const tempURL = res.fileList[0].tempFileURL
      // 如果指定了尺寸，使用多种可能的图片处理参数格式
      if (size) {
        // 尝试多种格式，确保兼容性
        // 格式1: 腾讯云 COS 标准格式
        return `${tempURL}?imageView2/1/w/${size}/h/${size}`
      }
      // 否则使用样式名称
      return `${tempURL}/${styleName}`
    }
    return fileID
  } catch (error) {
    logger.error('[cloudStorage.getTempFileURL] 获取临时链接失败', error)
    return fileID
  }
}

/**
 * 批量获取云存储文件的临时链接（带图片处理样式）
 * @param {string[]} fileIDs - 云存储文件ID数组
 * @param {string} styleName - 图片处理样式名称（默认：jianjin）
 * @returns {Promise<string[]>}
 */
export async function getTempFileURLs(fileIDs, styleName = 'jianjin') {
  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: fileIDs
    })
    if (res.fileList && res.fileList.length > 0) {
      return res.fileList.map(item => `${item.tempFileURL}/${styleName}`)
    }
    return fileIDs
  } catch (error) {
    logger.error('[cloudStorage.getTempFileURLs] 批量获取临时链接失败', error)
    return fileIDs
  }
}

/**
 * 将 cloud:// 格式转换为带样式的临时链接
 * @param {string} cloudURL - cloud:// 格式的URL
 * @param {string} styleName - 图片处理样式名称（默认：jianjin）
 * @returns {Promise<string>}
 */
export async function getStyledImageURL(cloudURL, styleName = 'jianjin') {
  if (!cloudURL || !cloudURL.startsWith('cloud://')) {
    return cloudURL
  }
  return await getTempFileURL(cloudURL, styleName)
}
