import { isRef } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { DEFAULT_SHARE_IMAGE, buildCloudFilePath } from '@/utils/cloud-storage'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'

const DEFAULT_SHARE_TITLE = '你一个人的无限公司-Startupilot'
const DEFAULT_IMAGE = DEFAULT_SHARE_IMAGE || buildCloudFilePath('profile/分享的静态图片/大道至简.png')
const DEFAULT_SHARE_PATH = '/pages/index/index'

const unwrapValue = (value) => {
  if (typeof value === 'function') {
    try {
      return value()
    } catch (error) {
      return undefined
    }
  }
  return isRef(value) ? value.value : value
}

const ensurePath = (path) => {
  if (!path || typeof path !== 'string') {
    return DEFAULT_SHARE_PATH
  }
  const trimmed = path.trim()
  if (!trimmed) return DEFAULT_SHARE_PATH
  if (trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('pages/')) return `/${trimmed}`
  return trimmed
}

const getCurrentRoute = () => {
  if (typeof getCurrentPages === 'function') {
    const pages = getCurrentPages()
    const current = pages?.[pages.length - 1]
    if (current) {
      return current.route || current.$page?.fullPath || ''
    }
  }
  return ''
}

const serializeQuery = (query) => {
  const value = unwrapValue(query)
  if (!value) return ''
  if (typeof value === 'string') {
    return value.replace(/^\?/, '')
  }
  if (typeof value !== 'object') return ''
  const parts = Object.entries(value)
    .filter(([key, val]) => key && val !== undefined && val !== null && val !== '')
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
  return parts.join('&')
}

const trackShare = (eventName, payload = {}) => {
  if (typeof trackEvent === 'function' && TRACK_EVENTS[eventName]) {
    trackEvent(TRACK_EVENTS[eventName], payload)
  }
}

const buildShareConfig = (options = {}) => {
  const finalTitle = unwrapValue(options.title) || DEFAULT_SHARE_TITLE
  const basePathInput = unwrapValue(options.path) || getCurrentRoute()
  const basePath = ensurePath(basePathInput || DEFAULT_SHARE_PATH)
  const queryString = serializeQuery(unwrapValue(options.query))
  const finalPath = queryString ? `${basePath}${basePath.includes('?') ? '&' : '?'}${queryString}` : basePath
  const finalImage = unwrapValue(options.imageUrl) || unwrapValue(options.image) || DEFAULT_IMAGE

  return {
    finalTitle,
    finalPath,
    finalImage,
    finalQueryString: queryString
  }
}

export function useShare(options = {}) {
  const disabled = !!unwrapValue(options.disable || options.disabled)

  const ensureShareMenu = () => {
    if (typeof wx === 'undefined') return
    if (disabled && typeof wx.hideShareMenu === 'function') {
      wx.hideShareMenu()
      return
    }
    if (typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    }
  }

  onLoad(() => {
    ensureShareMenu()
  })

  onShareAppMessage((options) => {
    if (disabled) return {}
    const { finalTitle, finalPath, finalImage } = buildShareConfig(options)

    trackShare('SHARE_APP_MESSAGE', {
      from: options?.from || 'unknown',
      page: getCurrentRoute(),
      sharePath: finalPath,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      path: finalPath,
      imageUrl: finalImage
    }
  })

  onShareTimeline(() => {
    if (disabled) return {}
    const { finalTitle, finalImage, finalQueryString } = buildShareConfig(options)

    trackShare('SHARE_TIMELINE', {
      page: getCurrentRoute(),
      query: finalQueryString,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      query: finalQueryString,
      imageUrl: finalImage
    }
  })
}
