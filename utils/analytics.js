/**
 * 数据埋点与分析
 */

import { TRACK_EVENTS } from './constants'
import { getRuntimeInfo } from './device'
import { logger } from './logger'

/**
 * 埋点基类
 */
class Analytics {
  constructor() {
    this.enabled = true
    this.queue = []
    this.isDevEnv = typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'development'
  }

  /**
   * 页面浏览埋点
   * @param {string} pageName - 页面名称
   * @param {object} params - 额外参数
   */
  trackPageView(pageName, params = {}) {
    this.track(TRACK_EVENTS.PAGE_VIEW, {
      page: pageName,
      ...params,
      timestamp: Date.now()
    })
  }

  /**
   * Tab切换埋点
   * @param {string} tabName - Tab名称
   * @param {object} params - 额外参数
   */
  trackTabSwitch(tabName, params = {}) {
    this.track(TRACK_EVENTS.TAB_SWITCH, {
      tab: tabName,
      ...params,
      timestamp: Date.now()
    })
  }

  /**
   * 搜索埋点
   * @param {string} keyword - 搜索关键词
   * @param {string} type - 搜索类型
   * @param {object} params - 额外参数
   */
  trackSearch(keyword, type, params = {}) {
    this.track(TRACK_EVENTS.SEARCH, {
      keyword,
      type,
      ...params,
      timestamp: Date.now()
    })
  }

  /**
   * 按钮点击埋点
   * @param {string} buttonName - 按钮名称
   * @param {object} params - 额外参数
   */
  trackButtonClick(buttonName, params = {}) {
    this.track('button_click', {
      button: buttonName,
      ...params,
      timestamp: Date.now()
    })
  }

  /**
   * 通用埋点方法
   * @param {string} event - 事件名称
   * @param {object} params - 参数
   */
  track(event, params = {}) {
    if (!this.enabled) return

    const trackData = {
      event,
      params,
      timestamp: Date.now(),
      userAgent: getRuntimeInfo()
    }

    // 微信小程序数据分析
    if (typeof wx !== 'undefined' && wx.reportAnalytics) {
      wx.reportAnalytics(event, params)
    }

    // 添加到队列
    this.queue.push(trackData)

    // 控制台输出（开发环境）
    if (this.isDevEnv) {
      logger.log('[analytics] Track Event', event, params)
    }

    // 批量上报
    if (this.queue.length >= 10) {
      this.flush()
    }
  }

  /**
   * 批量上报埋点数据
   */
  flush() {
    if (this.queue.length === 0) return

    // TODO: 实现批量上报到服务器
    logger.log('[analytics] Flush Analytics', this.queue.length)

    this.queue = []
  }

  /**
   * 启用/禁用埋点
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }
}

// 导出单例
const analytics = new Analytics()

export default analytics

// 便捷方法导出
export const {
  trackPageView,
  trackTabSwitch,
  trackSearch,
  trackButtonClick,
  track
} = analytics

