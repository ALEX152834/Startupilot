/**
 * 性能优化工具
 * 包含请求缓存、防抖节流、预加载等功能
 */

import { logger } from './logger'

// 内存缓存
const memoryCache = new Map()

/**
 * 带缓存的请求包装器
 * @param {string} key - 缓存键
 * @param {Function} fetcher - 请求函数
 * @param {object} options - 配置项
 */
export async function cachedRequest(key, fetcher, options = {}) {
  const {
    ttl = 60000, // 默认缓存1分钟
    forceRefresh = false,
    onCacheHit = null
  } = options

  // 检查内存缓存
  if (!forceRefresh && memoryCache.has(key)) {
    const cached = memoryCache.get(key)
    if (Date.now() - cached.timestamp < ttl) {
      logger.log(`[cache] 命中缓存: ${key}`)
      onCacheHit && onCacheHit(cached.data)
      return cached.data
    }
  }

  // 执行请求
  const data = await fetcher()
  
  // 存入缓存
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  })

  return data
}

/**
 * 清除指定缓存
 */
export function clearCache(key) {
  if (key) {
    memoryCache.delete(key)
  } else {
    memoryCache.clear()
  }
}

/**
 * 请求去重 - 相同请求只执行一次
 */
const pendingRequests = new Map()

export async function dedupeRequest(key, fetcher) {
  // 如果已有相同请求在进行中，返回同一个Promise
  if (pendingRequests.has(key)) {
    logger.log(`[dedupe] 复用进行中的请求: ${key}`)
    return pendingRequests.get(key)
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

/**
 * 延迟执行 - 用于非关键数据加载
 */
export function deferLoad(fn, delay = 100) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const result = await fn()
      resolve(result)
    }, delay)
  })
}

/**
 * 空闲时执行 - 利用浏览器空闲时间
 */
export function idleLoad(fn) {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(async () => {
        const result = await fn()
        resolve(result)
      })
    } else {
      // 小程序环境降级为setTimeout
      setTimeout(async () => {
        const result = await fn()
        resolve(result)
      }, 50)
    }
  })
}

/**
 * 批量请求优化 - 合并多个请求
 */
const batchQueue = new Map()
const BATCH_DELAY = 50

export function batchRequest(key, params, fetcher) {
  return new Promise((resolve, reject) => {
    if (!batchQueue.has(key)) {
      batchQueue.set(key, {
        params: [],
        resolvers: [],
        timer: null
      })
    }

    const batch = batchQueue.get(key)
    batch.params.push(params)
    batch.resolvers.push({ resolve, reject })

    // 清除之前的定时器
    if (batch.timer) {
      clearTimeout(batch.timer)
    }

    // 设置新的定时器，延迟执行批量请求
    batch.timer = setTimeout(async () => {
      const { params: allParams, resolvers } = batch
      batchQueue.delete(key)

      try {
        const results = await fetcher(allParams)
        resolvers.forEach((r, i) => r.resolve(results[i] || results))
      } catch (error) {
        resolvers.forEach(r => r.reject(error))
      }
    }, BATCH_DELAY)
  })
}

/**
 * 图片预加载
 */
export function preloadImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return

  urls.forEach(url => {
    if (!url) return
    // 小程序环境使用 uni.getImageInfo 预加载
    if (typeof uni !== 'undefined' && uni.getImageInfo) {
      uni.getImageInfo({
        src: url,
        fail: () => {} // 静默失败
      })
    }
  })
}

/**
 * 性能监控
 */
export const perfMonitor = {
  marks: new Map(),

  start(name) {
    this.marks.set(name, Date.now())
  },

  end(name) {
    const start = this.marks.get(name)
    if (start) {
      const duration = Date.now() - start
      logger.log(`[perf] ${name}: ${duration}ms`)
      this.marks.delete(name)
      return duration
    }
    return 0
  }
}
