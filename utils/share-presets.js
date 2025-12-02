import { getCdnUrl } from '@/utils/cloud-storage'

export const DEFAULT_SHARE_TITLE = '创业者-赋能社群'

const STATIC_IMAGES = {
  index: getCdnUrl('profile/分享的静态图片/开始和我-分享.png'),
  learning: getCdnUrl('profile/分享的静态图片/智库-分享.png'),
  projects: getCdnUrl('profile/分享的静态图片/链接-分享.png'),
  profile: getCdnUrl('profile/分享的静态图片/开始和我-分享.png')
}

export const SHARE_PRESETS = {
  index: {
    title: DEFAULT_SHARE_TITLE,
    path: '/pages/index/index',
    image: STATIC_IMAGES.index
  },
  learning: {
    title: DEFAULT_SHARE_TITLE,
    path: '/pages/learning/learning',
    image: STATIC_IMAGES.learning
  },
  projects: {
    title: DEFAULT_SHARE_TITLE,
    path: '/pages/projects/projects',
    image: STATIC_IMAGES.projects
  },
  profile: {
    title: DEFAULT_SHARE_TITLE,
    path: '/pages/profile/profile',
    image: STATIC_IMAGES.profile
  }
}

export const getSharePreset = (key) => {
  const preset = SHARE_PRESETS[key]
  return preset ? { ...preset } : { title: DEFAULT_SHARE_TITLE, path: '/pages/index/index', image: SHARE_PRESETS.index.image }
}
