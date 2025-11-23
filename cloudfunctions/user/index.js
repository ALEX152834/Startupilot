// 云函数：user - 用户管理
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const MSG_CHECK_SCENE = 2

async function checkContentSafety(content, openid, logPrefix = '[user]') {
  if (!content) return { ok: true }

  try {
    const msgCheck = await cloud.openapi.security.msgSecCheck({
      content,
      version: 2,
      scene: MSG_CHECK_SCENE,
      openid
    })

    if (msgCheck?.result?.suggest === 'pass') {
      return { ok: true }
    }

    return {
      ok: false,
      message: '内容包含敏感信息'
    }
  } catch (error) {
    logger.error(`${logPrefix} 内容安全校验失败`, error)
    return {
      ok: false,
      message: '安全检测不通过'
    }
  }
}

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'updateName':
        return await updateName(params, wxContext)
      case 'saveRegistrationInfo':
        return await saveRegistrationInfo(params, wxContext)
      case 'getStats':
        return await getStats(params, wxContext)
      case 'bindPhone':
        return await bindPhone(params, wxContext)
      case 'updateProfile':
        return await updateProfile(params, wxContext)
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
 * 更新昵称
 */
async function updateName(params, wxContext) {
  const { OPENID } = wxContext
  const { newName } = params

  const trimmedName = (newName || '').trim()
  if (!trimmedName) {
    return {
      code: 1001,
      message: '昵称不能为空'
    }
  }

  const safeCheck = await checkContentSafety(trimmedName, OPENID, '[user.updateName]')
  if (!safeCheck.ok) {
    return {
      code: 500,
      message: safeCheck.message
    }
  }

  await db.collection('users')
    .where({
      _openid: OPENID
    })
    .update({
      data: {
        name: trimmedName,
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: '昵称更新成功',
    data: null
  }
}

/**
 * 保存报名信息
 */
async function saveRegistrationInfo(params, wxContext) {
  const { OPENID } = wxContext
  const { name, phone, wechat, role, organization, attendees } = params

  // 验证必填字段（只验证核心字段）
  if (!name || !phone || !role) {
    return {
      code: 1001,
      message: '请填写完整信息'
    }
  }

  // 验证称呼长度
  if (name.trim().length < 2 || name.trim().length > 20) {
    return {
      code: 1001,
      message: '称呼长度应在2-20个字符之间'
    }
  }

  // 验证手机号格式
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone)) {
    return {
      code: 1001,
      message: '请输入正确的手机号'
    }
  }

  // 先查询用户当前信息，检查是否为管理员
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .get()

  const currentUser = userResult.data[0]
  const isAdmin = currentUser && currentUser.role === 'admin'

  // 准备更新数据
  const updateData = {
    name: name.trim(),
    phone,
    wechat: wechat || '',
    organization: organization || '',
    attendees: attendees || 1,
    hasFilledRegistrationInfo: true,
    updatedAt: new Date()
  }

  // 只有非管理员才更新 role 字段
  if (!isAdmin) {
    updateData.role = role
  }

  await db.collection('users')
    .where({
      _openid: OPENID
    })
    .update({
      data: updateData
    })

  return {
    code: 0,
    message: '信息保存成功',
    data: null
  }
}

/**
 * 更新基础资料
 */
async function updateProfile(params = {}, wxContext) {
  const { OPENID } = wxContext
  const { name, phone, wechat } = params

  if (!OPENID) {
    return {
      code: 1002,
      message: '未授权访问'
    }
  }

  const updateData = {}

  if (typeof name === 'string') {
    const trimmed = name.trim()
    if (!trimmed) {
      return {
        code: 1001,
        message: '昵称不能为空'
      }
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      return {
        code: 1001,
        message: '昵称长度应在2-20个字符之间'
      }
    }
    updateData.name = trimmed

    const safeCheck = await checkContentSafety(trimmed, OPENID, '[user.updateProfile.name]')
    if (!safeCheck.ok) {
      return {
        code: 500,
        message: safeCheck.message
      }
    }
  }

  if (typeof phone === 'string') {
    const phoneValue = phone.trim()
    if (phoneValue) {
      const phoneReg = /^1[3-9]\d{9}$/
      if (!phoneReg.test(phoneValue)) {
        return {
          code: 1001,
          message: '请输入正确的手机号'
        }
      }
      updateData.phone = phoneValue
    } else {
      updateData.phone = ''
    }
  }

  if (typeof wechat === 'string') {
    const wechatValue = wechat.trim()
    if (wechatValue) {
      const wechatReg = /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/
      if (!wechatReg.test(wechatValue)) {
        return {
          code: 1001,
          message: '请输入正确的微信号'
        }
      }
      updateData.wechat = wechatValue

      const safeCheck = await checkContentSafety(wechatValue, OPENID, '[user.updateProfile.wechat]')
      if (!safeCheck.ok) {
        return {
          code: 500,
          message: safeCheck.message
        }
      }
    } else {
      updateData.wechat = ''
    }
  }

  if (Object.keys(updateData).length === 0) {
    return {
      code: 1001,
      message: '请至少填写一项信息'
    }
  }

  updateData.updatedAt = new Date()

  await db.collection('users')
    .where({
      _openid: OPENID
    })
    .update({
      data: updateData
    })

  return {
    code: 0,
    message: '信息更新成功',
    data: updateData
  }
}

/**
 * 获取用户统计
 */
async function getStats(params, wxContext) {
  const { OPENID } = wxContext
  const _ = db.command

  // 获取用户UID
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      uid: true
    })
    .get()

  if (userResult.data.length === 0) {
    return {
      code: 1002,
      message: '用户不存在'
    }
  }

  const uid = userResult.data[0].uid

  // 从实际数据库记录计算统计数据
  const [favoritesCount, postsCount, registrationsCount] = await Promise.all([
    db.collection('favorites')
      .where({
        uid: uid
      })
      .count(),
    db.collection('projects')
      .where({
        publisherUid: uid
      })
      .count(),
    db.collection('bookings')
      .where({
        uid: uid,
        status: 'confirmed'
      })
      .count()
  ])

  // 确保数值不为负数
  const stats = {
    favoritesCount: Math.max(0, favoritesCount.total || 0),
    postsCount: Math.max(0, postsCount.total || 0),
    registrationsCount: Math.max(0, registrationsCount.total || 0)
  }

  // 更新 user_stats 表（保持同步）
  await db.collection('user_stats')
    .where({
      uid: uid
    })
    .update({
      data: {
        ...stats,
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: 'success',
    data: stats
  }
}

/**
 * 绑定手机号
 */
async function bindPhone(params, wxContext) {
  const { OPENID } = wxContext
  const { cloudID } = params || {}

  if (!cloudID) {
    return {
      code: 1001,
      message: '缺少手机号凭证'
    }
  }

  const openData = await cloud.getOpenData({
    list: [cloudID]
  })

  if (!openData.list || !openData.list.length || !openData.list[0].data) {
    return {
      code: 1002,
      message: '无法获取手机号'
    }
  }

  const { phoneNumber } = openData.list[0].data

  if (!phoneNumber) {
    return {
      code: 1002,
      message: '手机号授权失败'
    }
  }

  await db.collection('users')
    .where({
      _openid: OPENID
    })
    .update({
      data: {
        phone: phoneNumber,
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: 'success',
    data: {
      phone: phoneNumber
    }
  }
}
