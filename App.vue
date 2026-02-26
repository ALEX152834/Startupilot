<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { logger } from '@/utils/logger'
import { initDeviceInfo, isHarmonyOS, getPlatform, getSafeAreaInfo } from '@/utils/device'

const DEFAULT_CLOUD_ENV_ID = 'cloud1-3gx5i5y8f78c0ac6'
let CLOUD_ENV_ID = DEFAULT_CLOUD_ENV_ID
// #ifndef MP-WEIXIN
if (typeof process !== 'undefined' && process && process.env && process.env.VITE_CLOUD_ENV_ID) {
  CLOUD_ENV_ID = process.env.VITE_CLOUD_ENV_ID
}
// #endif

const userStore = useUserStore()
const handleAuthExpired = () => {
  if (typeof userStore.forceLogoutSilently === 'function') {
    userStore.forceLogoutSilently()
  } else {
    userStore.logout()
  }
}

onLaunch(() => {
  logger.log('[App] Launch')
  
  // 云开发初始化 - 最高优先级，同步执行
  if (typeof wx !== 'undefined' && wx.cloud) {
    try {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
      logger.log('[App] 云开发初始化成功')
    } catch (error) {
      logger.error('[App] 云开发初始化失败', error)
    }
  }
  
  // 设备信息初始化 - 同步执行，但简化处理
  const { platform, isHarmony, safeAreaInfo } = initDeviceInfo()
  
  // 将设备信息存储到全局
  if (typeof getApp === 'function') {
    const app = getApp({ allowDefault: true })
    if (app) {
      app.globalData = app.globalData || {}
      app.globalData.platform = platform
      app.globalData.isHarmonyOS = isHarmony
      app.globalData.safeAreaInfo = safeAreaInfo
    }
  }
  
  // 检查登录状态 - 同步执行，从本地存储读取
  userStore.checkLogin()
  
  // 延迟执行非关键初始化
  setTimeout(() => {
    // 鸿蒙系统日志
    if (isHarmony) {
      logger.log('[App] 检测到鸿蒙系统，启用兼容模式')
    }
    
    // 获取用户统计 - 延迟执行
    if (userStore.isLogin) {
      userStore.fetchStats().catch((error) => {
        logger.error('[App] 初始化统计数据失败', error)
      })
    }
  }, 500)

  // 监听登录失效事件
  if (typeof uni !== 'undefined' && uni.$on) {
    uni.$on('auth:expired', handleAuthExpired)
  }
})

onShow(() => {
  logger.log('[App] Show')
})

onHide(() => {
  logger.log('[App] Hide')
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/common.scss';

/* 全局样式 */
page {
  background-color: $bg-color;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>

