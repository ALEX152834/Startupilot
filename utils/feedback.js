import { logger } from './logger'

const DEFAULT_ERROR_MESSAGE = '操作失败'
const DEFAULT_LOADING_TEXT = '加载中...'

const safeHideLoading = () => {
  try {
    uni.hideLoading()
  } catch (error) {
    logger.warn('[feedback.safeHideLoading] hideLoading failed', error)
  }
}

export const showError = (message = DEFAULT_ERROR_MESSAGE) => {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  })
}

export const showSuccess = (message = '操作成功') => {
  uni.showToast({
    title: message,
    icon: 'success',
    duration: 2000
  })
}

export const withLoading = async (task, { title = DEFAULT_LOADING_TEXT, mask = true } = {}) => {
  let loadingVisible = false

  try {
    await new Promise((resolve, reject) => {
      uni.showLoading({
        title,
        mask,
        success: () => {
          loadingVisible = true
          resolve()
        },
        fail: (error) => {
          logger.warn('[feedback.withLoading] showLoading failed', error)
          resolve()
        }
      })
    })

    return await task()
  } finally {
    if (loadingVisible) {
      safeHideLoading()
    }
  }
}

export const showConfirm = ({ title = '提示', content = '', confirmText = '确定', cancelText = '取消' } = {}) => {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: reject
    })
  })
}
