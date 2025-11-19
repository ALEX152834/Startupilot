import { logger } from './logger'

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
