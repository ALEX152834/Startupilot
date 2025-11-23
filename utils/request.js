import { ERROR_CODES } from './constants'
import { showError, withLoading } from './feedback'
import { logger } from './logger'
import storage from './storage'

const DEFAULT_ERROR_MESSAGE = '请求失败'
const DEFAULT_MAX_RETRY = 1 // 默认重试 1 次
let authModalShowing = false

const isTimeoutError = (error = {}) => {
  const msg = error.errMsg || error.message || ''
  return /timeout|超时/i.test(msg)
}

const shouldRetry = (error, attempt, maxRetry) => {
  if (attempt >= maxRetry) return false
  if (!error) return true

  if (error.code && error.code === ERROR_CODES.SERVER_ERROR) return true
  if (error.isNetworkError) return true
  if (isTimeoutError(error)) return true

  return false
}

const handleAuthExpired = (message = '登录已失效，请重新登录') => {
  if (authModalShowing) return
  authModalShowing = true

  // 清理本地凭证并通知全局
  storage.removeUserInfo()
  try {
    if (typeof uni !== 'undefined' && uni.$emit) {
      uni.$emit('auth:expired')
    }
  } catch (error) {
    logger.warn('[request] 触发 auth:expired 事件失败', error)
  }

  if (typeof uni !== 'undefined' && typeof uni.showModal === 'function') {
    uni.showModal({
      title: '登录失效',
      content: message,
      confirmText: '去登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm && typeof uni.switchTab === 'function') {
          uni.switchTab({
            url: '/pages/profile/profile'
          })
        }
      },
      complete: () => {
        authModalShowing = false
      }
    })
  } else {
    authModalShowing = false
  }
}

const callOnce = (name, data = {}) => new Promise((resolve, reject) => {
  // 检查云开发是否已初始化
  if (typeof wx === 'undefined' || !wx.cloud) {
    logger.warn('[request] 云开发未初始化')
    reject(new Error('云开发未初始化'))
    return
  }

  wx.cloud.callFunction({
    name,
    data,
    success: (res) => {
      const result = res?.result || {}
      const code = typeof result.code === 'number' ? result.code : ERROR_CODES.SERVER_ERROR
      const message = result.message || DEFAULT_ERROR_MESSAGE
      
      if (code === ERROR_CODES.SUCCESS) {
        resolve(result.data)
      } else {
        const error = new Error(message)
        error.code = code
        logger.error(`[cloud] ${name} 返回错误`, result)
        reject(error)
      }
    },
    fail: (err) => {
      logger.error(`[cloud] ${name} 调用失败`, err)
      const error = new Error(err?.errMsg || '网络请求失败')
      error.raw = err
      error.isNetworkError = true
      reject(error)
    }
  })
})

/**
 * 云函数调用封装
 * @param {string} name - 云函数名称
 * @param {object} data - 参数
 * @returns {Promise}
 */
export function callCloudFunction(name, data = {}, options = {}) {
  const maxRetry = options.retry === false ? 0 : (typeof options.retryTimes === 'number' ? options.retryTimes : DEFAULT_MAX_RETRY)
  const executor = async () => {
    let attempt = 0
    let lastError = null

    while (attempt <= maxRetry) {
      try {
        const result = await callOnce(name, data)
        return result
      } catch (error) {
        lastError = error

        if (error?.code === ERROR_CODES.AUTH_ERROR) {
          handleAuthExpired(error.message)
          throw error
        }

        if (shouldRetry(error, attempt, maxRetry)) {
          attempt += 1
          logger.warn(`[cloud] ${name} 重试第 ${attempt} 次`, error)
          continue
        }

        if (!options.muteError) {
          showError(error?.message || DEFAULT_ERROR_MESSAGE)
        } else {
          logger.warn(`[cloud] ${name} 静默失败`, error)
        }
        if (options.muteError) {
          return null
        }
        throw error
      }
    }

    if (!options.muteError) {
      showError(lastError?.message || DEFAULT_ERROR_MESSAGE)
    }
    if (options.muteError) {
      return null
    }
    throw lastError
  }

  if (options.showLoading) {
    return withLoading(executor, {
      title: options.loadingText
    })
  }

  return executor()
}

