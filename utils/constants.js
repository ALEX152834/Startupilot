// 错误码定义
export const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1001,
  AUTH_ERROR: 1002,
  NO_PERMISSION: 1006,
  VIP_REQUIRED: 1003,
  NOT_FOUND: 1004,
  ALREADY_EXISTS: 1005,
  SERVER_ERROR: 9999
}

// VIP等级
export const VIP_LEVELS = {
  REGULAR: 'regular',
  NEO: 'neo'
}

// 活动类型
export const EVENT_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline'
}

// 活动状态
export const EVENT_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  FINISHED: 'finished'
}

// 预约状态
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
}

// 项目类别
export const PROJECT_CATEGORIES = {
  ALL: 'all',
  COOPERATION: '项目合作',
  FINANCING: '融资需求',
  OTHER: '其他'
}

// 项目状态
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed'
}

// 学习资源类型
export const LEARNING_TYPES = {
  CEO: 'ceo',       // 案例分析
  BEST: 'best'      // 管理工具
}

// 学习资源状态
export const RESOURCE_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  ARCHIVED: 'archived'
}

// 收藏类型
export const FAVORITE_TYPES = {
  PROJECT: 'project',
  LEARNING: 'learning',
  EVENT: 'event'
}

// 用户身份
export const USER_ROLES = {
  ENTREPRENEUR: 'entrepreneur',
  INVESTOR: 'investor',
  ADVISOR: 'advisor',
  OTHER: 'other'
}

// 用户身份中文
export const USER_ROLE_LABELS = {
  entrepreneur: '创业者',
  investor: '投资人',
  advisor: '顾问',
  other: '其他'
}

// 项目赛道
export const PROJECT_TRACKS = [
  '人工智能',
  '教育',
  '新能源',
  '医疗健康',
  '企业服务',
  '信息技术',
  '消费升级',
  '金融科技',
  '文化娱乐',
  '智能制造',
  '农业科技',
  '生物科技',
  '其他'
]

// 缓存键名
export const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  TOKEN: 'token',
  EVENTS_CACHE: 'eventsCache',
  PROJECTS_CACHE: 'projectsCache',
  LEARNING_CACHE: 'learningCache'
}

export const STORAGE_KEY_USER_INFO = STORAGE_KEYS.USER_INFO
export const STORAGE_KEY_TOKEN = STORAGE_KEYS.TOKEN

// 缓存时间（毫秒）
export const CACHE_TIME = 5 * 60 * 1000  // 5分钟

// 校验相关常量
export const PHONE_REGEX = /^1[3-9]\d{9}$/
export const FORBIDDEN_TEXT_PATTERNS = ['<script', 'javascript:', 'onerror=', 'onload=']
export const VALIDATION_LIMITS = {
  projectNameMax: 50,
  registeredEntityMax: 50,
  oneLinerMax: 100,
  introductionMax: 500,
  descriptionMax: 500,
  coreCompetitivenessMax: 300
}

// 数据埋点事件
export const TRACK_EVENTS = {
  PAGE_VIEW: 'page_view',
  TAB_SWITCH: 'tab_switch',
  SEARCH: 'search',
  EVENT_BOOK: 'event_book',
  RESOURCE_VIEW: 'resource_view',
  RESOURCE_DOWNLOAD: 'resource_download',
  FAVORITE_ADD: 'favorite_add',
  FAVORITE_REMOVE: 'favorite_remove',
  PROJECT_PUBLISH: 'project_publish',
  PROJECT_CONNECT: 'project_connect',
  FORM_SHOW: 'form_show',
  FORM_SUBMIT: 'form_submit',
  FORM_SUCCESS: 'form_success',
  LOGIN_SHOW: 'login_show',
  LOGIN_SUCCESS: 'login_success',
  VIP_UPGRADE_SHOW: 'vip_upgrade_show',
  VIP_UPGRADE_SUCCESS: 'vip_upgrade_success',
  SHARE_APP_MESSAGE: 'share_app_message',
  SHARE_TIMELINE: 'share_timeline'
}

// 空状态配置
export const EMPTY_STATE_CONFIG = {
  project: {
    icon: '💼',
    title: '暂无项目',
    description: '还没有项目，去发布一个吧',
    buttonText: '去发布项目'
  },
  favorite: {
    icon: '⭐',
    title: '暂无收藏',
    description: '还没有收藏，先去逛逛广场吧',
    buttonText: '去逛逛广场'
  }
}

