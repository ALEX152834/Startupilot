<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { logger } from '@/utils/logger'

const DEFAULT_CLOUD_ENV_ID = 'cloud1-3gx5i5y8f78c0ac6'
let CLOUD_ENV_ID = DEFAULT_CLOUD_ENV_ID
// #ifndef MP-WEIXIN
if (typeof process !== 'undefined' && process && process.env && process.env.VITE_CLOUD_ENV_ID) {
  CLOUD_ENV_ID = process.env.VITE_CLOUD_ENV_ID
}
// #endif

onLaunch(() => {
  logger.log('[App] Launch')
  
  // 初始化云开发环境
  if (typeof wx !== 'undefined' && wx.cloud) {
    try {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
      logger.log('[App] 云开发初始化成功')
    } catch (error) {
      logger.error('[App] 云开发初始化失败', error)
      logger.warn('[App] 请检查云开发环境ID是否正确')
    }
  } else {
    logger.warn('[App] 云开发未初始化，请先在微信开发者工具中开通云开发')
    logger.warn('[App] 步骤：点击顶部菜单栏的"云开发"按钮 -> 开通 -> 创建环境')
  }
  
  // 检查登录状态
  const userStore = useUserStore()
  userStore.checkLogin()
  if (userStore.isLogin) {
    userStore.fetchStats().catch((error) => {
      logger.error('[App] 初始化统计数据失败', error)
    })
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

