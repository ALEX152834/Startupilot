/**
 * 导出预约数据脚本
 * 使用方法：node scripts/export-bookings.js
 */

const cloud = require('wx-server-sdk')
const fs = require('fs')
const path = require('path')

const DEFAULT_CLOUD_ENV_ID = 'cloud1-3gx5i5y8f78c0ac6'
const CLOUD_ENV_ID = process.env.VITE_CLOUD_ENV_ID || DEFAULT_CLOUD_ENV_ID

// 初始化云开发
cloud.init({
  env: CLOUD_ENV_ID
})

const db = cloud.database()

async function exportBookings() {
  try {
    console.log('开始导出预约数据...')

    // 查询所有预约
    const bookingsResult = await db.collection('bookings')
      .orderBy('registeredAt', 'desc')
      .limit(1000)
      .get()

    const bookings = bookingsResult.data
    console.log(`找到 ${bookings.length} 条预约记录`)

    // 获取用户信息
    const uids = [...new Set(bookings.map(b => b.uid))]
    const usersResult = await db.collection('users')
      .where({
        uid: db.command.in(uids)
      })
      .get()

    const usersMap = {}
    usersResult.data.forEach(user => {
      usersMap[user.uid] = user
    })

    // 合并数据
    const enrichedBookings = bookings.map(booking => {
      const user = usersMap[booking.uid] || {}
      return {
        预约ID: booking._id,
        活动编号: booking.eventNumber || '-',
        活动名称: booking.eventTitle,
        活动类型: booking.eventType === 'online' ? '线上' : '线下',
        活动日期: booking.date,
        活动时间: booking.time,
        地点: booking.location || '-',
        用户ID: booking.uid,
        用户姓名: user.name || '-',
        联系电话: user.phone || '-',
        微信号: user.wechat || '-',
        身份: getRoleText(user.role),
        预约时间: formatDateTime(booking.registeredAt),
        状态: getStatusText(booking.status)
      }
    })

    // 转换为 CSV
    const headers = Object.keys(enrichedBookings[0])
    const csv = [
      headers.join(','),
      ...enrichedBookings.map(row => 
        headers.map(h => `"${row[h]}"`).join(',')
      )
    ].join('\n')

    // 保存文件
    const filename = `bookings_${Date.now()}.csv`
    const filepath = path.join(__dirname, '..', 'exports', filename)
    
    // 确保目录存在
    const dir = path.dirname(filepath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filepath, '\uFEFF' + csv, 'utf8') // 添加 BOM 以支持中文
    
    console.log(`✅ 导出成功！`)
    console.log(`文件路径：${filepath}`)
    console.log(`总记录数：${enrichedBookings.length}`)

    // 统计信息
    const stats = {
      总预约数: enrichedBookings.length,
      已确认: enrichedBookings.filter(b => b.状态 === '已确认').length,
      已取消: enrichedBookings.filter(b => b.状态 === '已取消').length,
      线上活动: enrichedBookings.filter(b => b.活动类型 === '线上').length,
      线下活动: enrichedBookings.filter(b => b.活动类型 === '线下').length
    }

    console.log('\n📊 统计信息：')
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })

  } catch (error) {
    console.error('❌ 导出失败:', error)
  }
}

function getRoleText(role) {
  const roleMap = {
    entrepreneur: '创业者',
    investor: '投资人',
    advisor: '顾问',
    other: '其他'
  }
  return roleMap[role] || '-'
}

function getStatusText(status) {
  const statusMap = {
    confirmed: '已确认',
    cancelled: '已取消',
    completed: '已完成'
  }
  return statusMap[status] || status
}

function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 运行导出
exportBookings()
