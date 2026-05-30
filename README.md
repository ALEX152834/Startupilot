<div align="center">

# Startupilot 微信小程序

**面向创业者的一站式服务平台** — 活动预约 · 智库学习 · 项目对接 · 会员体系

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![uni-app](https://img.shields.io/badge/uni--app-3.0-brightgreen.svg)](https://uniapp.dcloud.io/)
[![Vue](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![Pinia](https://img.shields.io/badge/Pinia-2.1-blue.svg)](https://pinia.vuejs.org/)
[![WeChat](https://img.shields.io/badge/WeChat-MiniProgram-07c160.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)

</div>

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术栈与架构](#技术栈与架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [云开发配置](#云开发配置)
- [云函数说明](#云函数说明)
- [数据库集合](#数据库集合)
- [开发说明](#开发说明)
- [常见问题](#常见问题)
- [许可证](#许可证)

---

## 项目简介

**Startupilot** 是一个面向早期创业者的微信小程序，把「活动报名、学习资源、项目对接、会员权益」整合到一个轻量入口里。

技术上采用 **uni-app（Vue 3）+ 微信云开发** 的 Serverless 架构：前端跨平台编译为微信小程序，后端逻辑全部跑在云函数里，无需自建服务器即可获得数据库、文件存储与内容安全能力。

应用主体为四个底部 Tab 页面：

| Tab | 页面 | 主要内容 |
|-----|------|----------|
| 开始 | 首页 `pages/index` | 活动推荐、平台介绍、常见问题 |
| 智库 | Founder Think `pages/learning` | 学习资源分类浏览与下载 |
| 链接 | Founder Square `pages/projects` | 项目广场、发布与搜索项目 |
| 我 | 个人中心 `pages/profile` | 会员卡片、个人统计、各类管理入口 |

---

## 核心功能

### 活动预约
- 活动列表区分线上/线下，按日期升序排列，自动过滤已过期活动。
- 一键预约 / 取消预约，预约时保存用户信息快照（姓名、电话、微信号、身份）。
- 列表结果带内存缓存防抖，避免短时间内重复请求。

### 学习资源（智库）
- 资源按分类浏览（案例分析、管理工具），支持搜索与收藏。
- 权限分级：普通资源全员可见，NEO 资源需会员权限；下载时校验权限并统计下载次数。
- 云存储文件按需转换为临时下载链接。

### 项目对接（链接）
- 发布项目需求，支持 Logo 上传、赛道选择、标签管理。
- 列表通过聚合查询（`aggregate + lookup`）关联发布人信息，避免 N+1 查询。
- 接入微信内容安全 `msgSecCheck` 自动审核文本，5 秒窗口内的重复提交会被合并。
- 浏览量原子自增；联系方式等敏感字段仅对管理员可见。

### 会员体系
- 双级会员：普通会员 / NEO 会员，通过兑换码激活。
- 管理员特殊兑换码可在激活会员的同时授予 admin 角色。
- 个人统计（收藏数、发布数、报名数）由数据库实际记录实时计算。

### 管理员后台
- 兑换码批量生成与管理。
- 预约数据查看与 CSV 导出。
- 项目管理（可删除任意项目）。
- 用户发布权限的查询与设置。

### AI 数据查询接口
- `searchProjects` 云函数支持 HTTP 触发，专为外部 AI Agent 提供项目检索能力。
- 支持关键词、角色、行业、赛道、标签、地区等多维筛选，输出时自动过滤敏感字段，并对正则做注入防护。

### 平台与体验
- 鸿蒙系统（HarmonyOS）兼容：自动检测平台并适配状态栏 / 安全区域，提供组合式与混入两种接入方式。
- 全部页面使用自定义导航栏，统一处理胶囊按钮位置。
- 玻璃态卡片、渐变按钮、骨架屏加载等统一 UI 风格。

---

## 技术栈与架构

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| uni-app | 3.0 (alpha) | 跨平台应用框架 |
| Vue | 3.5 | 响应式 UI（Composition API） |
| Pinia | 2.1 | 状态管理 |
| Vite | 5.x | 构建工具 |
| Sass/SCSS | 1.69+ | 样式预处理 |

### 后端（微信云开发 Serverless）

- **云函数** — 10 个函数，承载全部业务逻辑。
- **云数据库** — 用户、活动、项目、资源等集合。
- **云存储** — 图片、PDF 等静态资源，CDN 加速。
- **内容安全 API** — 文本审核（`msgSecCheck`）。

### 架构概览

```
微信小程序客户端（uni-app / Vue 3）
  Pages（4 Tab + 分包页面）
  Components / Composables / Utils
  Pinia Store（user / event / project）
        │  wx.cloud.callFunction
        ▼
微信云开发平台
  云函数：login · user · event · project · learning
          favorite · vip · admin · searchProjects · setup-admin-code
  云数据库 + 云存储 + 内容安全
```

---

## 项目结构

```
startupilot-miniapp/
├── pages/                  主包页面（4 个 TabBar 页面）
│   ├── index/              首页 - 活动推荐、平台介绍
│   ├── learning/           智库 - 学习资源
│   ├── projects/           链接 - 项目广场
│   └── profile/            我的 - 个人中心
│
├── subPackages/            分包页面
│   ├── profile/            收藏 / 发布 / 报名 / 设置
│   ├── projects/           发布项目
│   └── admin/              兑换码 / 项目管理 / 预约 / 发布权限
│
├── components/             可复用组件（玻璃卡片、按钮、各类卡片、弹窗等）
├── cloudfunctions/         云函数（见下文）
├── store/                  Pinia 状态（user / event / project）
├── utils/                  工具库（请求封装、鉴权、存储、校验、设备、埋点等）
├── composables/            组合式函数（分享、导航栏、安全异步、鸿蒙兼容）
├── mixins/                 Options API 混入（分享、鸿蒙兼容）
├── styles/                 全局样式（变量、通用类、混入、动画）
├── static/tabbar/          TabBar 图标
├── scripts/                工具脚本（导出预约、初始化测试数据）
│
├── App.vue                 根组件（云开发初始化、设备检测、登录检查）
├── main.js                 入口（createSSRApp + Pinia）
├── pages.json              路由 / TabBar / 分包 / 预加载规则
├── manifest.json           小程序配置（AppID、云函数根目录、权限）
├── app.config.js           应用配置（超时、缓存、分页等）
├── vite.config.js          构建配置
└── package.json            依赖与脚本
```

---

## 快速开始

### 环境要求

- Node.js 16 及以上
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序 AppID（在[微信公众平台](https://mp.weixin.qq.com/)注册）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/ALEX152834/Startupilot-.git
cd startupilot-miniapp

# 安装依赖
npm install

# 启动开发模式（编译微信小程序）
npm run dev:mp-weixin

# 生产构建
npm run build:mp-weixin
```

随后打开微信开发者工具，导入编译产物目录 `dist/dev/mp-weixin`（或 `dist/build/mp-weixin`）。

---

## 云开发配置

### 1. 配置 AppID

编辑 `manifest.json` 中的 `mp-weixin.appid`，替换为你自己的小程序 AppID。

### 2. 配置云开发环境

云环境 ID 在 `App.vue` 中以常量声明：

```javascript
const DEFAULT_CLOUD_ENV_ID = '你的云开发环境ID'
```

非微信端也可通过 `.env`（参考 `.env.example`）的 `VITE_CLOUD_ENV_ID` 注入。

### 3. 开通云开发并创建集合

在微信开发者工具中开通「云开发」，创建环境后，按 [数据库集合](#数据库集合) 一节建立所需集合。

### 4. 部署云函数

`manifest.json` 已将 `cloudfunctionRoot` 指向 `cloudfunctions/`。在微信开发者工具中右键每个云函数目录 →「上传并部署：云端安装依赖」。

需部署：`login` · `user` · `event` · `project` · `learning` · `favorite` · `vip` · `admin` · `searchProjects` · `setup-admin-code`

### 5. 初始化管理员

在云开发控制台手动调用 `setup-admin-code`，传入管理员兑换码：

```json
{ "adminCode": "你的管理员兑换码" }
```

之后在小程序「我」页面用该兑换码激活，即可获得 admin 权限。

---

## 云函数说明

所有云函数统一采用 `{ action, params }` 入参、`{ code, message, data }` 出参的约定，通过 `action` 分发到具体处理函数。

| 云函数 | 职责 | 主要 action |
|--------|------|-------------|
| `login` | 微信登录、用户创建/更新 | `login` |
| `user` | 用户资料与统计 | `updateName` · `updateProfile` · `saveRegistrationInfo` · `bindPhone` · `getStats` |
| `event` | 活动与预约 | `getList` · `book` · `cancelBooking` · `getMyBookings` |
| `project` | 项目广场 | `getList` · `publish` · `getMyPosts` · `delete` · `viewProject` |
| `learning` | 学习资源 | `getList` · `getResource` |
| `favorite` | 收藏管理 | `add` · `remove` · `getMyFavorites` |
| `vip` | 兑换码验证与会员激活 | `verifyRedeemCode` |
| `admin` | 管理员后台 | `generateRedeemCodes` · `getRedeemCodes` · `getAllBookings` · `exportBookings` · `getPublishPermission` · `setPublishPermission` |
| `searchProjects` | 对外项目检索（支持 HTTP 触发） | — |
| `setup-admin-code` | 一次性初始化管理员兑换码 | — |

> `cloudfunctions/common/logger.js` 为各云函数复用的日志工具，不是独立业务函数。

---

## 数据库集合

| 集合 | 说明 |
|------|------|
| `users` | 用户信息（openid、uid、VIP 状态、角色等） |
| `user_stats` | 用户统计（收藏数、发布数、报名数） |
| `events` | 活动信息（标题、日期、类型、状态） |
| `bookings` | 预约记录（用户快照、活动快照、状态） |
| `projects` | 项目信息（发布者、赛道、标签、浏览量） |
| `learning_resources` | 学习资源（分类、VIP 等级、下载链接） |
| `favorites` | 收藏记录（用户、被收藏对象） |
| `redeem_codes` | 兑换码（类型、有效期、使用状态） |

---

## 开发说明

- **状态管理**：用户、活动、项目分别由 `store/` 下的 Pinia store 维护，组件通过 store 访问数据与缓存。
- **请求封装**：`utils/request.js` 统一封装 `wx.cloud.callFunction`，内置重试、loading 提示与鉴权失效拦截（触发 `auth:expired` 事件后由 `App.vue` 静默登出）。
- **分包预加载**：`pages.json` 的 `preloadRule` 在主页面就绪后按网络条件预加载分包，提升二级页面打开速度。
- **样式体系**：设计变量集中在 `styles/variables.scss`，通过 `vite.config.js` 全局注入；玻璃态、渐变、动画等以 SCSS 混入复用。
- **鸿蒙兼容**：`utils/device.js` 检测平台，`composables/useHarmony.js` 与 `mixins/harmony.js` 提供安全区域适配。
- **日志**：`utils/logger.js` 在生产环境静默，避免泄露调试信息。

---

## 常见问题

**Q：编译后小程序提示云环境未初始化？**
确认 `App.vue` 中的 `DEFAULT_CLOUD_ENV_ID` 已替换为你自己的环境 ID，并已在开发者工具中开通云开发。

**Q：调用云函数报「未知操作」？**
说明 `action` 名称与云函数内的 `switch` 分支不匹配，参见 [云函数说明](#云函数说明) 的 action 列表。

**Q：管理员页面无法进入？**
需要先通过 `setup-admin-code` 初始化管理员兑换码，并在小程序内用该码激活当前账号。

**Q：项目发布失败或内容被拦截？**
文本会经过微信内容安全审核，含敏感词时会被拒绝；另外 5 秒内的重复提交会被合并为同一条记录。

---

## 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。
