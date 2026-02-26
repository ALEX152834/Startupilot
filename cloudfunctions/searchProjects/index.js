// 云函数：searchProjects - AI 数据查询接口
// 专为 AI Agent（如阿里云百炼）设计，支持 HTTP 触发和小程序直接调用
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 配置常量
const CONFIG = {
  MAX_PAGE_SIZE: 20,        // 最大单页数量，防止 token 超限
  DEFAULT_PAGE_SIZE: 5,     // 默认返回数量
  CACHE_TTL: 60 * 1000,     // 简单缓存 TTL（毫秒）
  MAX_KEYWORD_LENGTH: 100,  // 关键词最大长度
  ALLOWED_CATEGORIES: ['all', 'founder', 'investor', 'service'], // 允许的分类
}

// AI 友好的字段映射（返回给 AI 的字段）
const AI_FRIENDLY_FIELDS = {
  _id: true,
  title: true,
  projectName: true,
  category: true,
  description: true,
  oneLiner: true,
  track: true,
  introduction: true,
  coreCompetitiveness: true,
  mainRegion: true,
  logo: true,
  tags: true,
  viewCount: true,
  createdAt: true
}

// 敏感字段黑名单（绝不返回）
const SENSITIVE_FIELDS = [
  'publisherUid',
  'publisherName',
  'publisherPhone',
  'publisherWechat',
  'publisherAvatar',
  'registeredEntity',
  '_openid'
]

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const startTime = Date.now()
  
  try {
    // 1. 解析参数（兼容 HTTP 触发和小程序调用）
    const params = parseParams(event)
    
    // 2. 参数校验
    const validation = validateParams(params)
    if (!validation.valid) {
      return formatResponse(-1, null, validation.message)
    }

    // 3. 执行查询
    const result = await executeSearch(params)
    
    logger.perf('总查询耗时', startTime)
    
    return formatResponse(0, result, '查询成功')
    
  } catch (err) {
    logger.error('查询异常:', err)
    return formatResponse(-1, null, '查询失败: ' + (err.message || '未知错误'))
  }
}

/**
 * 解析请求参数，兼容多种调用方式
 */
function parseParams(event) {
  let params = { ...event }
  
  // HTTP 触发：解析 body
  if (event.body) {
    try {
      const bodyParams = typeof event.body === 'string' 
        ? JSON.parse(event.body) 
        : event.body
      params = { ...params, ...bodyParams }
    } catch (e) {
      logger.warn('解析 body 失败:', e.message)
    }
  }
  
  // HTTP 触发：解析 queryStringParameters（GET 请求）
  if (event.queryStringParameters) {
    params = { ...params, ...event.queryStringParameters }
  }
  
  // 清理内部字段
  delete params.body
  delete params.queryStringParameters
  delete params.httpMethod
  delete params.headers
  delete params.path
  delete params.isBase64Encoded
  
  return params
}

/**
 * 参数校验
 */
function validateParams(params) {
  const { keyword, page, pageSize } = params
  
  // 关键词长度校验
  if (keyword && keyword.length > CONFIG.MAX_KEYWORD_LENGTH) {
    return { valid: false, message: `关键词过长，最多${CONFIG.MAX_KEYWORD_LENGTH}字符` }
  }
  
  // 页码校验
  if (page !== undefined && (isNaN(page) || page < 1)) {
    return { valid: false, message: '页码必须为正整数' }
  }
  
  // 每页数量校验
  if (pageSize !== undefined && (isNaN(pageSize) || pageSize < 1 || pageSize > CONFIG.MAX_PAGE_SIZE)) {
    return { valid: false, message: `每页数量必须在1-${CONFIG.MAX_PAGE_SIZE}之间` }
  }
  
  return { valid: true }
}

/**
 * 执行搜索查询
 */
async function executeSearch(params) {
  const {
    keyword,
    role,
    industry,
    category,
    track,
    tags,
    region,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = CONFIG.DEFAULT_PAGE_SIZE
  } = params

  // 构建查询条件
  const query = buildQuery({ keyword, role, industry, category, track, tags, region })
  
  // 构建排序
  const sort = buildSort(sortBy, sortOrder)
  
  // 计算分页
  const skip = (parseInt(page) - 1) * parseInt(pageSize)
  const limit = Math.min(parseInt(pageSize), CONFIG.MAX_PAGE_SIZE)

  // 并行执行：查询数据 + 统计总数
  const [listResult, countResult] = await Promise.all([
    db.collection('projects')
      .aggregate()
      .match(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .project(buildProjection())
      .end(),
    db.collection('projects')
      .where(query)
      .count()
  ])

  const list = (listResult.list || []).map(sanitizeProject)

  return {
    list,
    pagination: {
      page: parseInt(page),
      pageSize: limit,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / limit)
    },
    query: summarizeQuery(params) // 返回查询摘要，方便 AI 理解
  }
}

