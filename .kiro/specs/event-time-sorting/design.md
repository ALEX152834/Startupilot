# Design Document: Event Time Sorting

## Overview

本设计文档描述如何修改活动列表的排序逻辑，使即将到来的活动排在最前面，同时过滤掉已过期的活动（数据保留在数据库中）。

## Architecture

当前架构保持不变，仅修改查询和排序逻辑：

```
主页 (pages/index/index.vue)
    ↓ 调用
Event Store (store/event.js)
    ↓ 调用
Event Cloud Function (cloudfunctions/event/index.js)
    ↓ 查询（过滤已过期 + 升序排列）
云数据库 events 集合
```

## Components and Interfaces

### Event Cloud Function - getList

修改 `cloudfunctions/event/index.js` 中的 `getList` 函数：

**当前实现：**
```javascript
const query = {}
if (status !== 'all') {
  query.status = status
}

const eventsResult = await db.collection('events')
  .where(query)
  .orderBy('date', 'desc')  // 降序：最新的排最前
```

**修改后：**
```javascript
const today = new Date()
today.setHours(0, 0, 0, 0)  // 设置为当天零点

const query = {
  date: _.gte(today)  // 只查询今天及以后的活动
}
if (status !== 'all') {
  query.status = status
}

const eventsResult = await db.collection('events')
  .where(query)
  .orderBy('date', 'asc')   // 升序：即将到来的排最前
```

### 接口定义

无接口变更，仅查询条件和排序顺序改变。

## Data Models

无数据模型变更。活动数据结构保持不变：

```javascript
{
  _id: string,
  title: string,
  date: Date,        // 用于排序和过滤的日期字段
  time: string,
  image: string,
  status: string,
  // ... 其他字段
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do.*

### Property 1: 升序排列一致性

*For any* 活动列表，列表中每个活动的日期应该小于或等于其后续活动的日期。

**Validates: Requirements 1.1, 1.2**

### Property 2: 过期活动过滤

*For any* 返回的活动列表，所有活动的日期都应该大于或等于当前日期。

**Validates: Requirements 2.1, 2.2**

### Property 3: 刷新后排序不变性

*For any* 活动列表，刷新前后如果活动数据未变化，则排序顺序应保持一致。

**Validates: Requirements 3.1, 3.2**

## Error Handling

- 如果 `date` 字段为空或无效，该活动将被过滤掉（不会显示）
- 排序逻辑变更不影响现有的错误处理机制
- 数据库中的已过期活动数据保持不变，仅在查询时过滤

## Testing Strategy

### 单元测试
- 验证云函数返回的活动列表按日期升序排列
- 验证已过期活动不在返回列表中
- 验证相同日期的活动保持稳定顺序

### 手动测试
- 在主页验证活动显示顺序
- 验证已过期活动不显示
- 下拉刷新后验证排序一致性
