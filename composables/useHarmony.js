/**
 * 鸿蒙系统兼容性 composable
 * 提供鸿蒙系统检测和 UI 适配功能
 */
import { ref, computed, onMounted } from 'vue'
import { 
  isHarmonyOS, 
  getPlatform, 
  getSafeAreaInfo, 
  getPageRootClass,
  getBottomFixedStyle,
  getTopFixedStyle,
  PLATFORM 
} from '@/utils/device'

export function useHarmony() {
  const isHarmony = ref(false)
  const platform = ref('')
  const safeAreaInfo = ref({
    statusBarHeight: 0,
    safeArea: {},
    safeTop: 0,
    safeBottom: 0,
    isHarmony: false
  })

  // 初始化平台信息
  const initPlatformInfo = () => {
    isHarmony.value = isHarmonyOS()
    platform.value = getPlatform()
    safeAreaInfo.value = getSafeAreaInfo()
  }

  // 计算属性：是否需要额外的顶部安全距离
  const needsTopSafeArea = computed(() => {
    return safeAreaInfo.value.safeTop > 0
  })

  // 计算属性：是否需要额外的底部安全距离
  const needsBottomSafeArea = computed(() => {
    return safeAreaInfo.value.safeBottom > 0
  })

  // 获取顶部安全距离样式
  const topSafeAreaStyle = computed(() => {
    return {
      paddingTop: `${safeAreaInfo.value.safeTop}px`
    }
  })

  // 获取底部安全距离样式
  const bottomSafeAreaStyle = computed(() => {
    return {
      paddingBottom: `${safeAreaInfo.value.safeBottom}px`
    }
  })

  // 页面根节点类名
  const pageRootClass = computed(() => {
    return getPageRootClass()
  })

  // 底部固定元素样式
  const bottomFixedStyle = computed(() => {
    return getBottomFixedStyle()
  })

  // 顶部固定元素样式
  const topFixedStyle = computed(() => {
    return getTopFixedStyle()
  })

  // 根据平台返回不同值
  const byPlatform = (options = {}) => {
    const { harmony, ios, android, defaultValue } = options
    
    if (isHarmony.value && harmony !== undefined) {
      return harmony
    }
    if (platform.value === PLATFORM.IOS && ios !== undefined) {
      return ios
    }
    if (platform.value === PLATFORM.ANDROID && android !== undefined) {
      return android
    }
    return defaultValue
  }

  // 获取导航栏高度（考虑鸿蒙适配）
  const getNavbarHeight = () => {
    const baseHeight = 44 // 基础导航栏高度
    const statusBarHeight = safeAreaInfo.value.statusBarHeight || 0
    return baseHeight + statusBarHeight
  }

  // 获取内容区域顶部偏移
  const getContentTopOffset = (extraOffset = 0) => {
    return getNavbarHeight() + extraOffset
  }

  onMounted(() => {
    initPlatformInfo()
  })

  return {
    // 状态
    isHarmony,
    platform,
    safeAreaInfo,
    
    // 计算属性
    needsTopSafeArea,
    needsBottomSafeArea,
    topSafeAreaStyle,
    bottomSafeAreaStyle,
    pageRootClass,
    bottomFixedStyle,
    topFixedStyle,
    
    // 方法
    initPlatformInfo,
    byPlatform,
    getNavbarHeight,
    getContentTopOffset,
    
    // 常量
    PLATFORM
  }
}
