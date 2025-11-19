const isProd = typeof process !== 'undefined'
  && process
  && process.env
  && process.env.NODE_ENV === 'production'

const logger = {
  log: (...args) => {
    if (!isProd) {
      console.log(...args)
    }
  },
  warn: (...args) => {
    console.warn(...args)
  },
  error: (...args) => {
    console.error(...args)
  }
}

module.exports = {
  logger
}
