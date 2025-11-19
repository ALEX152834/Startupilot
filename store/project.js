import { defineStore } from 'pinia'
import { projectApi } from '@/utils/request'
import storage from '@/utils/storage'
import { STORAGE_KEYS, PROJECT_CATEGORIES } from '@/utils/constants'
import { logger } from '@/utils/logger'
import { useUserStore } from './user'

/**
 * 项目字段分组说明
 * publicFields：可以展示给所有用户（投资人）
 * adminOnlyFields：仅限运营/管理员查看（注册主体、发布人联系方式等）
 * futurePrivateFields：预留给后续内部字段（联系人、费用、备注等）
 */
export const PROJECT_FIELD_GROUPS = {
  publicFields: [
    'logo',
    'projectName',
    'oneLiner',
    'track',
    'introduction',
    'description',
    'coreCompetitiveness',
    'category',
    'tags'
  ],
  adminOnlyFields: [
    'registeredEntity',
    'publisherName',
    'publisherPhone',
    'publisherWechat'
  ],
  futurePrivateFields: [
    'contactInfo',
    'feeStructure',
    'internalNotes'
  ]
}

const ADMIN_FIELD_SET = new Set([
  ...PROJECT_FIELD_GROUPS.adminOnlyFields,
  ...PROJECT_FIELD_GROUPS.futurePrivateFields
])

/**
 * 生成仅包含安全字段的项目对象
 * @param {object} project - 原始项目数据（包含私有字段）
 * @returns {object} publicProject - 仅保留可公开字段
 */
export const sanitizeProjectForPublic = (project = {}) => {
  const sanitized = { ...project }
  ADMIN_FIELD_SET.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field]
    }
  })
  return sanitized
}

export const useProjectStore = defineStore('project', {
  state: () => ({
    // projectList 始终保存完整数据（包含私有字段），供管理员视图使用
    projectList: [],
    myPosts: [],
    currentCategory: PROJECT_CATEGORIES.ALL,
    searchKeyword: '',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  }),

  getters: {
    // 过滤后的项目列表
    filteredProjects: (state) => {
      let list = state.projectList

      // 按类别过滤
      if (state.currentCategory !== PROJECT_CATEGORIES.ALL) {
        list = list.filter(p => p.category === state.currentCategory)
      }

      // 按关键词搜索
      if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase()
        list = list.filter(p => 
          p.title.toLowerCase().includes(keyword) ||
          p.projectName?.toLowerCase().includes(keyword) ||
          p.description?.toLowerCase().includes(keyword)
        )
      }

      return list
    },
    // 提供仅包含公开字段的项目列表，供「链接项目」等公开页面使用
    publicProjects() {
      return this.filteredProjects.map(project => sanitizeProjectForPublic(project))
    }
  },

  actions: {
    // 设置分类
    setCategory(category) {
      this.currentCategory = category
    },

    // 设置搜索关键词
    setSearchKeyword(keyword) {
      this.searchKeyword = keyword
    },

    // 获取项目列表
    async fetchProjectList(refresh = false, { includePrivate = false } = {}) {
      logger.log('[projectStore.fetchProjectList] start', { refresh, page: this.page, includePrivate })
      
      if (refresh) {
        this.page = 1
        this.hasMore = true
        this.projectList = []
        logger.log('[projectStore.fetchProjectList] 重置状态')
      }

      if (!this.hasMore || this.loading) {
        logger.log('[projectStore.fetchProjectList] 跳过', { hasMore: this.hasMore, loading: this.loading })
        return
      }

      this.loading = true

      try {
        // 先尝试从缓存读取（仅在非刷新时、且不包含私有数据时）
        if (!includePrivate && !refresh && this.page === 1 && !this.searchKeyword && this.currentCategory === PROJECT_CATEGORIES.ALL) {
          const cache = storage.getCache(STORAGE_KEYS.PROJECTS_CACHE)
          if (cache) {
            logger.log('[projectStore.fetchProjectList] 使用缓存数据', { count: cache.length })
            this.projectList = cache
            this.loading = false
            return
          }
        }
        
        logger.log('[projectStore.fetchProjectList] 从服务器获取数据')

        const params = {
          page: this.page,
          pageSize: this.pageSize
        }

        if (this.currentCategory !== PROJECT_CATEGORIES.ALL) {
          params.category = this.currentCategory
        }

        if (this.searchKeyword) {
          params.keyword = this.searchKeyword
        }

        if (includePrivate) {
          params.includePrivate = true
        }

        const result = await projectApi.getList(params)
        const { list, total } = result
        
        logger.log('[projectStore.fetchProjectList] 获取到数据', { total, pageSize: list?.length })

        if (this.page === 1) {
          this.projectList = list
          // 缓存第一页数据（仅存储公开数据）
          if (!includePrivate && !this.searchKeyword && this.currentCategory === PROJECT_CATEGORIES.ALL) {
            storage.setCache(STORAGE_KEYS.PROJECTS_CACHE, list)
            logger.log('[projectStore.fetchProjectList] 已缓存第一页数据')
          }
        } else {
          this.projectList.push(...list)
        }

        this.hasMore = this.projectList.length < total
        this.page++
        
        logger.log('[projectStore.fetchProjectList] 完成', { length: this.projectList.length, hasMore: this.hasMore })
      } catch (error) {
        logger.error('[projectStore.fetchProjectList] 获取项目列表失败', error)
      } finally {
        this.loading = false
      }
    },

    // 发布项目
    async publishProject(projectData) {
      try {
        const result = await projectApi.publish(projectData)
        
        uni.showToast({
          title: '发布成功',
          icon: 'success'
        })

        // 清除缓存
        storage.removeCache(STORAGE_KEYS.PROJECTS_CACHE)
        
        // 重置状态并刷新列表
        this.page = 1
        this.hasMore = true
        this.projectList = []
        await this.fetchProjectList(true)
        
        // 刷新用户统计（需要导入userStore）
        const userStore = useUserStore()
        if (userStore.isLogin) {
          await userStore.fetchStats()
          logger.log('[projectStore.publishProject] 发布成功后刷新统计', userStore.stats)
        }
        
        return result
      } catch (error) {
        logger.error('[projectStore.publishProject] 发布项目失败', error)
        throw error
      }
    },

    // 获取我的发布
    async fetchMyPosts() {
      try {
        const result = await projectApi.getMyPosts()
        this.myPosts = result || []
      } catch (error) {
        logger.error('[projectStore.fetchMyPosts] 获取我的发布失败', error)
      }
    },

    // 删除项目
    async deleteProject(projectId) {
      try {
        await projectApi.delete(projectId)
        
        // 从列表中移除
        this.projectList = this.projectList.filter(p => p._id !== projectId)
        this.myPosts = this.myPosts.filter(p => p._id !== projectId)

        uni.showToast({
          title: '删除成功',
          icon: 'success'
        })

        const userStore = useUserStore()
        if (userStore.isLogin) {
          await userStore.fetchStats()
        }

        return true
      } catch (error) {
        logger.error('[projectStore.deleteProject] 删除项目失败', error)
        throw error
      }
    }
  }
})

