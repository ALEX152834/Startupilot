/**
 * 测试数据初始化脚本
 * 
 * 使用方法：
 * 1. 在微信开发者工具的云开发控制台中
 * 2. 打开"数据库"标签
 * 3. 在控制台中执行此脚本
 */

// 活动测试数据
const testEvents = [
  {
    title: 'Startupilot 创业者交流会',
    type: 'offline',
    date: '2025-11-20',
    time: '14:00 - 17:00',
    location: '北京市朝阳区创业大街',
    description: '与其他创业者面对面交流，分享创业经验，探讨行业趋势',
    image: 'https://via.placeholder.com/600x400/3B82F6/ffffff?text=Offline+Event',
    status: 'active',
    maxParticipants: 50,
    currentParticipants: 0,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: 'AI 创业实战分享会',
    type: 'online',
    date: '2025-11-15',
    time: '19:00 - 21:00',
    location: '',
    description: '深度解析AI领域创业机会，从技术到商业的全方位分享',
    image: 'https://via.placeholder.com/600x400/9333EA/ffffff?text=Online+Event',
    status: 'active',
    maxParticipants: 100,
    currentParticipants: 0,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: '融资路演技巧培训',
    type: 'online',
    date: '2025-11-25',
    time: '15:00 - 17:00',
    location: '',
    description: '学习如何向投资人展示你的项目，提高融资成功率',
    image: 'https://via.placeholder.com/600x400/EC4899/ffffff?text=Pitch+Training',
    status: 'active',
    maxParticipants: 80,
    currentParticipants: 0,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 学习资源测试数据
const testLearningResources = [
  {
    title: 'Airbnb 的产品设计哲学',
    description: '学习 Airbnb 如何打造极致的用户体验',
    type: 'ceo',
    category: '案例分析',
    image: 'https://via.placeholder.com/600x400/667eea/ffffff?text=Airbnb',
    caseExample: 'Airbnb 通过「属于任何地方」的理念，重新定义了旅行住宿体验...',
    requiredVipLevel: 'neo',
    downloadUrl: '',
    fileSize: 0,
    downloadCount: 0,
    viewCount: 0,
    status: 'published',
    publishedAt: new Date('2024-01-12'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: 'Duolingo 增长案例分析',
    description: '深入解析 Duolingo 如何通过游戏化设计实现用户增长',
    type: 'ceo',
    category: '案例分析',
    image: 'https://via.placeholder.com/600x400/22c55e/ffffff?text=Duolingo',
    caseExample: 'Duolingo 通过连续打卡、排行榜等游戏化元素，大幅提升用户留存...',
    requiredVipLevel: 'regular',
    downloadUrl: '',
    fileSize: 0,
    downloadCount: 0,
    viewCount: 0,
    status: 'published',
    publishedAt: new Date('2024-01-15'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: 'OKR 目标管理方法论',
    description: '学习如何使用OKR管理团队目标和绩效',
    type: 'best',
    category: '管理工具',
    image: 'https://via.placeholder.com/600x400/f59e0b/ffffff?text=OKR',
    caseExample: 'OKR帮助Google等科技巨头实现高效的目标管理...',
    requiredVipLevel: 'regular',
    downloadUrl: '',
    fileSize: 0,
    downloadCount: 0,
    viewCount: 0,
    status: 'published',
    publishedAt: new Date('2024-01-18'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: '精益创业方法论',
    description: '学习精益创业的核心理念和实践方法',
    type: 'best',
    category: '管理工具',
    image: 'https://via.placeholder.com/600x400/06b6d4/ffffff?text=Lean+Startup',
    caseExample: '通过最小可行产品(MVP)快速验证商业假设...',
    requiredVipLevel: 'neo',
    downloadUrl: '',
    fileSize: 0,
    downloadCount: 0,
    viewCount: 0,
    status: 'published',
    publishedAt: new Date('2024-01-20'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 项目测试数据
const testProjects = [
  {
    publisherUid: 'test-user-001',
    publisherName: '张三',
    title: 'AI 智能客服系统',
    category: '项目合作',
    description: '我们开发了一套基于大语言模型的智能客服系统，寻求合作伙伴',
    projectName: '智能客服AI助手',
    registeredEntity: '北京某某科技有限公司',
    oneLiner: '让每个企业都拥有智能客服',
    track: ['人工智能', '企业服务'],
    introduction: '基于最新的大语言模型技术，我们开发了一套智能客服系统，能够理解用户意图，提供精准回答...',
    coreCompetitiveness: '1.自研对话引擎 2.多轮对话能力 3.知识库管理 4.数据分析',
    logo: '',
    tags: ['AI', '企业服务', 'SaaS'],
    status: 'active',
    viewCount: 0,
    contactCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    publisherUid: 'test-user-002',
    publisherName: '李四',
    title: '新能源充电桩项目',
    category: '融资需求',
    description: '新能源充电桩运营项目，现寻求A轮融资',
    projectName: '绿色出行充电网络',
    registeredEntity: '',
    oneLiner: '打造城市绿色充电网络',
    track: ['新能源', '智能制造'],
    introduction: '随着新能源汽车的普及，充电桩需求急剧增长。我们计划在一二线城市部署智能充电桩网络...',
    coreCompetitiveness: '优质点位资源、智能调度系统、用户体验优化',
    logo: '',
    tags: ['新能源', '充电桩', 'B轮'],
    status: 'active',
    viewCount: 0,
    contactCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

console.log('测试数据准备完成！')
console.log('活动数据:', testEvents.length, '条')
console.log('学习资源:', testLearningResources.length, '条')
console.log('项目数据:', testProjects.length, '条')
console.log('\n请在云开发控制台的数据库中手动导入这些数据。')

