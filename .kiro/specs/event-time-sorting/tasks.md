# Implementation Plan: Event Time Sorting

## Overview

修改活动列表的排序和过滤逻辑，使即将到来的活动排在最前面，同时过滤掉已过期的活动。

## Tasks

- [x] 1. 修改云函数 getList 查询逻辑
  - [x] 1.1 添加日期过滤条件，只查询今天及以后的活动
    - 使用 `_.gte(today)` 过滤已过期活动
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.2 修改排序方式为升序
    - 将 `.orderBy('date', 'desc')` 改为 `.orderBy('date', 'asc')`
    - _Requirements: 1.1, 1.2_

- [x] 2. 更新 count 查询条件
  - 确保 count 查询也使用相同的过滤条件
  - _Requirements: 2.1_

- [x] 3. 手动测试验证
  - 验证主页活动按日期升序显示
  - 验证已过期活动不显示
  - 验证下拉刷新后排序一致
  - _Requirements: 1.1, 2.1, 3.1_
