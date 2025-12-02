import { isRef } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { DEFAULT_SHARE_IMAGE, buildCloudFilePath, getTempFileURL, getCdnUrl } from '@/utils/cloud-storage'
import { DEFAULT_SHARE_TITLE as PRESET_SHARE_TITLE } from '@/utils/share-presets'
import { logger } from '@/utils/logger'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'

const DEFAULT_SHARE_TITLE = PRESET_SHARE_TITLE || '创业者-赋能社群'
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

const logShareFallback = (message, detail = {}) => {
  if (logger && typeof logger.warn === 'function') {
    logger.warn(`[useShare] ${message}`, detail)
  } else if (typeof console !== 'undefined') {
    console.warn(`[useShare] ${message}`, detail)
  }
}

const trackShare = (eventName, payload = {}) => {
  if (typeof trackEvent === 'function' && TRACK_EVENTS[eventName]) {
    trackEvent(TRACK_EVENTS[eventName], payload)
  }
}

const buildShareConfig = (options = {}, resolvedImage) => {
  const unwrappedTitle = unwrapValue(options.title)
  const finalTitle = unwrappedTitle || DEFAULT_SHARE_TITLE

  if (!unwrappedTitle) {
    logShareFallback('Missing share title, fallback to default', { requestedPath: options.path })
  }

  const basePathInput = unwrapValue(options.path) || getCurrentRoute() || DEFAULT_SHARE_PATH
  const basePath = ensurePath(basePathInput)
  if (!options.path && basePath === DEFAULT_SHARE_PATH) {
    logShareFallback('Missing share path, fallback to default', { requestedPath: options.path })
  }

  const queryString = serializeQuery(unwrapValue(options.query))
  const finalPath = queryString ? `${basePath}${basePath.includes('?') ? '&' : '?'}${queryString}` : basePath
  const unwrappedImage = resolvedImage || unwrapValue(options.imageUrl) || unwrapValue(options.image)
  const finalImage = unwrappedImage || DEFAULT_IMAGE

  if (!unwrappedImage) {
    logShareFallback('Missing share image, fallback to default', { title: finalTitle, path: finalPath })
  }

  return {
    finalTitle,
    finalPath,
    finalImage,
    finalQueryString: queryString
  }
}

export function useShare(options = {}) {
  const disabled = !!unwrapValue(options.disable || options.disabled)
  let prefetchedShareImage = unwrapValue(options.imageUrl) || unwrapValue(options.image) || null

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

  const prefetchShareImage = async () => {
    try {
      const rawImage = unwrapValue(options.imageUrl) || unwrapValue(options.image)
      if (!rawImage) return
      prefetchedShareImage = rawImage
      if (typeof rawImage === 'string' && rawImage.startsWith('cloud://')) {
        const tempURL = await getTempFileURL(rawImage, null)
        if (tempURL) {
          prefetchedShareImage = tempURL
        }
      }
      if (typeof rawImage === 'string' && !rawImage.startsWith('http')) {
        prefetchedShareImage = getCdnUrl(rawImage)
      }
    } catch (error) {
      logShareFallback('Prefetch share image failed', { error })
    }
  }

  const resolveShareImage = () => {
    const latestImage = unwrapValue(options.imageUrl) || unwrapValue(options.image)
    const prefetchedIsCloud = typeof prefetchedShareImage === 'string' && prefetchedShareImage.startsWith('cloud://')
    const latestIsHttp = typeof latestImage === 'string' && !latestImage.startsWith('cloud://')

    if (prefetchedIsCloud && latestIsHttp) {
      return latestImage
    }

    return prefetchedShareImage || latestImage
  }

  onLoad(() => {
    ensureShareMenu()
    prefetchShareImage()
  })

  onShareAppMessage((event) => {
    if (disabled) return {}
    const resolvedImage = resolveShareImage()
    // 如果已经是http/https URL，直接使用；否则转换为CDN URL
    const finalImage = (typeof resolvedImage === 'string' && !resolvedImage.startsWith('http'))
      ? getCdnUrl(resolvedImage)
      : resolvedImage
    const { finalTitle, finalPath, finalImage: computedImage } = buildShareConfig(
      { ...options, imageUrl: finalImage },
      finalImage
    )

    trackShare('SHARE_APP_MESSAGE', {
      from: event?.from || 'unknown',
      page: getCurrentRoute(),
      sharePath: finalPath,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      path: finalPath,
      imageUrl: computedImage
    }
  })

  onShareTimeline(() => {
    if (disabled) return {}
    const resolvedImage = resolveShareImage()
    // 如果已经是http/https URL，直接使用；否则转换为CDN URL
    const finalImage = (typeof resolvedImage === 'string' && !resolvedImage.startsWith('http'))
      ? getCdnUrl(resolvedImage)
      : resolvedImage
    const { finalTitle, finalImage: computedImage, finalQueryString } = buildShareConfig(
      { ...options, imageUrl: finalImage },
      finalImage
    )

    trackShare('SHARE_TIMELINE', {
      page: getCurrentRoute(),
      query: finalQueryString,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      query: finalQueryString,
      imageUrl: computedImage
    }
  })
}
