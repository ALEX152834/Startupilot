import { userApi } from './request'
import storage from './storage'
import { TRACK_EVENTS } from './constants'
import { logger } from './logger'

/**
 * 登录认证工具
 */

/**
 * 获取用户信息（需要用户授权）
 */
async function wxGetUserProfile() {
  return new Promise((resolve, reject) => {
    const invoke = () => {
      if (typeof wx !== 'undefined' && typeof wx.getUserProfile === 'function') {
        wx.getUserProfile({ desc: '用于完善个人资料', success: resolve, fail: reject })
        return true
      }
      if (typeof uni !== 'undefined' && typeof uni.getUserProfile === 'function') {
        uni.getUserProfile({ desc: '用于完善个人资料', success: resolve, fail: reject })
        return true
      }
      return false
    }

    if (!invoke()) {
      reject(new Error('当前基础库版本过低，无法获取用户信息'))
    }
  })
}

/**
 * 获取微信登录凭证 code
 */
async function wxLoginCode() {
  return new Promise((resolve, reject) => {
    const invoke = () => {
      if (typeof wx !== 'undefined' && typeof wx.login === 'function') {
        wx.login({
          success: (res) => {
            if (res && res.code) {
              resolve(res)
            } else {
              reject(new Error('获取登录凭证失败'))
            }
          },
          fail: reject
        })
        return true
      }
      if (typeof uni !== 'undefined' && typeof uni.login === 'function') {
        uni.login({
          provider: 'weixin',
          success: (res) => {
            if (res && res.code) {
              resolve(res)
            } else {
              reject(new Error('获取登录凭证失败'))
            }
          },
          fail: reject
        })
        return true
      }
      return false
    }

    if (!invoke()) {
      reject(new Error('当前环境不支持微信登录'))
    }
  })
}

/**
 * 微信登录（仅使用 code，不获取用户信息）
 * @returns {Promise}
 */
export async function wxLogin(profile = null) {
  try {
    // 只获取登录凭证，不调用 getUserProfile
    const loginRes = await wxLoginCode()

    const { userInfo, token } = await userApi.login({
      code: loginRes.code,
      profile: profile || {
        nickName: '',
        avatarUrl: ''
      }
    })

    if (userInfo) {
      storage.setUserInfo(userInfo)
      trackEvent(TRACK_EVENTS.LOGIN_SUCCESS, {
        uid: userInfo.uid,
        vipLevel: userInfo.vipLevel
      })
    }

    if (token) {
      storage.setToken(token)
    }

    return { userInfo, token }
  } catch (error) {
    logger.error('微信登录失败:', error)
    throw error
  }
}

/**
 * 微信登录（带用户信息授权）
 * 注意：此方法必须在用户点击事件中直接调用
 * @returns {Promise}
 */
export async function wxLoginWithProfile() {
  try {
    // 获取用户信息
    const profileRes = await wxGetUserProfile()
    const profileData = profileRes?.userInfo || profileRes || {}

    // 获取登录凭证
    const loginRes = await wxLoginCode()

    const { userInfo, token } = await userApi.login({
      code: loginRes.code,
      profile: {
        nickName: profileData?.nickName || '',
        avatarUrl: profileData?.avatarUrl || ''
      }
    })

    if (userInfo) {
      storage.setUserInfo(userInfo)
      trackEvent(TRACK_EVENTS.LOGIN_SUCCESS, {
        uid: userInfo.uid,
        vipLevel: userInfo.vipLevel
      })
    }

    if (token) {
      storage.setToken(token)
    }

    return { userInfo, token }
  } catch (error) {
    logger.error('微信登录失败:', error)
    throw error
  }
}

/**
 * 检查登录状态
 * @returns {boolean}
 */
export function checkLoginStatus() {
  const userInfo = storage.getUserInfo()
  return !!userInfo && !!userInfo.uid
}

/**
 * 获取用户信息
 * @returns {object|null}
 */
export function getUserInfo() {
  return storage.getUserInfo()
}

/**
 * 退出登录
 */
export function logout() {
  storage.removeUserInfo()
  
  // 跳转到首页
  uni.reLaunch({
    url: '/pages/index/index'
  })
}

/**
 * 检查VIP权限
 * @param {string} requiredLevel - 需要的VIP等级
 * @returns {boolean}
 */
export function checkVipPermission(requiredLevel) {
  const userInfo = getUserInfo()
  
  if (!userInfo) {
    return false
  }

  // 如果需要NEO会员
  if (requiredLevel === 'neo') {
    if (userInfo.vipLevel !== 'neo') {
      return false
    }

    // 检查是否过期
    const vipExpiry = new Date(userInfo.vipExpiry)
    if (vipExpiry < new Date()) {
      return false
    }
  }

  return true
}

/**
 * 显示登录弹窗提示
 */
export function showLoginModal() {
  // 这个函数会在组件中实现，这里只是占位
  uni.showToast({
    title: '请先登录',
    icon: 'none'
  })
}

/**
 * 显示VIP升级弹窗
 */
export function showVipUpgradeModal() {
  // 这个函数会在组件中实现，这里只是占位
  uni.showToast({
    title: '需要NEO会员',
    icon: 'none'
  })
}

/**
 * 数据埋点
 * @param {string} event - 事件名称
 * @param {object} params - 参数
 */
export function trackEvent(event, params = {}) {
  // 微信小程序数据分析
  if (typeof wx !== 'undefined' && wx.reportAnalytics) {
    wx.reportAnalytics(event, params)
  }
  
  // 控制台输出（开发环境）
  logger.log('Track Event:', event, params)
}

