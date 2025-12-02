import { logger } from './logger'

/**
 * 云存储资源配置
 * 所有静态资源的云存储 URL
 */

const DEFAULT_CLOUD_ENV_ID = 'cloud1-3gx5i5y8f78c0ac6'
const DEFAULT_CLOUD_BASE = `cloud://${DEFAULT_CLOUD_ENV_ID}.636c-${DEFAULT_CLOUD_ENV_ID}-1384942786`
const CDN_BASE_URL = 'https://636c-cloud1-3gx5i5y8f78c0ac6-1384942786.tcb.qcloud.la'

let CLOUD_ENV = DEFAULT_CLOUD_ENV_ID
let CLOUD_BASE = DEFAULT_CLOUD_BASE

const tempUrlCache = new Map()
const STORAGE_CACHE_KEY = 'cloud_temp_url_cache_v1'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h 有效期，避免频繁走云端接口
let storageCacheLoaded = false
let storageCache = {}

const buildCacheKey = (fileID, styleName, size) => `${fileID}::${styleName || ''}::${size || ''}`

const buildProcessedURL = (tempFileURL, styleName = null, size = null) => {
  if (!tempFileURL) return tempFileURL
  if (size) {
    return `${tempFileURL}?imageView2/1/w/${size}/h/${size}`
  }
  if (!styleName) {
    return tempFileURL
  }
  return `${tempFileURL}/${styleName}`
}

export const getCdnUrl = (cloudPath = '') => {
  if (!cloudPath) return cloudPath
  if (/^https?:\/\//i.test(cloudPath)) {
    return cloudPath
  }
  const stripped = cloudPath
    .replace(/^cloud:\/\/[^/]+\/?/, '')
    .replace(/^\/+/, '')

  // 对路径的每个部分进行编码，避免中文字符问题
  const encodedPath = stripped.split('/').map(part => encodeURIComponent(part)).join('/')
  return `${CDN_BASE_URL}/${encodedPath}`
}

const canUseStorage = () => (
  typeof uni !== 'undefined' &&
  typeof uni.getStorageSync === 'function' &&
  typeof uni.setStorageSync === 'function'
)

const ensureStorageCacheLoaded = () => {
  if (storageCacheLoaded) return
  storageCacheLoaded = true
  if (!canUseStorage()) {
    storageCache = {}
    return
  }
  try {
    const saved = uni.getStorageSync(STORAGE_CACHE_KEY)
    if (saved && typeof saved === 'object') {
      storageCache = saved
    } else {
      storageCache = {}
    }
  } catch (error) {
    storageCache = {}
    logger.warn?.('[cloudStorage] 读取本地缓存失败', error)
  }
}

const persistStorageCache = () => {
  if (!canUseStorage()) return
  try {
    uni.setStorageSync(STORAGE_CACHE_KEY, storageCache)
  } catch (error) {
    logger.warn?.('[cloudStorage] 写入本地缓存失败', error)
  }
}

const getCachedURL = (cacheKey) => {
  if (tempUrlCache.has(cacheKey)) {
    return tempUrlCache.get(cacheKey)
  }
  ensureStorageCacheLoaded()
  const record = storageCache[cacheKey]
  if (!record || !record.url) return null
  if (record.expiresAt && record.expiresAt < Date.now()) {
    delete storageCache[cacheKey]
    persistStorageCache()
    return null
  }
  tempUrlCache.set(cacheKey, record.url)
  return record.url
}

const saveURLToCache = (cacheKey, url) => {
  tempUrlCache.set(cacheKey, url)
  ensureStorageCacheLoaded()
  if (!url) {
    delete storageCache[cacheKey]
  } else {
    storageCache[cacheKey] = {
      url,
      expiresAt: Date.now() + CACHE_TTL
    }
  }
  persistStorageCache()
}

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

export const DEFAULT_SHARE_IMAGE = getCdnUrl('profile/分享的静态图片/大道至简.png')

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
    favorites: getCdnUrl('profile/profile/我的收藏.png'),
    posts: getCdnUrl('profile/profile/我的发布.png'),
    registrations: getCdnUrl('profile/profile/我的报名.png'),
    contact: getCdnUrl('profile/profile/联系我们.png'),
    settings: getCdnUrl('profile/profile/官方公众号.png'),
    logout: getCdnUrl('profile/profile/退出登录.png')
  },

  // PDF 文档（请将 PDF 上传后填入路径）
  documents: {
    privacyPolicy: getCdnUrl('profile/隐私与用户政策文档/隐私政策1117.pdf'),
    userAgreement: getCdnUrl('profile/隐私与用户政策文档/用户协议1117.pdf')
  },

  // 关于我们图片（云存储 - 使用你提供的实际地址）
  about: [
    getCdnUrl('profile/about/about-1.png'),
    getCdnUrl('profile/about/about-2.png'),
    getCdnUrl('profile/about/about-3.png'),
    getCdnUrl('profile/about/about-4.png')
  ]
}

