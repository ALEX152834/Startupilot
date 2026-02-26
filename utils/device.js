import { logger } from './logger'

// 平台类型常量
export const PLATFORM = {
  IOS: 'ios',
  ANDROID: 'android',
  WINDOWS: 'windows',
  MAC: 'mac',
  HARMONY: 'ohos',
  DEVTOOLS: 'devtools',
  UNKNOWN: 'unknown'
}

// 缓存设备信息，避免重复调用
let cachedDeviceInfo = null
let cachedPlatform = null

/**
 * 判断是否为鸿蒙系统
 * @returns {boolean}
 */
export function isHarmonyOS() {
  const deviceInfo = getDeviceInfo()
  
  // 真机判断：platform === 'ohos'
  if (deviceInfo.platform === 'ohos') {
    return true
  }
  
  // 开发者工具模拟鸿蒙：system 包含 'HarmonyOS'
  if (deviceInfo.system && deviceInfo.system.includes('HarmonyOS')) {
    return true
  }
  
  // 系统包含 OpenHarmony
  if (deviceInfo.system && deviceInfo.system.includes('OpenHarmony')) {
    return true
  }
  
  return false
}

/**
 * 获取当前平台类型
 * @returns {string} 平台类型
 */
export function getPlatform() {
  if (cachedPlatform) {
    return cachedPlatform
  }
  
  const deviceInfo = getDeviceInfo()
  const platform = (deviceInfo.platform || '').toLowerCase()
  const system = deviceInfo.system || ''
  
  // 优先判断鸿蒙
  if (platform === 'ohos' || system.includes('HarmonyOS') || system.includes('OpenHarmony')) {
    cachedPlatform = PLATFORM.HARMONY
  } else if (platform === 'ios') {
    cachedPlatform = PLATFORM.IOS
  } else if (platform === 'android') {
    cachedPlatform = PLATFORM.ANDROID
  } else if (platform === 'windows') {
    cachedPlatform = PLATFORM.WINDOWS
  } else if (platform === 'mac') {
    cachedPlatform = PLATFORM.MAC
  } else if (platform === 'devtools') {
    cachedPlatform = PLATFORM.DEVTOOLS
  } else {
    cachedPlatform = PLATFORM.UNKNOWN
  }
  
  return cachedPlatform
}

/**
 * 获取设备信息（带缓存）
 * @returns {Object} 设备信息
 */
export function getDeviceInfo() {
  if (cachedDeviceInfo) {
    return cachedDeviceInfo
  }
  
  try {
    if (typeof wx !== 'undefined' && typeof wx.getDeviceInfo === 'function') {
      cachedDeviceInfo = wx.getDeviceInfo() || {}
    } else if (typeof uni !== 'undefined' && typeof uni.getDeviceInfo === 'function') {
      cachedDeviceInfo = uni.getDeviceInfo() || {}
    } else {
      cachedDeviceInfo = {}
    }
  } catch (err) {
    logger.warn('[device.getDeviceInfo] 获取设备信息失败', err)
    cachedDeviceInfo = {}
  }
  
  return cachedDeviceInfo
}

/**
 * 根据平台执行不同逻辑
 * @param {Object} handlers - 平台处理函数映射
 * @param {Function} handlers.harmony - 鸿蒙平台处理
 * @param {Function} handlers.ios - iOS 平台处理
 * @param {Function} handlers.android - Android 平台处理
 * @param {Function} handlers.default - 默认处理
 * @returns {*} 处理结果
 */
export function runByPlatform(handlers = {}) {
  const platform = getPlatform()
  
  if (platform === PLATFORM.HARMONY && handlers.harmony) {
    return handlers.harmony()
  }
  if (platform === PLATFORM.IOS && handlers.ios) {
    return handlers.ios()
  }
  if (platform === PLATFORM.ANDROID && handlers.android) {
    return handlers.android()
  }
  if (handlers.default) {
    return handlers.default()
  }
  
  return null
}

/**
 * 获取安全区域信息（用于 UI 避让）
 * @returns {Object} 安全区域信息
 */
