import { logger } from '@/utils/logger'

/**
 * 企业微信客服配置
 * 
 * 配置说明：
 * - corpId: 企业微信的企业ID
 * - url: 企业微信客服链接
 * 
 * 获取方式：
 * 1. 登录企业微信管理后台：https://work.weixin.qq.com/wework_admin/
 * 2. 进入"我的企业" -> "企业信息"，获取企业ID
 * 3. 进入"应用管理" -> "客服"，获取客服链接
 * 
 * 官方文档：https://developer.work.weixin.qq.com/document/path/94638
 */

export const ENTERPRISE_WECHAT_CONFIG = {
  // 企业ID
  corpId: 'ww2f27de01157db121',
  
  // 客服链接
  url: 'https://work.weixin.qq.com/kfid/kfcae7ed2f3ac698033',
  
  // 客服名称（用于显示）
  name: 'Startupilot客服',
  
  // 工作时间
  workingHours: '周一至周五 9:00-18:00'
}

/**
 * 打开企业微信客服
 * @param {Object} options - 配置选项
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onFail - 失败回调
 */
export function openEnterpriseCustomerService(options = {}) {
  const {
    onSuccess,
    onFail,
    url = ENTERPRISE_WECHAT_CONFIG.url,
    corpId = ENTERPRISE_WECHAT_CONFIG.corpId
  } = options

  if (!isSupportEnterpriseCustomerService()) {
    logger.warn('[customerService] openCustomerServiceChat not supported')
    showFallbackGuide(url, '当前环境暂不支持直接打开客服，是否复制客服链接以便在微信中打开？')
    if (onFail) {
      onFail(new Error('openCustomerServiceChat not supported'))
    }
    return
  }
  
  let loadingVisible = false
  const showLoading = () => {
    if (loadingVisible) return
    uni.showLoading({
      title: '打开客服中...',
      mask: true,
      success: () => {
        loadingVisible = true
      },
      fail: () => {
        loadingVisible = false
      }
    })
  }
  const hideLoadingSafe = () => {
    if (!loadingVisible) return
    loadingVisible = false
    uni.hideLoading({ fail: () => {} })
  }
  
  showLoading()
  
  wx.openCustomerServiceChat({
    extInfo: {
      url
    },
    corpId,
    success(res) {
      loadingVisible = false
      logger.log('[customerService] 打开企业微信客服成功', res)
      
      if (onSuccess) {
        onSuccess(res)
      }
    },
    fail(err) {
      hideLoadingSafe()
      logger.error('[customerService] 打开企业微信客服失败', err)
      
      const errMsg = err?.errMsg || '打开客服失败'
      const isBindingError = errMsg.includes('corpId is not bound')
      const message = isBindingError
        ? '当前小程序尚未在企业微信后台绑定该客服，请联系管理员处理，或复制客服链接到微信打开。'
        : `${errMsg}，是否复制客服链接以便在微信中打开？`
      showFallbackGuide(url, message)
      
      if (onFail) {
        onFail(err)
      }
    }
  })
}

/**
 * 检查是否支持企业微信客服
 * @returns {Boolean}
 */
export function isSupportEnterpriseCustomerService() {
  return typeof wx !== 'undefined' && typeof wx.openCustomerServiceChat === 'function'
}

function showFallbackGuide(serviceUrl = ENTERPRISE_WECHAT_CONFIG.url, message = '是否复制客服链接以便在微信中打开？') {
  uni.showModal({
    title: '联系客服',
    content: message,
    confirmText: '复制链接',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        uni.setClipboardData({
          data: serviceUrl,
          success: () => {
            uni.showToast({
              title: '客服链接已复制',
              icon: 'success'
            })
          }
        })
      }
    }
  })
}
