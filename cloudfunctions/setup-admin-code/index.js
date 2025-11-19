// 云函数：setup-admin-code - 创建管理员特殊兑换码
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminCode } = event
  
  // 验证调用者权限（只能通过云函数控制台调用）
  if (!adminCode) {
    return {
      success: false,
      message: '缺少管理员兑换码参数'
    }
  }
  
  try {
    // 检查是否已存在管理员兑换码
    const existingCode = await db.collection('redeem_codes')
      .where({
        type: 'admin'
      })
      .get()

    if (existingCode.data.length > 0) {
      return {
        success: false,
        message: '管理员兑换码已存在',
        data: {
          count: existingCode.data.length
        }
      }
    }

    // 创建管理员兑换码
    await db.collection('redeem_codes').add({
      data: {
        code: adminCode,
        type: "admin",
        vipLevel: "neo",
        used: false,
        createdAt: new Date()
      }
    })

    return {
      success: true,
      message: '管理员兑换码创建成功'
    }
  } catch (error) {
    logger.error('创建管理员兑换码失败:', error)
    return {
      success: false,
      message: error.message || '创建失败'
    }
  }
}
