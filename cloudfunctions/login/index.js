// 云函数：login - 微信登录
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成唯一UID
function generateUID() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'login':
        return await login(params, wxContext)
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
 * 微信登录
 */
async function login(params = {}, wxContext) {
  const { OPENID } = wxContext
  const profile = params.profile || {}
  const code = params.code

  if (!code) {
    return {
      code: 1001,
      message: '缺少登录凭证 code'
    }
  }

  // 使用云调用方式获取 openid 和 session_key
  // 注意：在云函数中，可以直接通过 wxContext 获取 OPENID
  // 不需要调用 code2Session API
  const openid = OPENID
  const unionid = wxContext.UNIONID || ''
  
  // 生成 session_key 的哈希值（用于 token 生成）
  const session_key = crypto.createHash('sha256')
    .update(`${openid}:${Date.now()}:${code}`)
    .digest('hex')

  if (openid !== OPENID) {
    logger.warn('[login] OPENID 不一致', openid, OPENID)
  }

  // 查询用户是否存在
  const userQuery = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .get()

  let userInfo

  if (userQuery.data.length === 0) {
    // 用户不存在，创建新用户
    const uid = generateUID()
    const now = new Date()
    const token = crypto.createHmac('sha256', session_key)
      .update(`${openid}:${now.getTime()}`)
      .digest('hex')
    const tokenExpireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const newUser = {
      _openid: OPENID,
      uid: uid,
      name: profile.nickName || '创业者',
      wechatAvatar: profile.avatarUrl || '',
      vipLevel: 'regular',
      vipExpiry: null,
      phone: '',
      wechat: '',
      role: '',
      organization: '',
      hasFilledRegistrationInfo: false,
      canPublishProject: true,
      unionId: unionid,
      sessionKeyHash: crypto.createHash('sha256').update(session_key).digest('hex'),
      token,
      tokenExpireAt,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now
    }

    await db.collection('users').add({
      data: newUser
    })

    // 初始化用户统计
    await db.collection('user_stats').add({
      data: {
        uid: uid,
        favoritesCount: 0,
        postsCount: 0,
        registrationsCount: 0,
        resourceDownloads: 0,
        projectViews: 0,
        lastLoginAt: now,
        updatedAt: now
      }
    })

    userInfo = newUser
  } else {
    // 用户已存在，更新资料与最后登录时间
    userInfo = userQuery.data[0]
    const now = new Date()
    const token = crypto.createHmac('sha256', session_key)
      .update(`${openid}:${now.getTime()}`)
      .digest('hex')
    const tokenExpireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const updateData = {
      lastLoginAt: now,
      updatedAt: now,
      token,
      tokenExpireAt,
      sessionKeyHash: crypto.createHash('sha256').update(session_key).digest('hex')
    }

    if (profile.nickName && profile.nickName !== userInfo.name) {
      updateData.name = profile.nickName
      userInfo.name = profile.nickName
    }

    if (profile.avatarUrl && profile.avatarUrl !== userInfo.wechatAvatar) {
      updateData.wechatAvatar = profile.avatarUrl
      userInfo.wechatAvatar = profile.avatarUrl
    }

    if (unionid && unionid !== userInfo.unionId) {
      updateData.unionId = unionid
      userInfo.unionId = unionid
    }

    await db.collection('user_stats')
      .where({
        uid: userInfo.uid
      })
      .update({
        data: {
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      })

    if (Object.keys(updateData).length > 0) {
      await db.collection('users')
        .where({
          _openid: OPENID
        })
        .update({
          data: updateData
        })
    }

    userInfo.token = token
    userInfo.tokenExpireAt = tokenExpireAt
  }

  return {
    code: 0,
    message: 'success',
    data: {
      userInfo: {
        uid: userInfo.uid,
        name: userInfo.name,
        wechatAvatar: userInfo.wechatAvatar,
        vipLevel: userInfo.vipLevel,
        vipExpiry: userInfo.vipExpiry,
        hasFilledRegistrationInfo: userInfo.hasFilledRegistrationInfo,
        phone: userInfo.phone || '',
        role: userInfo.role || '',
        organization: userInfo.organization || '',
        canPublishProject: userInfo.canPublishProject !== false,
        unionId: userInfo.unionId || ''
      },
      token: userInfo.token,
      tokenExpireAt: userInfo.tokenExpireAt
    }
  }
}

