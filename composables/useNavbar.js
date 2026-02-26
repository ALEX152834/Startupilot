import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import { isHarmonyOS, getSafeAreaInfo } from '@/utils/device'

const DEFAULT_MENU_BUTTON_INFO = { top: 32, height: 32, left: 0, bottom: 64 }
const DEFAULT_WINDOW_INFO = { windowWidth: 375 }

const isValidNumber = (value) => typeof value === 'number' && !Number.isNaN(value)
const getNumber = (value, fallback = 0) => (isValidNumber(value) ? value : fallback)

export function useNavbar(options = {}) {
  const {
    defaultMenuButtonInfo = DEFAULT_MENU_BUTTON_INFO,
    defaultWindowInfo = DEFAULT_WINDOW_INFO,
    extraPadding = 8,
    rowHeightFallback,
    rightGap = 12,
    enableWindowInfo = true,
    logPrefix = '[useNavbar]'
  } = options

  const menuButtonInfo = ref({ ...defaultMenuButtonInfo })
  const windowInfo = ref({ ...defaultWindowInfo })
  const isHarmony = ref(false)
  const safeArea = ref({ safeTop: 0, safeBottom: 0 })

  const navTop = computed(() => {
    const top = getNumber(menuButtonInfo.value?.top, getNumber(defaultMenuButtonInfo?.top))
    // 鸿蒙系统可能需要额外的顶部安全距离
    if (isHarmony.value && safeArea.value.safeTop > top) {
      return safeArea.value.safeTop
    }
    return top
  })
  const rowHeight = computed(() => {
    const fallbackHeight = rowHeightFallback ?? defaultMenuButtonInfo?.height ?? DEFAULT_MENU_BUTTON_INFO.height
    return getNumber(menuButtonInfo.value?.height, fallbackHeight)
  })
  const navHeight = computed(() => {
    const bottom = menuButtonInfo.value?.bottom
    const fallbackBottom = defaultMenuButtonInfo?.bottom
    if (isValidNumber(bottom)) {
      return bottom + extraPadding
    }
    if (isValidNumber(fallbackBottom)) {
      return fallbackBottom + extraPadding
    }
    return navTop.value + rowHeight.value + extraPadding
  })
  const rightSafeWidth = computed(() => {
    const width = getNumber(windowInfo.value?.windowWidth, getNumber(defaultWindowInfo?.windowWidth, 0))
    const left = getNumber(menuButtonInfo.value?.left, width)
    return Math.max(0, width - left + rightGap)
  })

  const navbarHeightStyle = computed(() => ({
    height: `${navHeight.value}px`
  }))
  const navbarPaddingStyle = computed(() => ({
    paddingTop: `${navTop.value}px`
  }))
  const navbarRowStyle = computed(() => ({
    height: `${rowHeight.value}px`
  }))
  const buildLogoRowStyle = () => computed(() => ({
    marginTop: `${navTop.value}px`,
    height: `${rowHeight.value}px`
  }))
  const buildSearchContainerStyle = () => computed(() => ({
    height: `${rowHeight.value}px`,
    marginRight: `${rightSafeWidth.value}px`
  }))
  const buildSearchBoxStyle = () => computed(() => ({
    height: `${rowHeight.value}px`
  }))
  const buildContentPaddingStyle = (extra = 0) => computed(() => ({
    paddingTop: `${navHeight.value + extra}px`
  }))
  const buildContentTopStyle = (extra = 0) => computed(() => ({
    top: `${navTop.value + rowHeight.value + extra}px`
  }))

  // 底部安全区域高度（用于底部固定元素避让）
  const bottomSafeHeight = computed(() => {
    return getNumber(safeArea.value.safeBottom, 0)
  })

  const refreshNavbarMetrics = () => {
    // 检测鸿蒙系统
    isHarmony.value = isHarmonyOS()
    safeArea.value = getSafeAreaInfo()
    
    if (isHarmony.value) {
      logger.log(`${logPrefix} 检测到鸿蒙系统，安全区域:`, safeArea.value)
    }
    
    try {
      let info = null
      if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
        info = wx.getMenuButtonBoundingClientRect()
      } else if (typeof uni !== 'undefined' && typeof uni.getMenuButtonBoundingClientRect === 'function') {
        info = uni.getMenuButtonBoundingClientRect()
      }

      if (info && isValidNumber(info.height) && info.top !== undefined) {
        menuButtonInfo.value = {
          ...defaultMenuButtonInfo,
          ...info
        }
      }
    } catch (error) {
      logger.error(`${logPrefix} 获取胶囊信息失败`, error)
    }

    if (!enableWindowInfo) return

    const getWindowInfo = () => {
      if (typeof wx !== 'undefined' && typeof wx.getWindowInfo === 'function') {
        return wx.getWindowInfo()
      }
      if (typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function') {
        return uni.getWindowInfo()
      }
      return null
    }

    try {
      const info = getWindowInfo()
      if (info && isValidNumber(info.windowWidth)) {
        windowInfo.value = {
          ...defaultWindowInfo,
          ...info
        }
      }
    } catch (error) {
      logger.error(`${logPrefix} 获取 window 信息失败`, error)
    }
  }

  return {
    menuButtonInfo,
    windowInfo,
    isHarmony,
    safeArea,
    navTop,
    rowHeight,
    navHeight,
    rightSafeWidth,
    bottomSafeHeight,
    navbarHeightStyle,
    navbarPaddingStyle,
    navbarRowStyle,
    buildLogoRowStyle,
    buildSearchContainerStyle,
    buildSearchBoxStyle,
    buildContentPaddingStyle,
    buildContentTopStyle,
    refreshNavbarMetrics
  }
}
