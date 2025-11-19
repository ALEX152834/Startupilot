<template>
  <view class="posts-page">
    <scroll-view class="posts-list" scroll-y>
      <view class="list-container">
        <!-- 骨架屏 -->
        <skeleton v-if="loading" type="card" :rows="3" />
        
        <!-- 项目卡片 -->
        <project-card
          v-for="project in projectList"
          :key="project._id"
          :project="project"
          :is-login="true"
          action-type="delete"
          class="project-item"
          @delete="handleDelete"
        />
        
        <!-- 空状态 -->
        <empty-state 
          v-if="!loading && projectList.length === 0"
          icon="📝"
          title="暂无发布"
          description="快去发布您的第一个项目吧"
          buttonText="去发布项目"
          @action="handlePublish"
        />
      </view>
      
      <!-- 底部占位 -->
      <view class="bottom-placeholder safe-area-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProjectStore } from '@/store/project'
import Skeleton from '@/components/skeleton/skeleton.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'
import ProjectCard from '@/components/project-card/project-card.vue'
import { logger } from '@/utils/logger'

const projectStore = useProjectStore()

const loading = ref(false)
const projectList = ref([])
const deleteDialogLocked = ref(false)

const loadPosts = async () => {
  loading.value = true
  
  try {
    await projectStore.fetchMyPosts()
    // 过滤掉无效的项目数据，并去重
    const validProjects = (projectStore.myPosts || []).filter(project => {
      return project && project._id && project.title
    })
    
    // 根据_id去重
    const uniqueProjects = []
    const seenIds = new Set()
    
    for (const project of validProjects) {
      if (!seenIds.has(project._id)) {
        seenIds.add(project._id)
        uniqueProjects.push(project)
      }
    }
    
    projectList.value = uniqueProjects
  } catch (error) {
    logger.error('[profile/posts] 加载我的发布失败', error)
    projectList.value = []
  } finally {
    loading.value = false
  }
}

const handlePublish = () => {
  uni.navigateTo({
    url: '/subPackages/projects/publish/publish'
  })
}

const handleDelete = (project) => {
  if (deleteDialogLocked.value) {
    return
  }
  deleteDialogLocked.value = true

  const releaseLock = () => {
    deleteDialogLocked.value = false
  }

  uni.showModal({
    title: '删除项目',
    content: '确定要删除该项目吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await projectStore.deleteProject(project._id)
          // 从列表中移除
          projectList.value = projectList.value.filter(p => p._id !== project._id)
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          logger.error('[profile/posts] 删除项目失败', error)
          
          // 如果项目不存在，也从列表中移除
          if (error.message && error.message.includes('不存在')) {
            projectList.value = projectList.value.filter(p => p._id !== project._id)
            uni.showToast({
              title: '项目已不存在',
              icon: 'none'
            })
          } else {
            uni.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            })
          }
        } finally {
          releaseLock()
        }
      } else {
        releaseLock()
      }
    },
    fail: () => {
      releaseLock()
    }
  })
}

onMounted(() => {
  loadPosts()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.posts-page {
  min-height: 100vh;
  background: $bg-color;
}

.posts-list {
  height: 100vh;
}

.list-container {
  padding: $spacing-lg;
}

.project-item {
  margin-bottom: $spacing-md;
}

.bottom-placeholder {
  height: 32rpx;
}
</style>

