// 云函数：favorite - 收藏管理
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'add':
        return await add(params, wxContext)
      case 'remove':
        return await remove(params, wxContext)
      case 'getMyFavorites':
        return await getMyFavorites(params, wxContext)
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
 * 添加收藏
 */
async function add(params, wxContext) {
  const { OPENID } = wxContext
  const { itemId, itemType, title, description, image, category } = params

  // 获取用户UID
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      uid: true
    })
    .get()

  const uid = userResult.data[0]?.uid

  // 检查是否已收藏
  const existingFavorite = await db.collection('favorites')
    .where({
      uid: uid,
      itemId: itemId,
      itemType: itemType
    })
    .get()

  if (existingFavorite.data.length > 0) {
    return {
      code: 1005,
      message: '已收藏'
    }
  }

  // 添加收藏
  await db.collection('favorites').add({
    data: {
      uid: uid,
      itemId: itemId,
      itemType: itemType,
      title: title,
      description: description || '',
      image: image || '',
      category: category || '',
      favoritedAt: new Date()
    }
  })

  // 更新用户统计
  await db.collection('user_stats')
    .where({
      uid: uid
    })
    .update({
      data: {
        favoritesCount: _.inc(1),
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: '收藏成功',
    data: null
  }
}

/**
 * 取消收藏
 */
async function remove(params, wxContext) {
  const { OPENID } = wxContext
  const { itemId } = params

  // 获取用户UID
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      uid: true
    })
    .get()

  const uid = userResult.data[0]?.uid

  // 删除收藏
  const removeResult = await db.collection('favorites')
    .where({
      uid: uid,
      itemId: itemId
    })
    .remove()

  const removedCount = removeResult?.stats?.removed ?? removeResult?.removed ?? 0

  if (removedCount > 0) {
    // 更新用户统计（仅在确实删除记录时）
    await db.collection('user_stats')
      .where({
        uid: uid
      })
      .update({
        data: {
          favoritesCount: _.inc(-1),
          updatedAt: new Date()
        }
      })
  }

  return {
    code: 0,
    message: removedCount > 0 ? '取消收藏' : '收藏记录不存在',
    data: null
  }
}

/**
 * 获取我的收藏
 */
async function getMyFavorites(params, wxContext) {
  const { OPENID } = wxContext
  const { itemType = 'all' } = params

  // 获取用户UID
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      uid: true
    })
    .get()

  const uid = userResult.data[0]?.uid

  // 构建查询条件
  const query = { uid }
  if (itemType !== 'all') {
    query.itemType = itemType
  }

  // 查询收藏列表
  const favoritesResult = await db.collection('favorites')
    .where(query)
    .orderBy('favoritedAt', 'desc')
    .get()

  return {
    code: 0,
    message: 'success',
    data: {
      list: favoritesResult.data
    }
  }
}