/**
 * 获取云存储文件的临时链接（带图片处理样式）
 * @param {string} fileID - 云存储文件ID
 * @param {string} styleName - 图片处理样式名称（默认：不处理）
 * @param {number} size - 图片尺寸（可选，单位：px）
 * @returns {Promise<string>}
 */
export async function getTempFileURL(fileID, styleName = null, size = null) {
  if (!fileID) return fileID
  const cacheKey = buildCacheKey(fileID, styleName, size)
  const cached = getCachedURL(cacheKey)
  if (cached) return cached
  try {
    if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
      saveURLToCache(cacheKey, fileID)
      return fileID
    }
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    if (res.fileList && res.fileList.length > 0) {
      const tempURL = res.fileList[0].tempFileURL
      const processedURL = buildProcessedURL(tempURL, styleName, size)
      saveURLToCache(cacheKey, processedURL)
      return processedURL
    }
    saveURLToCache(cacheKey, fileID)
    return fileID
  } catch (error) {
    logger.error('[cloudStorage.getTempFileURL] 获取临时链接失败', error)
    saveURLToCache(cacheKey, fileID)
    return fileID
  }
}

/**
 * 批量获取云存储文件的临时链接（带图片处理样式）
 * @param {string[]} fileIDs - 云存储文件ID数组
 * @param {string} styleName - 图片处理样式名称（默认：不处理）
 * @returns {Promise<string[]>}
 */
export async function getTempFileURLs(fileIDs, styleName = null) {
  if (!Array.isArray(fileIDs) || fileIDs.length === 0) {
    return fileIDs
  }

  const results = new Array(fileIDs.length)
  const missingIndexesById = new Map()

  fileIDs.forEach((fileID, index) => {
    if (!fileID) {
      results[index] = fileID
      return
    }
    const cacheKey = buildCacheKey(fileID, styleName)
    const cached = getCachedURL(cacheKey)
    if (cached) {
      results[index] = cached
      return
    }
    if (!missingIndexesById.has(fileID)) {
      missingIndexesById.set(fileID, [])
    }
    missingIndexesById.get(fileID).push(index)
  })

  // 如果都在缓存里，直接返回
  if (missingIndexesById.size === 0) {
    return results
  }

  try {
    if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
      missingIndexesById.forEach((indexes, fileID) => {
        const fallback = fileID
        const cacheKey = buildCacheKey(fileID, styleName)
        saveURLToCache(cacheKey, fallback)
        indexes.forEach(idx => {
          results[idx] = fallback
        })
      })
      return results
    }

    const uniqueFileIDs = Array.from(missingIndexesById.keys())
    const res = await wx.cloud.getTempFileURL({
      fileList: uniqueFileIDs
    })

    const tempURLMap = new Map(
      (res.fileList || []).map(item => [item.fileID, item.tempFileURL])
    )

    missingIndexesById.forEach((indexes, fileID) => {
      const tempURL = tempURLMap.get(fileID)
      const finalURL = buildProcessedURL(tempURL, styleName) || fileID
      const cacheKey = buildCacheKey(fileID, styleName)
      saveURLToCache(cacheKey, finalURL)
      indexes.forEach(idx => {
        results[idx] = finalURL
      })
    })

    return results
  } catch (error) {
    logger.error('[cloudStorage.getTempFileURLs] 批量获取临时链接失败', error)
    missingIndexesById.forEach((indexes, fileID) => {
      const cacheKey = buildCacheKey(fileID, styleName)
      saveURLToCache(cacheKey, fileID)
      indexes.forEach(idx => {
        results[idx] = fileID
      })
    })
    return results
  }
}

/**
 * 将 cloud:// 格式转换为带样式的临时链接
 * @param {string} cloudURL - cloud:// 格式的URL
 * @param {string} styleName - 图片处理样式名称（默认：不处理）
 * @returns {Promise<string>}
 */
export async function getStyledImageURL(cloudURL, styleName = null) {
  if (!cloudURL || !cloudURL.startsWith('cloud://')) {
    return cloudURL
  }
  return await getTempFileURL(cloudURL, styleName)
}