/**
 * 构建查询条件
 */
function buildQuery({ keyword, role, industry, category, track, tags, region }) {
  const conditions = []
  
  // 基础条件：只查询有效项目
  conditions.push({ status: 'active' })

  // 分类筛选
  if (category && category !== 'all') {
    conditions.push({ category: category })
  }
  
  // 角色筛选（模糊匹配分类）
  if (role) {
    conditions.push({ 
      category: db.RegExp({ regexp: escapeRegExp(role), options: 'i' }) 
    })
  }

  // 行业/赛道筛选
  if (industry) {
    conditions.push({
      $or: [
        { track: db.RegExp({ regexp: escapeRegExp(industry), options: 'i' }) },
        { tags: db.RegExp({ regexp: escapeRegExp(industry), options: 'i' }) }
      ]
    })
  }
  
  // 赛道精确筛选
  if (track) {
    conditions.push({ 
      track: db.RegExp({ regexp: escapeRegExp(track), options: 'i' }) 
    })
  }

  // 标签筛选（支持数组）
  if (tags) {
    const tagList = Array.isArray(tags) ? tags : [tags]
    conditions.push({
      tags: _.in(tagList)
    })
  }

  // 地区筛选
  if (region) {
    conditions.push({ 
      mainRegion: db.RegExp({ regexp: escapeRegExp(region), options: 'i' }) 
    })
  }

  // 关键词全文搜索（多字段 OR）
  if (keyword) {
    const keywordRegex = db.RegExp({ 
      regexp: escapeRegExp(keyword), 
      options: 'i' 
    })
    conditions.push({
      $or: [
        { title: keywordRegex },
        { projectName: keywordRegex },
        { description: keywordRegex },
        { oneLiner: keywordRegex },
        { introduction: keywordRegex },
        { coreCompetitiveness: keywordRegex },
        { tags: keywordRegex }
      ]
    })
  }

  // 合并所有条件
  return conditions.length > 1 ? { $and: conditions } : conditions[0] || {}
}

/**
 * 构建排序规则
 */
function buildSort(sortBy, sortOrder) {
  const allowedSortFields = ['createdAt', 'viewCount', 'updatedAt']
  const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
  const order = sortOrder === 'asc' ? 1 : -1
  
  return { [field]: order }
}

/**
 * 构建字段投影（只返回 AI 需要的字段）
 */
function buildProjection() {
  const projection = { ...AI_FRIENDLY_FIELDS }
  
  // 显式排除敏感字段
  SENSITIVE_FIELDS.forEach(field => {
    projection[field] = false
  })
  
  return projection
}

/**
 * 清理项目数据，确保不泄露敏感信息
 */
function sanitizeProject(project) {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(project)) {
    // 跳过敏感字段
    if (SENSITIVE_FIELDS.includes(key)) continue
    
    // 跳过空值
    if (value === null || value === undefined || value === '') continue
    
    sanitized[key] = value
  }
  
  // 格式化日期为 ISO 字符串（方便 AI 解析）
  if (sanitized.createdAt) {
    sanitized.createdAt = formatDate(sanitized.createdAt)
  }
  
  return sanitized
}

/**
 * 生成查询摘要（帮助 AI 理解查询结果）
 */
function summarizeQuery(params) {
  const parts = []
  
  if (params.keyword) parts.push(`关键词: "${params.keyword}"`)
  if (params.category && params.category !== 'all') parts.push(`分类: ${params.category}`)
  if (params.industry) parts.push(`行业: ${params.industry}`)
  if (params.track) parts.push(`赛道: ${params.track}`)
  if (params.region) parts.push(`地区: ${params.region}`)
  if (params.tags) parts.push(`标签: ${Array.isArray(params.tags) ? params.tags.join(',') : params.tags}`)
  
  return parts.length > 0 ? parts.join(', ') : '全部项目'
}

/**
 * 格式化响应
 */
function formatResponse(code, data, message) {
  const response = {
    code,
    message,
    timestamp: new Date().toISOString()
  }
  
  if (data !== null) {
    response.data = data
  }
  
  return response
}

/**
 * 转义正则特殊字符，防止注入
 */
function escapeRegExp(string) {
  if (!string || typeof string !== 'string') return ''
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return null
  try {
    return new Date(date).toISOString()
  } catch {
    return date
  }
}