export function getSafeAreaInfo() {
  try {
    let windowInfo = {}
    
    if (typeof wx !== 'undefined' && typeof wx.getWindowInfo === 'function') {
      windowInfo = wx.getWindowInfo() || {}
    } else if (typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function') {
      windowInfo = uni.getWindowInfo() || {}
    }
    
    const safeArea = windowInfo.safeArea || {}
    const statusBarHeight = windowInfo.statusBarHeight || 0
    
    return {
      statusBarHeight,
      safeArea,
      // 顶部安全距离
      safeTop: safeArea.top || statusBarHeight,
      // 底部安全距离
      safeBottom: windowInfo.screenHeight ? (windowInfo.screenHeight - (safeArea.bottom || windowInfo.screenHeight)) : 0,
      // 是否为鸿蒙系统（可能需要额外适配）
      isHarmony: isHarmonyOS()
    }
  } catch (err) {
    logger.warn('[device.getSafeAreaInfo] 获取安全区域失败', err)
    return {
      statusBarHeight: 0,
      safeArea: {},
      safeTop: 0,
      safeBottom: 0,
      isHarmony: false
    }
  }
}

// 工具：统一获取小程序运行环境信息，优先使用新接口避免 wx.getSystemInfoSync 的弃用警告
export function getRuntimeInfo() {
  const info = {}

  if (typeof wx !== 'undefined') {
    try {
      if (typeof wx.getAppBaseInfo === 'function') {
        Object.assign(info, wx.getAppBaseInfo())
      }
      if (typeof wx.getSystemSetting === 'function') {
        Object.assign(info, wx.getSystemSetting())
      }
      if (typeof wx.getDeviceInfo === 'function') {
        Object.assign(info, wx.getDeviceInfo())
      }
      if (typeof wx.getWindowInfo === 'function') {
        Object.assign(info, wx.getWindowInfo())
      }
      if (typeof wx.getAppAuthorizeSetting === 'function') {
        info.authorizeSetting = wx.getAppAuthorizeSetting()
      }
    } catch (err) {
      logger.warn('[device.getRuntimeInfo] 调用新接口失败', err)
    }

    if (Object.keys(info).length > 0) {
      return info
    }
  }

  if (typeof uni !== 'undefined') {
    if (typeof uni.getAppBaseInfo === 'function') {
      Object.assign(info, uni.getAppBaseInfo())
    }
    if (typeof uni.getSystemSetting === 'function') {
      Object.assign(info, uni.getSystemSetting())
    }
    if (typeof uni.getDeviceInfo === 'function') {
      Object.assign(info, uni.getDeviceInfo())
    }
    if (typeof uni.getWindowInfo === 'function') {
      Object.assign(info, uni.getWindowInfo())
    }
  }

  return {}
}

/**
 * 清除缓存（用于测试或需要重新获取设备信息时）
 */
export function clearDeviceCache() {
  cachedDeviceInfo = null
  cachedPlatform = null
}

/**
 * 初始化设备信息并设置全局状态
 * 在 App.vue 的 onLaunch 中调用
 * @returns {Object} 设备和平台信息
 */
export function initDeviceInfo() {
  const deviceInfo = getDeviceInfo()
  const platform = getPlatform()
  const isHarmony = isHarmonyOS()
  const safeAreaInfo = getSafeAreaInfo()
  
  logger.log('[device] 初始化设备信息', {
    platform,
    isHarmony,
    deviceInfo,
    safeAreaInfo
  })
  
  return {
    deviceInfo,
    platform,
    isHarmony,
    safeAreaInfo
  }
}

/**
 * 获取页面根节点需要的样式类
 * 用于在页面根元素上添加平台特定的类名
 * @returns {string} 类名字符串
 */
export function getPageRootClass() {
  const classes = []
  const platform = getPlatform()
  
  classes.push(`platform-${platform}`)
  
  if (isHarmonyOS()) {
    classes.push('is-harmony')
  }
  
  return classes.join(' ')
}

/**
 * 获取底部固定元素的安全样式
 * @returns {Object} 样式对象
 */
export function getBottomFixedStyle() {
  const safeAreaInfo = getSafeAreaInfo()
  
  return {
    paddingBottom: `${safeAreaInfo.safeBottom}px`
  }
}

/**
 * 获取顶部固定元素的安全样式
 * @returns {Object} 样式对象
 */
export function getTopFixedStyle() {
  const safeAreaInfo = getSafeAreaInfo()
  
  return {
    paddingTop: `${safeAreaInfo.safeTop}px`
  }
}
