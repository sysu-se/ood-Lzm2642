# EVOLUTION.md

## 1. 如何实现提示功能？

- 在 `Sudoku` 对象中新增：
  - `getCandidates(row, col)`：返回指定空格的候选数字数组（1-9），通过检查行、列和 3x3 方格中的已用数字过滤。
  - `findNextStep()`：扫描全盘并返回第一个只有单一候选值的单元，返回格式 `{ row, col, value, candidates }`，若无返回 `null`。

- 在 UI 层提供两种提示模式：
  - **候选提示**（`showCandidatesHint`）：在光标所在空格显示候选数集合（不填入），通过 `candidates` store 在格子内渲染小数字。
  - **下一步提示**（`fillNextStepHint`）：优先检查光标格是否为唯一候选，若否则全盘搜索，找到后自动填入；若全盘无唯一候选，降级为显示光标格候选列表。

实现理由：提示是基于当前局面、仅依赖数独规则的能力，放在领域对象 `Sudoku` 中最合适，UI 通过调用接口获取提示并渲染。

## 2. 提示属于 `Sudoku` 还是 `Game`？为什么？

- 主要属于 `Sudoku`：候选与下一步推断是基于当前网格状态（规则性检查），不依赖会话或历史。因为 `Sudoku` 已负责保存并操作网格，放在 `Sudoku` 可以保证提示逻辑与领域模型耦合，便于测试与复用。
- `Game` 可作为协作方：UI 层或 `Game` 在需要时调用 `sudoku.getCandidates()` / `sudoku.findNextStep()`，并根据策略决定是否直接填写（`guess`）或仅高亮提示。

## 3. 如何实现探索模式？

- 在 `Game` 中新增探索会话（`exploreSession`），提供以下操作：
  - `enterExplore()`：以当前 `historyIndex` 为起点，创建一个独立的分支历史 `branchHistory`（第 0 项为起点）。将 `currentSudoku` 指向分支起点的拷贝，进入探索模式。
  - `exploreGuess(move)`：在探索模式中执行一次填数；将新的局面推入 `branchHistory`。若出现冲突（`getInvalidCells().length > 0`），记录该失败路径（序列化 JSON）到 `triedPaths`，并返回 `{ success: true, conflict: true, triedPath: boolean }`。若当前局面与已记录的失败路径匹配，返回 `triedPath: true`。
  - `exploreUndo()`：在探索分支中撤销一步（回到上一个分支快照）。
  - `exploreResetToStart()`：回到探索起点（分支第 0 项）。
  - `commitExplore()`：将分支历史（跳过第 0 项）合并到主历史，更新 `historyIndex` 并退出探索模式。
  - `abortExplore()`：放弃分支，恢复到进入探索前的主历史索引，退出探索模式。
  - `isInExplore()`：查询是否处于探索模式。
  - `hasExploreConflict()`：检查当前探索局面是否有冲突。
  - `isExploreTriedPath()`：检查当前局面是否匹配已失败的路径。

实现理由：采用"临时子会话 + 分支历史"的方式保持主历史清洁，并方便回滚或提交；同时满足作业对"回溯""冲突判定""记忆失败路径"的要求。

### 冲突检测与失败路径记忆

- 每次探索填数后检查冲突，若发现冲突则将当前局面序列化后存入 `triedPaths` 集合。
- 重新填数时，若当前局面已存在于 `triedPaths` 中，返回 `triedPath: true` 标识，UI 层通过 `exploreTriedPath` store 和黄色提示告知用户。
- 冲突时返回 `conflict: true`，UI 层通过 `exploreConflict` store 和红色提示告知用户，棋盘边框也会变红。

### UI 提示

- 探索模式下棋盘显示蓝色边框（`explore-border`），冲突时边框变红（`explore-conflict-border`）。
- 操作区显示：撤销（↩）、回到起点（⟲）、提交（✓）、放弃（✕）。
- 冲突时显示红色提示条"冲突！此路径不可行，请回退或放弃探索"。
- 重复失败路径时显示黄色提示条"此局面与之前失败的探索路径相同，建议回退"。

## 4. 主局面与探索局面的关系是什么？

- 采用复制（深拷贝）策略：进入探索时复制当前主盘作为探索的起点，探索过程中所有变更都作用在该副本及其分支快照中。
- 优点：避免引用污染，主历史和主盘保持不变，撤销/放弃操作安全。
- 提交：将分支的快照（除起点）依序合并到主历史（作为新的连续步骤），并将当前盘替换为合并后的最后一步。
- 放弃：直接丢弃分支并恢复到进入探索前的主历史索引与盘面。

## 5. history 结构在本次作业中是否发生了变化？

- 主历史结构仍保持线性栈（数组 + 索引）。探索引入了**临时分支历史** `branchHistory`（仅在探索会话期间存在），并在提交时把分支转为主历史的后续步骤。
- 没有引入持久化的树状历史；分支是临时的、按需合并的（满足作业要求并避免复杂 DAG 合并语义）。

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

- 以闭包保存内部状态（`history`, `currentSudoku`）虽然简单但使得直接恢复复杂历史（例如包含分支的历史）稍微繁琐，需要额外辅助函数。
- 早期设计的线性历史模型不便于表达分支探索；为了兼容性选择了在 `Game` 层添加临时分支，而不是重构为完整的树状历史。

## 7. 如果重做一次 Homework 1，会如何修改原设计？

- 在 `Game` 中将历史抽象化为可扩展的数据结构（支持分支、引用或持久化快照），并暴露更明确的快照/恢复接口。
- 将 `Sudoku` 的克隆/序列化能力标准化（例如显式的 `snapshot()` / `restore(snapshot)`），使历史与分支管理更简洁。
- 为领域操作（如 `guess`）引入返回更丰富结果的约定（例如 `{ success, conflict, changedCells }`），便于上层决策。

## 开发说明（快速定位）

- `Sudoku` 的实现在 [src/domain/Sudoku.js](src/domain/Sudoku.js)
  - 新增：`getCandidates(row,col)`、`findNextStep()`
- `Game` 的实现在 [src/domain/Game.js](src/domain/Game.js)
  - 新增探索支持：`enterExplore()`、`exploreGuess()`、`exploreUndo()`、`exploreResetToStart()`、`commitExplore()`、`abortExplore()`、`isInExplore()`、`hasExploreConflict()`、`isExploreTriedPath()`
- `grid.js` 的实现在 [src/stores/grid.js](src/stores/grid.js)
  - 新增响应式状态：`inExplore`、`exploreConflict`、`exploreTriedPath`、`exploreMessage`
  - 新增包装函数：`enterExplore()`、`exploreGuess()`、`exploreUndo()`、`exploreResetToStart()`、`commitExplore()`、`abortExplore()`
- UI 组件：
  - [src/components/Controls/ActionBar/Actions.svelte](src/components/Controls/ActionBar/Actions.svelte) — 探索操作按钮与提示消息
  - [src/components/Board/index.svelte](src/components/Board/index.svelte) — 探索模式棋盘边框样式

## 测试

- [tests/hw2/06-hint-candidates.test.js](tests/hw2/06-hint-candidates.test.js) — 测试 `getCandidates()` 和 `findNextStep()`
- [tests/hw2/07-explore.test.js](tests/hw2/07-explore.test.js) — 测试探索模式的进入/提交/放弃、撤销/回到起点、冲突检测、失败路径记忆、主历史保持
