# Requirements Document

## Introduction

修改主页（开始）页面的活动展示排序逻辑，使活动按照时间顺序排列，即将到来的活动排在最上面。

## Glossary

- **Event_List**: 主页展示的活动列表组件
- **Event_Cloud_Function**: 处理活动数据获取的云函数 (cloudfunctions/event/index.js)
- **Event_Store**: 前端活动状态管理 (store/event.js)
- **Event_Date**: 活动的日期字段，用于排序

## Requirements

### Requirement 1: 活动按时间升序排列

**User Story:** 作为用户，我希望看到即将到来的活动排在最前面，这样我可以优先关注最近的活动。

#### Acceptance Criteria

1. WHEN 用户访问主页 THEN THE Event_List SHALL 按活动日期升序排列（即将到来的活动排在最上面）
2. WHEN 活动列表从云端获取数据 THEN THE Event_Cloud_Function SHALL 返回按日期升序排列的活动列表
3. WHEN 多个活动日期相同 THEN THE Event_List SHALL 保持这些活动的相对顺序不变

### Requirement 2: 过滤已过期活动

**User Story:** 作为用户，我只想看到未过期的活动，已过期的活动不应该显示在主页上。

#### Acceptance Criteria

1. WHEN 活动日期早于当前日期 THEN THE Event_Cloud_Function SHALL 不返回该活动
2. WHEN 活动日期等于或晚于当前日期 THEN THE Event_Cloud_Function SHALL 返回该活动
3. WHEN 活动过期 THEN THE Event_Cloud_Function SHALL 保留活动数据在数据库中（不删除）

### Requirement 3: 排序逻辑一致性

**User Story:** 作为用户，我希望无论是首次加载还是刷新，活动的排序都保持一致。

#### Acceptance Criteria

1. WHEN 用户下拉刷新活动列表 THEN THE Event_List SHALL 保持相同的时间升序排列
2. WHEN 活动数据从缓存加载 THEN THE Event_List SHALL 保持与云端数据相同的排序顺序
3. WHEN 缓存数据包含已过期活动 THEN THE Event_Store SHALL 在刷新时获取最新的未过期活动列表
