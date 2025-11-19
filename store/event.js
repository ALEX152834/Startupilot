import { defineStore } from 'pinia'
import { eventApi } from '@/utils/request'
import storage from '@/utils/storage'
import { STORAGE_KEYS } from '@/utils/constants'
import { logger } from '@/utils/logger'

export const useEventStore = defineStore('event', {
  state: () => ({
    eventList: [],
    myBookings: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  }),

  getters: {
    // 按类型分组的活动
    eventsByType: (state) => {
      const online = state.eventList.filter(e => e.type === 'online')
      const offline = state.eventList.filter(e => e.type === 'offline')
      return { online, offline }
    },

    // 已预约的活动ID列表
    bookedEventIds: (state) => {
      return state.myBookings.map(b => b.eventId)
    }
  },

  actions: {
    // 获取活动列表
    async fetchEventList(refresh = false) {
      if (refresh) {
        this.page = 1
        this.hasMore = true
        this.eventList = []
      }

      if (!this.hasMore || this.loading) return

      this.loading = true

      try {
        // 先尝试从缓存读取
        if (this.page === 1) {
          const cache = storage.getCache(STORAGE_KEYS.EVENTS_CACHE)
          if (cache) {
            this.eventList = cache
            this.loading = false
            return
          }
        }

        const result = await eventApi.getList({
          status: 'active',
          page: this.page,
          pageSize: this.pageSize
        })

        const { list, total } = result

        if (this.page === 1) {
          this.eventList = list
          // 缓存第一页数据
          storage.setCache(STORAGE_KEYS.EVENTS_CACHE, list)
        } else {
          this.eventList.push(...list)
        }

        this.hasMore = this.eventList.length < total
        this.page++
      } catch (error) {
        logger.error('[eventStore.fetchEventList] 获取活动列表失败', error)
      } finally {
        this.loading = false
      }
    },

    // 预约活动
    async bookEvent(eventId, eventInfo = null) {
      try {
        await eventApi.book(eventId, eventInfo)
        
        // 更新本地状态
        const event = this.eventList.find(e => e._id === eventId)
        if (event) {
          event.isBooked = true
        }

        uni.showToast({
          title: '预约成功',
          icon: 'success'
        })

        return true
      } catch (error) {
        logger.error('[eventStore.bookEvent] 预约失败', error)
        
        // 如果是已预约的错误，也更新本地状态
        if (error.message && error.message.includes('已预约')) {
          const event = this.eventList.find(e => e._id === eventId)
          if (event) {
            event.isBooked = true
          }
          
          uni.showToast({
            title: '您已预约过该活动',
            icon: 'none'
          })
          return true
        }
        
        throw error
      }
    },

    // 取消预约
    async cancelBooking(eventId) {
      try {
        await eventApi.cancelBooking(eventId)
        
        // 更新本地状态
        const event = this.eventList.find(e => e._id === eventId)
        if (event) {
          event.isBooked = false
        }

        // 从我的预约中移除
        this.myBookings = this.myBookings.filter(b => b.eventId !== eventId)

        uni.showToast({
          title: '已取消预约',
          icon: 'success'
        })

        return true
      } catch (error) {
        logger.error('[eventStore.cancelBooking] 取消预约失败', error)
        throw error
      }
    },

    // 获取我的预约
    async fetchMyBookings(status = 'confirmed') {
      try {
        const result = await eventApi.getMyBookings(status)
        this.myBookings = result.list || []
      } catch (error) {
        logger.error('[eventStore.fetchMyBookings] 获取我的预约失败', error)
      }
    }
  }
})

