# 实施计划

- [x] 1. 实现前端过期检测逻辑





  - [x] 1.1 在 registrations.vue 中添加 `isEventExpired()` 辅助函数


    - 接收 booking 对象参数
    - 解析日期字段并与当前日期（午夜）比较
    - 处理缺少日期字段的情况
    - _需求: 1.1, 1.4, 1.5_

  - [x] 1.2 修改 `getStatusText()` 接收 booking 对象并检查过期状态


    - 函数签名从 `getStatusText(status)` 改为 `getStatusText(booking)`
    - 优先检查取消状态
    - 使用 `isEventExpired()` 检查过期
    - 添加 "completed" 状态映射
    - _需求: 1.1, 1.2_

- [x] 2. 更新前端模板和样式





  - [x] 2.1 更新状态徽章模板绑定


    - 模板传递完整 booking 对象给 `getStatusText()`
    - CSS class 绑定检查 `isEventExpired()` 应用过期样式
    - _需求: 1.3_

  - [x] 2.2 添加过期状态徽章的 CSS 样式


    - 在 `.status-badge` 下添加 `&--expired` 样式规则
    - 使用红色配色方案
    - _需求: 1.3_
-

- [x] 3. 实现后端本地活动跟踪




  - [x] 3.1 在预约数据增强中添加 isLocalEvent 字段


    - 在 `getAllBookings()` 的 enrichedBookings 映射中添加
    - 实现逻辑：保留现有值或检查 eventId 前缀
    - 使用可选链安全访问 eventId
    - _需求: 2.1, 2.2, 2.3, 2.4_
