const isProd = typeof process !== 'undefined'
  && process
  && process.env
  && process.env.NODE_ENV === 'production'

const logger = {
  log: (...args) => {
    if (!isProd) {
      console.log('[searchProjects]', ...args)
    }
  },
  warn: (...args) => {
    console.warn('[searchProjects]', ...args)
  },
  error: (...args) => {
    console.error('[searchProjects]', ...args)
  },
  // 记录查询性能
  perf: (label, startTime) => {
    const duration = Date.now() - startTime
    if (!isProd || duration > 1000) {
      console.log(`[searchProjects][PERF] ${label}: ${duration}ms`)
    }
  }
}

module.exports = { logger }
