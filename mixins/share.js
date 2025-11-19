import { isRef } from 'vue'
import { DEFAULT_SHARE_IMAGE, buildCloudFilePath } from '@/utils/cloud-storage'
import { trackEvent } from '@/utils/auth'
import { TRACK_EVENTS } from '@/utils/constants'

const DEFAULT_SHARE_TITLE = '你一个人的无限公司-Startupilot'
const DEFAULT_IMAGE = DEFAULT_SHARE_IMAGE || buildCloudFilePath('profile/分享的静态图片/大道至简.png')
const DEFAULT_SHARE_PATH = '/pages/index/index'

const unwrapValue = (value) => (isRef(value) ? value.value : value)

const resolveField = (context, propName, getterName) => {
  if (getterName && typeof context?.[getterName] === 'function') {
    return unwrapValue(context[getterName]())
  }
  if (propName && context && Object.prototype.hasOwnProperty.call(context, propName)) {
    return unwrapValue(context[propName])
  }
  return undefined
}

const ensurePath = (path) => {
  if (!path || typeof path !== 'string') {
    return DEFAULT_SHARE_PATH
  }
  const trimmed = path.trim()
  if (!trimmed) {
    return DEFAULT_SHARE_PATH
  }
  if (trimmed.startsWith('/')) {
    return trimmed
  }
  if (trimmed.startsWith('pages/')) {
    return `/${trimmed}`
  }
  return trimmed
}

const serializeQuery = (query) => {
  const value = unwrapValue(query)
  if (!value) return ''
  if (typeof value === 'string') {
    return value.replace(/^\?/, '')
  }
  if (typeof value !== 'object') {
    return ''
  }
  const parts = Object.entries(value)
    .filter(([key, val]) => key && val !== undefined && val !== null && val !== '')
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
  return parts.join('&')
}

const buildShareConfig = (context) => {
  const finalTitle = resolveField(context, 'shareTitle', 'getShareTitle') || DEFAULT_SHARE_TITLE
  const basePathInput = resolveField(context, 'sharePath', 'getSharePath')
  const currentRoute = context?.$mp?.page?.route
  const basePath = ensurePath(basePathInput || currentRoute)
  const queryInput = resolveField(context, 'shareQuery', 'getShareQuery')
  const queryString = serializeQuery(queryInput)
  const finalPath = queryString ? `${basePath}${basePath.includes('?') ? '&' : '?'}${queryString}` : basePath
  const finalImage = resolveField(context, 'shareImageUrl', 'getShareImageUrl') || DEFAULT_IMAGE
  return {
    finalTitle,
    finalPath,
    finalImage,
    finalQueryString: queryString
  }
}

const isShareDisabled = (context) => {
  const disabled = resolveField(context, 'disableShare', 'getDisableShare')
  return !!disabled
}

const trackShare = (eventName, payload = {}) => {
  if (typeof trackEvent === 'function' && TRACK_EVENTS[eventName]) {
    trackEvent(TRACK_EVENTS[eventName], payload)
  }
}

export default {
  onLoad() {
    // #ifdef MP-WEIXIN
    if (isShareDisabled(this)) {
      return
    }
    if (typeof wx !== 'undefined' && typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    }
    // #endif
  },

  onShareAppMessage(options) {
    const { finalTitle, finalPath, finalImage } = buildShareConfig(this)

    trackShare('SHARE_APP_MESSAGE', {
      from: options?.from || 'unknown',
      page: this.$mp?.page?.route || '',
      sharePath: finalPath,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      path: finalPath,
      imageUrl: finalImage
    }
  },

  onShareTimeline() {
    const { finalTitle, finalImage, finalQueryString } = buildShareConfig(this)

    trackShare('SHARE_TIMELINE', {
      page: this.$mp?.page?.route || '',
      query: finalQueryString,
      shareTitle: finalTitle
    })

    return {
      title: finalTitle,
      query: finalQueryString,
      imageUrl: finalImage
    }
  }
}
