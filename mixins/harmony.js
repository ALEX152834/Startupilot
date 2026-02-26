/**
 * 鸿蒙系统兼容性 mixin
 * 用于 Options API 风格的组件
 */
import { isHarmonyOS, getPlatform, getSafeAreaInfo, PLATFORM } from '@/utils/device'

export default {
  data() {
    return {
      harmonyInfo: {
        isHarmony: false,
        platform: '',
        safeAreaInfo: {
          statusBarHeight: 0,
          safeArea: {},
          safeTop: 0,
          safeBottom: 0
        }
      }
    }
  },
  
  computed: {
    // 是否为鸿蒙系统
    isHarmonyOS() {
      return this.harmonyInfo.isHarmony
    },
    
    // 当前平台
    currentPlatform() {
      return this.harmonyInfo.platform
    },
    
    // 顶部安全距离
    safeTop() {
      return this.harmonyInfo.safeAreaInfo.safeTop || 0
    },
    
    // 底部安全距离
    safeBottom() {
      return this.harmonyInfo.safeAreaInfo.safeBottom || 0
    },
    
    // 状态栏高度
    statusBarHeight() {
      return this.harmonyInfo.safeAreaInfo.statusBarHeight || 0
    },
    
    // 顶部安全区域样式
    topSafeStyle() {
      return {
        paddingTop: `${this.safeTop}px`
      }
    },
    
    // 底部安全区域样式
    bottomSafeStyle() {
      return {
        paddingBottom: `${this.safeBottom}px`
      }
    },
    
    // 页面根节点类名
    pageRootClass() {
      const classes = [`platform-${this.harmonyInfo.platform}`]
      if (this.harmonyInfo.isHarmony) {
        classes.push('is-harmony')
      }
      return classes.join(' ')
    }
  },
  
  created() {
    this.initHarmonyInfo()
  },
  
  methods: {
    // 初始化鸿蒙信息
    initHarmonyInfo() {
      this.harmonyInfo.isHarmony = isHarmonyOS()
      this.harmonyInfo.platform = getPlatform()
      this.harmonyInfo.safeAreaInfo = getSafeAreaInfo()
    },
    
    // 根据平台返回不同值
    byPlatform(options = {}) {
      const { harmony, ios, android, defaultValue } = options
      
      if (this.harmonyInfo.isHarmony && harmony !== undefined) {
        return harmony
      }
      if (this.harmonyInfo.platform === PLATFORM.IOS && ios !== undefined) {
        return ios
      }
      if (this.harmonyInfo.platform === PLATFORM.ANDROID && android !== undefined) {
        return android
      }
      return defaultValue
    }
  }
}
