// 云函数：event - 活动管理
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
      case 'getList':
        return await getList(params, wxContext)
      case 'book':
        return await book(params, wxContext)
      case 'cancelBooking':
        return await cancelBooking(params, wxContext)
      case 'getMyBookings':
        return await getMyBookings(params, wxContext)
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
 * 获取活动列表
 */
async function getList(params, wxContext) {
  const { OPENID } = wxContext
  const { status = 'active', page = 1, pageSize = 10 } = params

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
  const query = {}
  if (status !== 'all') {
    query.status = status
  }

  // 查询活动列表
  const countResult = await db.collection('events')
    .where(query)
    .count()

  const eventsResult = await db.collection('events')
    .where(query)
    .orderBy('date', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 如果用户已登录，查询预约状态
  let bookedEventIds = []
  if (uid) {
    const bookingsResult = await db.collection('bookings')
      .where({
        uid: uid,
        status: _.neq('cancelled')
      })
      .field({
        eventId: true
      })
      .get()
    
    bookedEventIds = bookingsResult.data.map(b => b.eventId)
  }

  // 添加预约状态
  const list = eventsResult.data.map(event => ({
    ...event,
    isBooked: bookedEventIds.includes(event._id)
  }))

  return {
    code: 0,
    message: 'success',
    data: {
      list,
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 预约活动
 */
async function book(params, wxContext) {
  const { OPENID } = wxContext
  const { eventId, eventInfo } = params

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

  // 检查是否已预约（包括已取消的）
  const existingBooking = await db.collection('bookings')
    .where({
      uid: user.uid,
      eventId: eventId
    })
    .get()

  if (existingBooking.data.length > 0) {
    const booking = existingBooking.data[0]
    
    // 如果是已取消的预约，重新激活
    if (booking.status === 'cancelled') {
      await db.collection('bookings')
        .doc(booking._id)
        .update({
          data: {
            status: 'confirmed',
            updatedAt: new Date()
          }
        })
      
      return {
        code: 0,
        message: '预约成功',
        data: {
          bookingId: booking._id
        }
      }
    }
    
    // 已经是确认状态，返回已预约
    return {
      code: 1005,
      message: '已预约该活动'
    }
  }

  let eventData = null
  let isLocalEvent = eventId.startsWith('local-')

  if (isLocalEvent) {
    // 本地活动：使用前端传来的活动信息
    if (!eventInfo) {
      return {
        code: 1004,
        message: '缺少活动信息'
      }
    }
    eventData = eventInfo
  } else {
    // 云端活动：从数据库查询
    const eventResult = await db.collection('events')
      .doc(eventId)
      .get()

    if (!eventResult.data) {
      return {
        code: 1004,
        message: '活动不存在'
      }
    }
    eventData = eventResult.data
  }

  // 创建预约记录（保存用户信息快照）
  const bookingResult = await db.collection('bookings').add({
    data: {
      uid: user.uid,
      userName: user.name || '',
      userPhone: user.phone || '',
      userWechat: user.wechat || '',
      userRole: user.role || '',
      eventId: eventId,
      eventNumber: eventData.eventNumber || '',
      eventTitle: eventData.title,
      eventType: eventData.type || 'online',
      date: eventData.date,
      time: eventData.time,
      location: eventData.location || '',
      status: 'confirmed',
      isLocalEvent: isLocalEvent,
      registeredAt: new Date(),
      updatedAt: new Date()
    }
  })

  // 只有云端活动才更新参与人数；与用户统计并行
  const updates = []
  if (!isLocalEvent) {
    updates.push(
      db.collection('events')
        .doc(eventId)
        .update({
          data: {
            currentParticipants: _.inc(1)
          }
        })
    )
  }

  updates.push(
    db.collection('user_stats')
      .where({
        uid: user.uid
      })
      .update({
        data: {
          registrationsCount: _.inc(1),
          updatedAt: new Date()
        }
      })
  )

  await Promise.all(updates)

  return {
    code: 0,
    message: '预约成功',
    data: {
      bookingId: bookingResult._id
    }
  }
}

/**
 * 取消预约
 */
async function cancelBooking(params, wxContext) {
  const { OPENID } = wxContext
  const { eventId } = params

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

  // 更新预约状态、活动参与人数、用户统计并行
  await Promise.all([
    db.collection('bookings')
      .where({
        uid: uid,
        eventId: eventId
      })
      .update({
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      }),
    db.collection('events')
      .doc(eventId)
      .update({
        data: {
          currentParticipants: _.inc(-1)
        }
      }),
    db.collection('user_stats')
      .where({
        uid: uid
      })
      .update({
        data: {
          registrationsCount: _.inc(-1),
          updatedAt: new Date()
        }
      })
  ])

  return {
    code: 0,
    message: '取消成功',
    data: null
  }
}

/**
 * 获取我的预约
 */
async function getMyBookings(params, wxContext) {
  const { OPENID } = wxContext
  const { status = 'all' } = params

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
  if (status !== 'all') {
    query.status = status
  }

  // 查询预约列表
  const bookingsResult = await db.collection('bookings')
    .where(query)
    .orderBy('registeredAt', 'desc')
    .get()

  return {
    code: 0,
    message: 'success',
    data: {
      list: bookingsResult.data
    }
  }
}

