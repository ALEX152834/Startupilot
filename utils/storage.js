import { STORAGE_KEYS, CACHE_TIME } from './constants'
import { logger } from './logger'

/**
 * 本地存储工具类
 */
class Storage {
  /**
   * 设置存储
   * @param {string} key - 键名
   * @param {*} value - 值
   */
  set(key, value) {
    try {
      uni.setStorageSync(key, JSON.stringify(value))
    } catch (e) {
      logger.error('[storage.set] 失败', { key, error: e })
    }
  }

  /**
   * 获取存储
   * @param {string} key - 键名
   * @returns {*}
   */
  get(key) {
    try {
      const value = uni.getStorageSync(key)
      return value ? JSON.parse(value) : null
    } catch (e) {
      logger.error('[storage.get] 读取失败', { key, error: e })
      return null
    }
  }

  /**
   * 删除存储
   * @param {string} key - 键名
   */
  remove(key) {
    try {
      uni.removeStorageSync(key)
    } catch (e) {
      logger.error('[storage.remove] 删除失败', { key, error: e })
    }
  }

  /**
   * 清空存储
   */
  clear() {
    try {
      uni.clearStorageSync()
    } catch (e) {
      logger.error('[storage.clear] 清空失败', e)
    }
  }

  /**
   * 设置带过期时间的缓存
   * @param {string} key - 键名
   * @param {*} value - 值
   * @param {number} expireTime - 过期时间（毫秒）
   */
  setCache(key, value, expireTime = CACHE_TIME) {
    const data = {
      value,
      timestamp: Date.now(),
      expireTime
    }
    this.set(key, data)
  }

  /**
   * 获取缓存（检查过期）
   * @param {string} key - 键名
   * @returns {*}
   */
  getCache(key) {
    const data = this.get(key)
    if (!data) return null

    const { value, timestamp, expireTime } = data
    if (Date.now() - timestamp > expireTime) {
      this.remove(key)
      return null
    }

    return value
  }

  /**
   * 删除缓存（与 remove 相同，增加语义化方法）
   * @param {string} key - 键名
   */
  removeCache(key) {
    this.remove(key)
  }

  /**
   * 设置用户信息
   * @param {object} userInfo - 用户信息
   */
  setUserInfo(userInfo) {
    this.set(STORAGE_KEYS.USER_INFO, userInfo)
  }

  /**
   * 获取用户信息
   * @returns {object|null}
   */
  getUserInfo() {
    return this.get(STORAGE_KEYS.USER_INFO)
  }

  /**
   * 删除用户信息
   */
  removeUserInfo() {
    this.remove(STORAGE_KEYS.USER_INFO)
    this.remove(STORAGE_KEYS.TOKEN)
  }

  /**
   * 设置 Token
   * @param {string} token - Token
   */
  setToken(token) {
    this.set(STORAGE_KEYS.TOKEN, token)
  }

  /**
   * 获取 Token
   * @returns {string|null}
   */
  getToken() {
    return this.get(STORAGE_KEYS.TOKEN)
  }
}

export default new Storage()

