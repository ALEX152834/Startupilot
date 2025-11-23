// 云函数：learning - 学习资源管理
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const normalizeVipLevel = (level) => {
  const normalized = (level || '').toString().trim().toLowerCase()
  return normalized === 'neo' ? 'neo' : 'regular'
}

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'getList':
        return await getList(params, wxContext)
      case 'getResource':
        return await getResource(params, wxContext)
      default:
        return {
          code: 1001,
          message: '未知操作'
        }
    }
  } catch (error) {
    logger.error('云函数执行失败:', error)
    return {
      code: 9999,
      message: error.message || '服务器错误'
    }
  }
}

/**
 * 获取资源列表
 */
async function getList(params, wxContext) {
  const { OPENID } = wxContext
  const { type, keyword, page = 1, pageSize = 10 } = params

  // 获取用户信息
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .get()

  const user = userResult.data[0] || null

  // 构建查询条件
  const query = {
    status: 'published'
  }

  if (type) {
    query.type = type
  }

  // 全文搜索
  if (keyword) {
    query.$or = [
      { title: new db.RegExp({ regexp: keyword, options: 'i' }) },
      { description: new db.RegExp({ regexp: keyword, options: 'i' }) }
    ]
  }

  // 查询资源列表
  const countResult = await db.collection('learning_resources')
    .where(query)
    .count()

  const resourcesResult = await db.collection('learning_resources')
    .where(query)
    .orderBy('publishedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 查询收藏状态
  let favoritedIds = []
  if (user) {
    const favoritesResult = await db.collection('favorites')
      .where({
        uid: user.uid,
        itemType: 'learning'
      })
      .field({
        itemId: true
      })
      .get()
    
    favoritedIds = favoritesResult.data.map(f => f.itemId)
  }

  // 添加权限和收藏状态
  const list = resourcesResult.data.map(resource => {
    const requiredVipLevel = normalizeVipLevel(resource.requiredVipLevel)
    const canAccess = !user ? false : (
      requiredVipLevel === 'regular' ||
      (requiredVipLevel === 'neo' && user.vipLevel === 'neo' && new Date(user.vipExpiry) > new Date())
    )

    return {
      ...resource,
      requiredVipLevel,
      canAccess,
      isFavorited: favoritedIds.includes(resource._id)
    }
  })

  return {
    code: 0,
    message: 'success',
    data: {
      list,
      total: countResult.total
    }
  }
}

/**
 * 获取资源详情/下载
 */
async function getResource(params, wxContext) {
  const { OPENID } = wxContext
  const { resourceId } = params

  // 获取用户信息
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .get()

  if (userResult.data.length === 0) {
    return {
      code: 1002,
      message: '请先登录'
    }
  }

  const user = userResult.data[0]

  // 获取资源信息
  const resourceResult = await db.collection('learning_resources')
    .doc(resourceId)
    .get()

  if (!resourceResult.data) {
    return {
      code: 1004,
      message: '资源不存在'
    }
  }

  const resource = resourceResult.data

  // 检查VIP权限
  const requiredVipLevel = normalizeVipLevel(resource.requiredVipLevel)
  if (requiredVipLevel === 'neo') {
    if (user.vipLevel !== 'neo') {
      return {
        code: 1003,
        message: '需要NEO会员',
        data: {
          requiredVipLevel: 'neo'
        }
      }
    }

    // 检查是否过期
    const vipExpiry = new Date(user.vipExpiry)
    if (vipExpiry < new Date()) {
      return {
        code: 1003,
        message: 'NEO会员已过期',
        data: {
          requiredVipLevel: 'neo'
        }
      }
    }
  }

  const normalizeUrl = async (url) => {
    if (!url) return ''
    if (!url.startsWith('cloud://')) return url
    const res = await cloud.getTempFileURL({ fileList: [url] })
    return res.fileList?.[0]?.tempFileURL || url
  }

  const downloadUrl = await normalizeUrl(resource.downloadUrl)
  if (!downloadUrl) {
    return {
      code: 1005,
      message: '资源未配置下载链接'
    }
  }

  // 更新下载次数
  await db.collection('learning_resources')
    .doc(resourceId)
    .update({
      data: {
        downloadCount: _.inc(1)
      }
    })

  await db.collection('user_stats')
    .where({
      uid: user.uid
    })
    .update({
      data: {
        resourceDownloads: _.inc(1),
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: 'success',
    data: {
      downloadUrl,
      fileSize: resource.fileSize
    }
  }
}

