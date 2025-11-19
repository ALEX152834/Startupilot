// 云函数：vip - VIP管理
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'verifyRedeemCode':
        return await verifyRedeemCode(params, wxContext)
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
 * 验证兑换码
 */
async function verifyRedeemCode(params, wxContext) {
  const { OPENID } = wxContext
  const { code } = params

  // 查询兑换码
  const codeResult = await db.collection('redeem_codes')
    .where({
      code: code
    })
    .get()

  if (codeResult.data.length === 0) {
    return {
      code: 1004,
      message: '兑换码不存在'
    }
  }

  const redeemCode = codeResult.data[0]

  // 检查是否已使用（特殊兑换码除外）
  if (redeemCode.used && redeemCode.type !== 'admin') {
    return {
      code: 1005,
      message: '兑换码已使用'
    }
  }

  // 检查是否过期（特殊兑换码除外）
  if (redeemCode.type !== 'admin' && redeemCode.expiryDate && new Date(redeemCode.expiryDate) < new Date()) {
    return {
      code: 1004,
      message: '兑换码已过期'
    }
  }

  // 获取用户信息
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .get()

  if (userResult.data.length === 0) {
    return {
      code: 1002,
      message: '用户不存在'
    }
  }

  const user = userResult.data[0]
  const now = new Date()

  // 处理管理员特殊兑换码
  if (redeemCode.type === 'admin') {
    // 设置永久VIP（100年）
    const vipExpiry = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)

    // 更新用户为管理员
    await db.collection('users')
      .where({
        _openid: OPENID
      })
      .update({
        data: {
          role: 'admin',
          vipLevel: 'neo',
          vipExpiry: vipExpiry,
          updatedAt: now
        }
      })

    return {
      code: 0,
      message: '恭喜！您已获得管理员权限',
      data: {
        vipLevel: 'neo',
        vipExpiry: vipExpiry.toISOString().split('T')[0],
        role: 'admin'
      }
    }
  }

  // 处理普通兑换码
  // 计算VIP到期时间
  const validDays = redeemCode.validDays || 365
  const vipExpiry = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000)

  // 更新用户VIP等级
  await db.collection('users')
    .where({
      _openid: OPENID
    })
    .update({
      data: {
        vipLevel: redeemCode.vipLevel,
        vipExpiry: vipExpiry,
        updatedAt: now
      }
    })

  // 标记兑换码已使用
  await db.collection('redeem_codes')
    .doc(redeemCode._id)
    .update({
      data: {
        used: true,
        usedBy: user.uid,
        usedAt: now
      }
    })

  return {
    code: 0,
    message: '兑换成功!您已升级为NEO会员',
    data: {
      vipLevel: redeemCode.vipLevel,
      vipExpiry: vipExpiry.toISOString().split('T')[0]
    }
  }
}

