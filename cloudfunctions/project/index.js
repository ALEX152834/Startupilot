// 云函数：project - 项目管理
const cloud = require('wx-server-sdk')
const { logger } = require('./logger')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const DUPLICATE_SUBMIT_WINDOW = 5000

exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'getList':
        return await getList(params, wxContext)
      case 'publish':
        return await publish(params, wxContext)
      case 'getMyPosts':
        return await getMyPosts(params, wxContext)
      case 'delete':
        return await deleteProject(params, wxContext)
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
 * 获取项目列表
 */
const MAX_USER_QUERY_COUNT = 20

async function getList(params = {}, wxContext = {}) {
  const { category, keyword, page = 1, pageSize = 10, includePrivate: includePrivateParam = false } = params
  const { OPENID } = wxContext || {}

  let allowPrivateFields = false

  if (includePrivateParam && OPENID) {
    const userResult = await db.collection('users')
      .where({
        _openid: OPENID
      })
      .field({
        role: true,
        permissions: true,
        canViewPrivateContacts: true
      })
      .limit(1)
      .get()

    const requester = userResult.data?.[0]
    if (requester) {
      const hasAdminRole = requester.role === 'admin'
      const hasContactPermission = requester.canViewPrivateContacts === true
      const hasPermissionFlag = Array.isArray(requester.permissions) && (
        requester.permissions.includes('viewPrivateContacts') ||
        requester.permissions.includes('viewProjectPrivateContact')
      )
      allowPrivateFields = hasAdminRole || hasContactPermission || hasPermissionFlag
    }
  }

  const shouldIncludePrivate = includePrivateParam && allowPrivateFields

  // 构建查询条件
  const query = {
    status: 'active'
  }

  if (category && category !== 'all') {
    query.category = category
  }

  // 全文搜索
  if (keyword) {
    query.$or = [
      { title: new db.RegExp({ regexp: keyword, options: 'i' }) },
      { projectName: new db.RegExp({ regexp: keyword, options: 'i' }) },
      { description: new db.RegExp({ regexp: keyword, options: 'i' }) }
    ]
  }

  // 查询项目列表
  const countResult = await db.collection('projects')
    .where(query)
    .count()

  const projectsResult = await db.collection('projects')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  let list = projectsResult.data || []

  if (shouldIncludePrivate && list.length) {
    const publisherUids = Array.from(new Set(list.map(item => item.publisherUid).filter(Boolean)))
    let userMap = {}

    if (publisherUids.length) {
      const userChunks = []
      for (let i = 0; i < publisherUids.length; i += MAX_USER_QUERY_COUNT) {
        const batchUids = publisherUids.slice(i, i + MAX_USER_QUERY_COUNT)
        userChunks.push(
          db.collection('users')
            .where({
              uid: _.in(batchUids)
            })
            .field({
              uid: true,
              name: true,
              phone: true,
              wechat: true
            })
            .get()
        )
      }

      const userResults = await Promise.all(userChunks)
      userMap = userResults
        .flatMap(result => result.data || [])
        .reduce((map, user) => {
          if (user.uid) {
            map[user.uid] = user
          }
          return map
        }, {})
    }

    list = list.map(project => {
      const contactUser = project.publisherUid ? userMap[project.publisherUid] : null
      return {
        ...project,
        publisherName: project.publisherName || contactUser?.name || '创业者',
        publisherPhone: project.publisherPhone || contactUser?.phone || '',
        publisherWechat: project.publisherWechat || contactUser?.wechat || ''
      }
    })
  } else if (list.length) {
    const privateFields = ['registeredEntity', 'publisherName', 'publisherPhone', 'publisherWechat']
    list = list.map(project => {
      const sanitized = { ...project }
      privateFields.forEach(field => {
        if (field in sanitized) {
          delete sanitized[field]
        }
      })
      return sanitized
    })
  }

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
 * 发布项目
 */
async function publish(params, wxContext) {
  const { OPENID } = wxContext

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
  
  if (user.canPublishProject === false) {
    return {
      code: 1003,
      message: '暂无发布权限，请联系管理员'
    }
  }

  // 验证必填字段
  const required = ['title', 'category', 'description', 'projectName', 'oneLiner', 'track', 'introduction', 'logo']
  for (const field of required) {
    if (!params[field]) {
      return {
        code: 1001,
        message: `请填写${field}`
      }
    }
  }

  const publisherName = user.name || user.nickName || '创业者'
  const publisherPhone = user.phone || ''
  const publisherWechat = user.wechat || ''

  const editableData = {
    title: params.title,
    category: params.category,
    description: params.description,
    projectName: params.projectName,
    registeredEntity: params.registeredEntity || '',
    oneLiner: params.oneLiner,
    track: Array.isArray(params.track) ? params.track : [],
    introduction: params.introduction,
    bestPractices: params.bestPractices || '',
    coreCompetitiveness: params.coreCompetitiveness || '',
    coreProducts: params.coreProducts || '',
    mainRegion: params.mainRegion || '',
    moreInfo: params.moreInfo || '',
    logo: params.logo || '',
    tags: params.tags || [],
    publisherName: publisherName || '',
    publisherPhone: publisherPhone || '',
    publisherWechat: publisherWechat || '',
    updatedAt: now
  }

  // 防止重复提交：同一用户在短时间内提交完全相同的项目
  const recentProjectResult = await db.collection('projects')
    .where({
      publisherUid: user.uid,
      title: params.title,
      status: 'active'
    })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  const recentProject = recentProjectResult.data[0]
  const isDuplicateSubmission = recentProject && (() => {
    const createdAt = new Date(recentProject.createdAt || now)
    const timeGap = now.getTime() - createdAt.getTime()
    if (timeGap > DUPLICATE_SUBMIT_WINDOW) {
      return false
    }
    return (
      recentProject.projectName === params.projectName &&
      recentProject.registeredEntity === (params.registeredEntity || '') &&
      recentProject.oneLiner === params.oneLiner &&
      recentProject.category === params.category
    )
  })()

  if (isDuplicateSubmission) {
    await db.collection('projects')
      .doc(recentProject._id)
      .update({
        data: editableData
      })

    return {
      code: 0,
      message: '发布成功',
      data: {
        projectId: recentProject._id,
        duplicated: true
      }
    }
  }

  // 创建项目
  const projectResult = await db.collection('projects').add({
    data: {
      publisherUid: user.uid,
      publisherName: user.name,
      status: 'active',
      viewCount: 0,
      contactCount: 0,
      createdAt: now,
      ...editableData
    }
  })

  // 更新用户统计
  await db.collection('user_stats')
    .where({
      uid: user.uid
    })
    .update({
      data: {
        postsCount: _.inc(1),
        updatedAt: now
      }
    })

  return {
    code: 0,
    message: '发布成功',
    data: {
      projectId: projectResult._id
    }
  }
}

/**
 * 获取我的发布
 */
async function getMyPosts(params, wxContext) {
  const { OPENID } = wxContext

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

  // 查询我的项目
  const projectsResult = await db.collection('projects')
    .where({
      publisherUid: uid
    })
    .orderBy('createdAt', 'desc')
    .get()

  return {
    code: 0,
    message: 'success',
    data: projectsResult.data
  }
}

/**
 * 删除项目
 */
async function deleteProject(params, wxContext) {
  const { OPENID } = wxContext
  const { projectId } = params

  // 获取用户UID
  const userResult = await db.collection('users')
    .where({
      _openid: OPENID
    })
    .field({
      uid: true,
      role: true
    })
    .get()

  const user = userResult.data[0] || {}
  const uid = user.uid
  const isAdmin = user.role === 'admin'

  // 验证权限
  const projectResult = await db.collection('projects')
    .doc(projectId)
    .get()

  if (!projectResult.data) {
    return {
      code: 1004,
      message: '项目不存在'
    }
  }

  if (!isAdmin && projectResult.data.publisherUid !== uid) {
    return {
      code: 1002,
      message: '无权删除该项目'
    }
  }

  // 删除项目
  await db.collection('projects')
    .doc(projectId)
    .remove()

  // 更新用户统计
  await db.collection('user_stats')
    .where({
      uid: projectResult.data.publisherUid
    })
    .update({
      data: {
        postsCount: _.inc(-1),
        updatedAt: new Date()
      }
    })

  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}

