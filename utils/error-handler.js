/**
 * 全局错误处理
 */

import { ERROR_CODES } from './constants'
import analytics from './analytics'
import { getRuntimeInfo } from './device'
import { showError } from './feedback'
import { logger } from './logger'

/**
 * 错误处理器
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
const isProductionEnv = typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'production'

export function handleError(error, context = '') {
  logger.error(`[${context}] Error`, error)
  
  let message = '操作失败'
  
  if (error.code) {
    switch (error.code) {
      case ERROR_CODES.PARAM_ERROR:
        message = '参数错误'
        break
      case ERROR_CODES.AUTH_ERROR:
        message = '认证失败，请重新登录'
        break
      case ERROR_CODES.VIP_REQUIRED:
        message = '需要NEO会员'
        break
      case ERROR_CODES.NOT_FOUND:
        message = '资源不存在'
        break
      case ERROR_CODES.ALREADY_EXISTS:
        message = '资源已存在'
        break
      case ERROR_CODES.SERVER_ERROR:
        message = '服务器错误，请稍后重试'
        break
      default:
        message = error.message || '操作失败'
    }
  } else {
    message = error.message || '操作失败'
  }
  
  // 显示错误提示
  showError(message)
  
  // 上报错误（生产环境）
  if (isProductionEnv) {
    reportError(error, context)
  }
}

/**
 * 上报错误到服务器
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
function reportError(error, context) {
  const runtimeInfo = getRuntimeInfo()

  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    platform: runtimeInfo.platform || runtimeInfo.osName || '',
    version: runtimeInfo.version || runtimeInfo.appVersion || ''
  }

  logger.error('[errorHandler] Report Error', errorInfo)
}

/**
 * 网络错误处理
 * @param {object} error - 错误对象
 */
export function handleNetworkError(error) {
  if (error.errMsg) {
    if (error.errMsg.includes('timeout')) {
      showError('网络超时，请重试')
    } else if (error.errMsg.includes('fail')) {
      showError('网络请求失败')
    }
  }
}

/**
 * Promise rejection 全局处理
 */
export function setupGlobalErrorHandler() {
  // Vue 3 错误处理
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.errorHandler = handleError
  }
}

