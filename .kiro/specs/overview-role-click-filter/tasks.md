# Implementation Plan: Overview Role Click Filter

## Overview

实现总览视图中点击岗位统计项跳转到列表视图并筛选的功能。按照组件依赖顺序实现：先修改 AgentList（接收端），再修改 App（协调层），最后修改 OverviewPanel（触发端）和 CSS 样式。

## Tasks

- [x] 1. 实现 AgentList 的 setFilterKeyword 方法
  - 在 AgentList 组件中添加 `setFilterKeyword(keyword)` 方法
  - 方法需要更新 `filterKeyword` 状态、同步搜索框值、调用 `applyFilterAndSort()` 和 `render()`
  - _Requirements: 1.4, 3.1, 3.2_

- [x] 1.1 编写 setFilterKeyword 的属性测试
  - **Property 2: Filter keyword synchronizes with search input**
  - **Validates: Requirements 1.4, 3.1**

- [x] 2. 实现 App 的 switchToListViewWithFilter 方法
  - 在 App 模块中添加 `switchToListViewWithFilter(filterKeyword)` 方法
  - 方法需要调用 `switchToListView()` 和 `AgentList.setFilterKeyword(filterKeyword)`
  - _Requirements: 1.2, 1.3_

- [x] 2.1 编写 switchToListViewWithFilter 的属性测试
  - **Property 1: Role click triggers view switch with filter**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 3. 实现 OverviewPanel 的岗位点击功能
  - 在 OverviewPanel 组件中添加 `onRoleClick(roleName)` 方法
  - 修改 `renderRoleStats()` 方法，为岗位统计项添加 onclick 事件
  - _Requirements: 1.1_

- [x] 4. 添加岗位统计项的 hover 样式
  - 在 style.css 中为 `.role-stat-item` 添加 `cursor: pointer`
  - 添加 hover 状态的背景色变化样式
  - _Requirements: 2.1, 2.2_

- [x] 5. Checkpoint - 功能验证
  - 确保所有测试通过
  - 手动验证：点击岗位统计项能正确跳转并筛选
  - 如有问题请告知

## Notes

- 任务按依赖顺序排列：AgentList → App → OverviewPanel → CSS
- 所有任务包括属性测试都必须完成
- 现有的 FilterUtils.filterByKeyword 已支持按岗位名称筛选，无需修改