/**
 * 用户相关接口
 */
export const userApi = {
  // 微信登录
  login(params = {}) {
    return callCloudFunction('login', {
      action: 'login',
      params
    })
  },
  
  // 更新昵称
  updateName(newName) {
    return callCloudFunction('user', {
      action: 'updateName',
      params: { newName }
    })
  },
  
  // 保存报名信息
  saveRegistrationInfo(info) {
    return callCloudFunction('user', {
      action: 'saveRegistrationInfo',
      params: info
    })
  },
  
  // 获取用户统计
  getStats() {
    logger.log('调用 getStats 云函数')
    return callCloudFunction('user', {
      action: 'getStats',
      params: {}
    }).then(result => {
      logger.log('getStats 云函数返回:', result)
      return result
    })
  },

  // 绑定手机号
  bindPhone(cloudID) {
    return callCloudFunction('user', {
      action: 'bindPhone',
      params: { cloudID }
    })
  },

  // 更新基础资料
  updateProfile(profile) {
    return callCloudFunction('user', {
      action: 'updateProfile',
      params: profile
    })
  }
}

/**
 * 活动相关接口
 */
export const eventApi = {
  // 获取活动列表
  getList(params = {}) {
    return callCloudFunction('event', {
      action: 'getList',
      params
    })
  },
  
  // 预约活动
  book(eventId, eventInfo = null) {
    return callCloudFunction('event', {
      action: 'book',
      params: { 
        eventId,
        eventInfo
      }
    })
  },
  
  // 取消预约
  cancelBooking(eventId) {
    return callCloudFunction('event', {
      action: 'cancelBooking',
      params: { eventId }
    })
  },
  
  // 我的预约
  getMyBookings(status = 'confirmed') {
    return callCloudFunction('event', {
      action: 'getMyBookings',
      params: { status }
    })
  }
}

/**
 * 项目相关接口
 */
export const projectApi = {
  // 获取项目列表
  getList(params = {}) {
    return callCloudFunction('project', {
      action: 'getList',
      params
    })
  },

  // 浏览项目（静默计数）
  viewProject(projectId) {
    if (!projectId) return Promise.resolve(null)
    return callCloudFunction('project', {
      action: 'viewProject',
      params: { projectId }
    }, {
      retryTimes: 0,
      muteError: true
    })
  },
  
  // 发布项目
  publish(projectData) {
    return callCloudFunction('project', {
      action: 'publish',
      params: projectData
    })
  },
  
  // 我的发布
  getMyPosts() {
    logger.log('调用 getMyPosts 云函数')
    return callCloudFunction('project', {
      action: 'getMyPosts',
      params: {}
    }).then(result => {
      logger.log('getMyPosts 云函数返回:', result)
      return result
    })
  },
  
  // 删除项目
  delete(projectId) {
    return callCloudFunction('project', {
      action: 'delete',
      params: { projectId }
    })
  }
}

/**
 * 学习资源相关接口
 */
export const learningApi = {
  // 获取资源列表
  getList(params = {}) {
    return callCloudFunction('learning', {
      action: 'getList',
      params
    })
  },
  
  // 获取资源详情/下载
  getResource(resourceId) {
    return callCloudFunction('learning', {
      action: 'getResource',
      params: { resourceId }
    })
  }
}

/**
 * 收藏相关接口
 */
export const favoriteApi = {
  // 添加收藏
  add(params) {
    return callCloudFunction('favorite', {
      action: 'add',
      params
    })
  },
  
  // 取消收藏
  remove(itemId) {
    return callCloudFunction('favorite', {
      action: 'remove',
      params: { itemId }
    })
  },
  
  // 我的收藏
  getMyFavorites(itemType = 'all') {
    return callCloudFunction('favorite', {
      action: 'getMyFavorites',
      params: { itemType }
    })
  }
}

/**
 * VIP相关接口
 */
export const vipApi = {
  // 验证兑换码
  verifyRedeemCode(code) {
    return callCloudFunction('vip', {
      action: 'verifyRedeemCode',
      params: { code }
    })
  }
}

