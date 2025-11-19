let isDev = false

// #ifndef MP-WEIXIN
if (typeof process !== 'undefined' && process && process.env) {
  isDev = process.env.NODE_ENV !== 'production'
}
// #endif

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args)
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  error: (...args) => {
    console.error(...args)
  }
}

export default logger
