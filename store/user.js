import { defineStore } from 'pinia'
import { wxLogin, logout as logoutUtil, getUserInfo as getStoredUserInfo } from '@/utils/auth'
import storage from '@/utils/storage'
import { userApi } from '@/utils/request'
import { logger } from '@/utils/logger'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: '',
    isLogin: false,
    stats: {
      favoritesCount: 0,
      postsCount: 0,
      registrationsCount: 0
    }
  }),

  getters: {
    // 是否为NEO会员
    isNeoMember(state) {
      if (!state.userInfo) return false
      if (state.userInfo.vipLevel !== 'neo') return false
      
      // 检查是否过期
      const vipExpiry = new Date(state.userInfo.vipExpiry)
      return vipExpiry > new Date()
    },

    // VIP等级显示文本
    vipLevelText(state) {
      if (!state.userInfo) return '普通会员'
      return state.userInfo.vipLevel === 'neo' ? 'NEO会员' : '普通会员'
    },

    // 用户UID
    uid(state) {
      return state.userInfo?.uid || ''
    },

    // 用户昵称
    userName(state) {
      return state.userInfo?.name || '创业者'
    },

    // 用户头像
    userAvatar(state) {
      return state.userInfo?.wechatAvatar || ''
    },

    // 是否已填写报名信息
    hasFilledRegistrationInfo(state) {
      return state.userInfo?.hasFilledRegistrationInfo || false
    }
  },

  actions: {
    // 检查登录状态
    checkLogin() {
      const userInfo = getStoredUserInfo()
      const token = storage.getToken()
      if (userInfo) {
        this.userInfo = userInfo
      }
      if (token) {
        this.token = token
      }
      this.isLogin = !!userInfo && !!token
    },

    // 登录
    async login(profile = null) {
      try {
        const { userInfo, token } = await wxLogin(profile)
        if (userInfo) {
          this.userInfo = userInfo
          storage.setUserInfo(userInfo)
        }
        if (token) {
          this.token = token
          storage.setToken(token)
        }
        this.isLogin = !!this.userInfo && !!this.token
        return this.userInfo
      } catch (error) {
        logger.error('[userStore.login] 登录失败', error)
        throw error
      }
    },

    // 退出登录
    logout() {
      this.userInfo = null
      this.token = ''
      this.isLogin = false
      this.stats = {
        favoritesCount: 0,
        postsCount: 0,
        registrationsCount: 0
      }
      logoutUtil()
    },

    // 更新用户信息
    updateUserInfo(userInfo) {
      this.userInfo = { ...this.userInfo, ...userInfo }
      storage.setUserInfo(this.userInfo)
    },

    // 更新昵称
    async updateName(newName) {
      try {
        await userApi.updateName(newName)
        this.updateUserInfo({ name: newName })
        uni.showToast({
          title: '昵称更新成功',
          icon: 'success'
        })
      } catch (error) {
        logger.error('[userStore.updateName] 更新昵称失败', error)
        throw error
      }
    },

    // 保存报名信息
    async saveRegistrationInfo(info) {
      try {
        // 确保发送所有后端需要的字段
        const params = {
          name: info.name,
          phone: info.phone,
          wechat: info.wechat || '',
          role: info.role,
          organization: info.organization || '',
          attendees: info.attendees || 1
        }
        
        await userApi.saveRegistrationInfo(params)
        
        // 更新用户信息，但保留管理员角色
        const updateData = {
          hasFilledRegistrationInfo: true,
          phone: info.phone,
          wechat: info.wechat,
          name: info.name
        }
        
        // 只有非管理员才更新 role 字段
        if (this.userInfo?.role !== 'admin') {
          updateData.role = info.role
        }
        
        this.updateUserInfo(updateData)
        return true
      } catch (error) {
        logger.error('[userStore.saveRegistrationInfo] 保存报名信息失败', error)
        throw error
      }
    },

    // 获取用户统计
    async fetchStats() {
      if (!this.isLogin) {
        logger.log('[userStore.fetchStats] 未登录，跳过统计')
        return
      }
      try {
        logger.log('[userStore.fetchStats] 开始获取统计数据')
        const stats = await userApi.getStats()
        this.stats = stats || {
          favoritesCount: 0,
          postsCount: 0,
          registrationsCount: 0
        }
        logger.log('[userStore.fetchStats] 更新后的统计', this.stats)
      } catch (error) {
        logger.error('[userStore.fetchStats] 获取统计失败', error)
        this.stats = {
          favoritesCount: 0,
          postsCount: 0,
          registrationsCount: 0
        }
      }
    },

    // 绑定手机号
    async bindPhone(cloudID) {
      if (!cloudID) {
        throw new Error('缺少手机号凭证')
      }
      try {
        const res = await userApi.bindPhone(cloudID)
        if (res && res.phone) {
          this.updateUserInfo({ phone: res.phone })
        }
        return res
      } catch (error) {
        logger.error('[userStore.bindPhone] 绑定手机号失败', error)
        throw error
      }
    },

    // 升级VIP
    upgradeVip(vipLevel, vipExpiry, role = null) {
      const updateData = {
        vipLevel,
        vipExpiry
      }
      // 如果有 role 字段（管理员兑换码），也更新 role
      if (role) {
        updateData.role = role
      }
      this.updateUserInfo(updateData)
    },

    // 更新基础资料
    async updateProfile(profile) {
      try {
        const payload = {}
        if (profile.name !== undefined) payload.name = profile.name
        if (profile.phone !== undefined) payload.phone = profile.phone
        if (profile.wechat !== undefined) payload.wechat = profile.wechat
        
        await userApi.updateProfile(payload)
        this.updateUserInfo(payload)
        return true
      } catch (error) {
        logger.error('[userStore.updateProfile] 更新资料失败', error)
        throw error
      }
    }
  }
})
