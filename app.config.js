/**
 * 应用配置文件
 */

const isDevEnv = typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'development'

export default {
  // 云开发环境配置
  cloudEnv: 'your-env-id',  // 替换为实际的云开发环境ID
  
  // 是否开启调试模式
  debug: isDevEnv,
  
  // API配置
  api: {
    timeout: 10000,  // 请求超时时间（毫秒）
    retryCount: 3    // 重试次数
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    expireTime: 5 * 60 * 1000  // 5分钟
  },
  
  // 分页配置
  pagination: {
    pageSize: 10,
    loadMoreThreshold: 100  // 距离底部多少px触发加载更多
  },
  
  // 图片配置
  image: {
    maxSize: 5 * 1024 * 1024,  // 最大上传大小 5MB
    quality: 80,                // 压缩质量
    formats: ['jpg', 'png', 'jpeg']  // 允许的格式
  },
  
  // 联系方式
  contact: {
    email: 'contact@startupilot.com',
    wechat: 'startupilot',
    workTime: '周一至周五 9:00-18:00'
  },
  
  // 第三方服务
  services: {
    // 数据统计
    analytics: {
      enabled: true
    }
  }
}

