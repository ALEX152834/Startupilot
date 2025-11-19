import { ERROR_CODES } from './constants'
import { showError, withLoading } from './feedback'
import { logger } from './logger'

const DEFAULT_ERROR_MESSAGE = '请求失败'

/**
 * 云函数调用封装
 * @param {string} name - 云函数名称
 * @param {object} data - 参数
 * @returns {Promise}
 */
export function callCloudFunction(name, data = {}, options = {}) {
  const executor = () => new Promise((resolve, reject) => {
    // 检查云开发是否已初始化
    if (typeof wx === 'undefined' || !wx.cloud) {
      logger.warn('[request] 云开发未初始化')
      showError('云开发未配置')
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
          logger.error(`[cloud] ${name} 返回错误`, result)
          showError(message)
          reject(new Error(message))
        }
      },
      fail: (err) => {
        logger.error(`[cloud] ${name} 调用失败`, err)
        
        showError('网络请求失败')
        reject(err)
      }
    })
  })

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

