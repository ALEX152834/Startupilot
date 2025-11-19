import { logger } from './logger'

/**
 * 性能优化工具
 */

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 图片压缩
 * @param {string} src - 图片路径
 * @param {number} quality - 压缩质量 0-100
 * @returns {Promise<string>}
 */
export async function compressImage(src, quality = 80) {
  try {
    const result = await uni.compressImage({
      src,
      quality
    })
    return result[1].tempFilePath
  } catch (error) {
    logger.error('图片压缩失败:', error)
    return src
  }
}

/**
 * 懒加载图片
 * @param {string} src - 图片路径
 * @returns {object}
 */
export function lazyLoadImage(src) {
  return {
    src,
    lazyLoad: true,
    mode: 'aspectFill'
  }
}

/**
 * 监控页面性能
 */
export function monitorPagePerformance() {
  const performance = uni.getPerformance()
  const isProdEnv = typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'production'
  
  if (performance) {
    // 获取性能数据
    const observer = performance.createObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach((entry) => {
        logger.log('[performance] entry', entry)
        
        // 上报性能数据
        if (isProdEnv) {
          reportPerformance(entry)
        }
      })
    })
    
    observer.observe({ entryTypes: ['render', 'script'] })
  }
}

/**
 * 上报性能数据
 * @param {object} entry - 性能数据
 */
function reportPerformance(entry) {
  // TODO: 实现性能数据上报
  logger.error('[performance] Report Performance (TODO)', entry)
}

/**
 * 优化长列表渲染
 * @param {Array} list - 列表数据
 * @param {number} pageSize - 每页大小
 * @returns {Array}
 */
export function optimizeLongList(list, pageSize = 20) {
  // 虚拟列表优化（简化版）
  const totalPages = Math.ceil(list.length / pageSize)
  const pages = []
  
  for (let i = 0; i < totalPages; i++) {
    const start = i * pageSize
    const end = start + pageSize
    pages.push(list.slice(start, end))
  }
  
  return pages
}

/**
 * 预加载图片
 * @param {Array} urls - 图片URL数组
 */
export function preloadImages(urls) {
  urls.forEach(url => {
    uni.getImageInfo({
      src: url,
      success: () => {
        logger.log('图片预加载成功:', url)
      }
    })
  })
}

/**
 * 节流滚动事件
 * @param {Function} callback - 回调函数
 * @returns {Function}
 */
export function throttleScroll(callback) {
  return throttle(callback, 100)
}

