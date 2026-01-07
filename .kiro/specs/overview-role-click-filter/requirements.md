# Requirements Document

## Introduction

本功能实现在总览视图（Overview）中点击岗位统计项时，自动切换到列表视图并按该岗位名称进行筛选，使用户能够快速查看特定岗位下的所有智能体。

## Glossary

- **Overview_Panel**: 总览面板组件，显示组织结构树和岗位统计信息
- **Agent_List**: 智能体列表组件，显示所有智能体并支持搜索筛选
- **Role_Stat_Item**: 岗位统计项，显示岗位名称和该岗位下的智能体数量
- **Filter_Keyword**: 筛选关键词，用于在列表视图中筛选智能体
- **App**: 主应用模块，管理全局状态和视图切换

## Requirements

### Requirement 1: 岗位统计项点击交互

**User Story:** As a user, I want to click on a role stat item in the overview panel, so that I can quickly see all agents with that role.

#### Acceptance Criteria

1. WHEN a user clicks on a role stat item in the overview panel, THE Overview_Panel SHALL trigger a navigation event with the role name
2. WHEN a role stat item is clicked, THE App SHALL switch from overview view to list view
3. WHEN switching to list view via role click, THE App SHALL set the filter keyword to the clicked role name
4. WHEN the filter keyword is set, THE Agent_List SHALL update the search input field to display the role name
5. WHEN the filter keyword is set, THE Agent_List SHALL filter the agent list to show only agents matching the role name

### Requirement 2: 视觉反馈

**User Story:** As a user, I want visual feedback when hovering over role stat items, so that I know they are clickable.

#### Acceptance Criteria

1. WHEN a user hovers over a role stat item, THE Overview_Panel SHALL display a pointer cursor
2. WHEN a user hovers over a role stat item, THE Overview_Panel SHALL apply a hover highlight style

### Requirement 3: 筛选状态同步

**User Story:** As a user, I want the search input to reflect the current filter, so that I can see and modify the filter criteria.

#### Acceptance Criteria

1. WHEN the filter is set programmatically, THE Agent_List SHALL update the search input value to match
2. WHEN the user modifies the search input after role-based filtering, THE Agent_List SHALL apply the new filter criteria
