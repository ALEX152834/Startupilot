// 云函数：admin - 管理员功能
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
    await verifyAdmin(wxContext)

    switch (action) {
      case 'generateRedeemCodes':
        return await generateRedeemCodes(params, wxContext)
      case 'getRedeemCodes':
        return await getRedeemCodes(params, wxContext)
      case 'getAllBookings':
        return await getAllBookings(params, wxContext)
      case 'exportBookings':
        return await exportBookings(params, wxContext)
      case 'getPublishPermission':
        return await getPublishPermission(params, wxContext)
      case 'setPublishPermission':
        return await setPublishPermission(params, wxContext)
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

async function verifyAdmin(wxContext) {
  const { OPENID } = wxContext || {}
  if (!OPENID) {
    throw new Error('无权限访问')
  }

  const res = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      role: true
    })
    .limit(1)
    .get()

  const user = res.data?.[0]
  if (!user || user.role !== 'admin') {
    throw new Error('无权限访问')
  }
}

/**
 * 生成兑换码
 */
async function generateRedeemCodes(params, wxContext) {
  const { OPENID } = wxContext
  const { count = 1, vipLevel = 'neo', validDays = 31, expiryDate } = params

  const codes = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    // 生成16位随机兑换码（大写字母和数字）
    const code = generateCode(16)

    const redeemCode = {
      code: code,
      vipLevel: vipLevel,
      validDays: validDays,
      used: false,
      usedBy: null,
      usedAt: null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: OPENID,
      createdAt: now
    }

    await db.collection('redeem_codes').add({
      data: redeemCode
    })

    codes.push(code)
  }

  return {
    code: 0,
    message: `成功生成${count}个兑换码`,
    data: {
      codes: codes
    }
  }
}

/**
 * 生成随机码
 */
function generateCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去除易混淆字符
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 获取兑换码列表
 */
async function getRedeemCodes(params, wxContext) {
  const result = await db.collection('redeem_codes')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return {
    code: 0,
    message: 'success',
    data: result.data
  }
}


/**
 * 获取所有预约数据
 */
async function getAllBookings(params, wxContext) {
  const { eventId, status, startDate, endDate } = params || {}

  // 构建查询条件
  const query = {}
  if (eventId) {
    query.eventId = eventId
  }
  if (status) {
    query.status = status
  }

  // 查询预约列表
  const bookingsResult = await db.collection('bookings')
    .where(query)
    .orderBy('registeredAt', 'desc')
    .limit(1000)
    .get()

  const bookings = bookingsResult.data

  // 关联用户信息
  const uids = [...new Set(bookings.map(b => b.uid))]
  const usersResult = await db.collection('users')
    .where({
      uid: db.command.in(uids)
    })
    .field({
      uid: true,
      name: true,
      phone: true,
      wechat: true,
      role: true
    })
    .get()

  const usersMap = {}
  usersResult.data.forEach(user => {
    usersMap[user.uid] = user
  })

  // 合并用户信息（优先使用预约记录中的快照，如果没有则从用户表获取）
  const enrichedBookings = bookings.map(booking => {
    const user = usersMap[booking.uid] || {}
    return {
      ...booking,
      userName: booking.userName || user.name,
      userPhone: booking.userPhone || user.phone,
      userWechat: booking.userWechat || user.wechat,
      userRole: booking.userRole || user.role
    }
  })

  // 统计数据（剔除已取消的预约）
  const confirmedBookings = enrichedBookings.filter(b => b.status !== 'cancelled')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = confirmedBookings.filter(b => 
    new Date(b.registeredAt) >= today
  ).length

  return {
    code: 0,
    message: 'success',
    data: {
      list: enrichedBookings,  // 返回所有预约（包括已取消的，用于显示）
      total: Math.max(0, confirmedBookings.length),  // 总数：只统计未取消的
      todayCount: Math.max(0, todayCount)  // 今日新增：只统计未取消的
    }
  }
}

/**
 * 导出预约数据（返回 CSV 格式）
 */
async function exportBookings(params, wxContext) {
  const result = await getAllBookings(params, wxContext)
  
  if (result.code !== 0) {
    return result
  }

  const bookings = result.data.list

  // 转换为 CSV 格式
  const headers = [
    '预约ID',
    '活动编号',
    '活动名称',
    '活动类型',
    '活动日期',
    '活动时间',
    '地点',
    '用户ID',
    '用户姓名',
    '联系电话',
    '微信号',
    '身份',
    '预约时间',
    '状态'
  ]

  const rows = bookings.map(b => [
    b._id,
    b.eventNumber || '-',
    b.eventTitle,
    b.eventType === 'online' ? '线上' : '线下',
    b.date,
    b.time,
    b.location || '-',
    b.uid,
    b.userName || '-',
    b.userPhone || '-',
    b.userWechat || '-',
    getRoleText(b.userRole),
    formatDateTime(b.registeredAt),
    getStatusText(b.status)
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  return {
    code: 0,
    message: 'success',
    data: {
      csv: csv,
      filename: `bookings_${Date.now()}.csv`
    }
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * 获取身份文本
 */
function getRoleText(role) {
  const roleMap = {
    entrepreneur: '创业者',
    investor: '投资人',
    advisor: '顾问',
    other: '其他'
  }
  return roleMap[role] || '-'
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const statusMap = {
    confirmed: '已确认',
    cancelled: '已取消',
    completed: '已完成'
  }
  return statusMap[status] || status
}

/**
 * 查询用户发布权限
 */
async function getPublishPermission(params = {}) {
  const { keyword } = params
  if (!keyword) {
    return {
      code: 1001,
      message: '请输入用户UID或手机号'
    }
  }

  const query = db.collection('users')
    .where(
      _.or([
        { uid: keyword },
        { phone: keyword }
      ])
    )
    .limit(1)

  const result = await query.get()

  if (!result.data.length) {
    return {
      code: 1002,
      message: '未找到对应用户'
    }
  }

  const user = result.data[0]

  return {
    code: 0,
    message: 'success',
    data: {
      user: {
        uid: user.uid,
        name: user.name,
        phone: user.phone,
        role: user.role,
        canPublishProject: user.canPublishProject !== false
      }
    }
  }
}

/**
 * 更新用户发布权限
 */
async function setPublishPermission(params = {}) {
  const { uid, canPublish } = params

  if (!uid || typeof canPublish === 'undefined') {
    return {
      code: 1001,
      message: '缺少必要参数'
    }
  }

  const updateResult = await db.collection('users')
    .where({ uid })
    .update({
      data: {
        canPublishProject: !!canPublish,
        updatedAt: new Date()
      }
    })

  if (!updateResult.stats || updateResult.stats.updated === 0) {
    return {
      code: 1002,
      message: '用户不存在或更新失败'
    }
  }

  return {
    code: 0,
    message: 'success',
    data: null
  }
}
