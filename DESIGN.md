# 设计文档：领域对象与 Svelte 响应式集成

## 一、架构概述

本项目采用**分层架构**，将领域逻辑与 UI 框架解耦：

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI Layer (Svelte Components)                 │
│  Board.svelte, Controls.svelte 等组件                           │
│  通过 $store 语法订阅状态，调用 game.js 暴露的方法               │
├─────────────────────────────────────────────────────────────────┤
│              Adapter Layer (game.js)                            │
│  协调多个 stores 与领域对象，提供统一的游戏操作入口              │
│  startNew(), guess(), undo(), redo(), hint() 等                 │
├─────────────────────────────────────────────────────────────────┤
│               Store Layer (stores/*.js)                         │
│  grid.js: 持有 Game 实例，暴露 userGrid, invalidCells 等响应式状态 │
│  game.js: gameWon, gamePaused 等游戏状态                        │
│  hints.js, timer.js, cursor.js 等: 其他 UI 状态                 │
├─────────────────────────────────────────────────────────────────┤
│              Domain Layer (domain/*.js)                         │
│  Sudoku: 网格数据、填数、校验、克隆                              │
│  Game: 持有 Sudoku、管理历史、undo/redo                          │
│  纯业务逻辑，框架无关，可独立测试                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、领域对象设计

### 2.1 Sudoku

**职责：**
- 持有当前 grid / board 数据（初始谜题 + 当前状态）
- 提供 `guess({ row, col, value })` 接口进行填数
- 提供校验能力（`isValid`, `getInvalidCells`, `isWon`）
- 提供外表化能力（`toString()`, `toJSON()`）
- 支持克隆用于历史快照

**核心方法：**

| 方法 | 说明 |
|------|------|
| `getGrid()` | 获取当前网格副本（深拷贝） |
| `getInitialGrid()` | 获取初始谜题副本（深拷贝） |
| `guess(move)` | 在指定位置填入数字，返回是否成功 |
| `isInitial(row, col)` | 检查是否是初始数字（不可修改） |
| `isValid(row, col)` | 检查指定位置是否无冲突 |
| `getInvalidCells()` | 获取所有冲突单元格坐标 |
| `isWon()` | 检查是否完成且正确 |
| `clone()` | 克隆当前状态（用于历史快照） |
| `toJSON()` / `createSudokuFromJSON()` | 序列化/反序列化 |

**设计要点：**
- 使用闭包封装内部状态，`currentGrid` 和 `initialGrid` 对外不可直接访问
- `getGrid()` 返回深拷贝，防止外部直接修改内部状态
- 初始数字（`initialGrid` 中非零的单元格）不可修改

**核心实现：**
```javascript
export function createSudoku(puzzle) {
  // 防御性拷贝输入
  const initialGrid = deepCloneGrid(puzzle);
  validateGrid(initialGrid);
  
  // 当前状态网格
  let currentGrid = deepCloneGrid(initialGrid);
  
  return {
    getGrid() {
      return deepCloneGrid(currentGrid);  // 返回副本
    },
    
    guess({ row, col, value }) {
      // 不允许修改初始数字
      if (initialGrid[row][col] !== 0) {
        return false;
      }
      currentGrid[row][col] = value;
      return true;
    },
    
    isValid(row, col) {
      const value = currentGrid[row][col];
      if (value === 0) return true;
      // 检查行、列、3x3 方块冲突...
    },
    
    clone() {
      return createSudoku(currentGrid);
    },
    
    // ... 其他方法
  };
}
```

### 2.2 Game

**职责：**
- 持有当前 `Sudoku` 实例
- 管理历史记录（用于 Undo / Redo）
- 提供 `undo()` / `redo()` 接口
- 对外提供面向 UI 的游戏操作入口

**核心方法：**

| 方法 | 说明 |
|------|------|
| `getSudoku()` | 获取当前 Sudoku 实例 |
| `guess(move)` | 执行填数并记录历史 |
| `undo()` | 撤销上一步操作 |
| `redo()` | 重做下一步操作 |
| `canUndo()` / `canRedo()` | 检查是否可撤销/重做 |
| `getHistoryLength()` / `getHistoryIndex()` | 获取历史信息 |
| `toJSON()` / `createGameFromJSON()` | 序列化/反序列化 |

**核心实现：**
```javascript
export function createGame({ sudoku }) {
  let currentSudoku = sudoku;
  let history = [sudoku.clone()];  // 保存初始状态
  let historyIndex = 0;
  
  return {
    getSudoku() {
      return currentSudoku;
    },
    
    guess(move) {
      const success = currentSudoku.guess(move);
      if (success) {
        // 清除 redo 历史
        history = history.slice(0, historyIndex + 1);
        // 保存新状态
        history.push(currentSudoku.clone());
        historyIndex++;
      }
      return success;
    },
    
    undo() {
      if (!this.canUndo()) return false;
      historyIndex--;
      currentSudoku = history[historyIndex].clone();
      return true;
    },
    
    redo() {
      if (!this.canRedo()) return false;
      historyIndex++;
      currentSudoku = history[historyIndex].clone();
      return true;
    },
    
    canUndo() {
      return historyIndex > 0;
    },
    
    canRedo() {
      return historyIndex < history.length - 1;
    },
  };
}
```

### 2.3 历史管理策略

**快照存储 vs 操作存储：**

本项目选择**存储完整快照**，而非存储操作记录。

优点：
- 实现简单，不需要复杂的回滚逻辑
- 每次操作都保存完整状态，保证一致性
- 避免了操作逆运算的复杂性

Trade-off：
- 内存占用相对较高（每步操作存储完整 9x9 网格）
- 对于数独这种小规模数据，内存开销可接受

**未来优化方向：**
- 可改为增量/差分存储
- 可限制历史记录最大长度

### 2.4 Move 是值对象

`Move`（`{ row, col, value }`）是**值对象**，原因：
- 只表示一次用户操作，没有唯一标识
- 不需要生命周期管理
- 两个 Move 如果 row、col、value 相同，则它们等价
- 适合作为轻量级数据结构传递

---

## 三、领域对象如何被消费

### 3.1 View 层直接消费的是什么？

View 层**不直接消费** `Game` 或 `Sudoku`，而是消费 **Store Layer** 暴露的响应式状态。

```
┌─────────────────────────────────────────────────────────────┐
│  View (Svelte 组件)                                         │
│    - Board.svelte: 渲染 $userGrid, $invalidCells            │
│    - Controls.svelte: 调用 undo(), redo(), hint()           │
│    - Keyboard.svelte: 调用 setGuess()                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ $store 语法 / 函数调用
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Store Layer (stores/*.js)                                  │
│    - grid.js: userGrid, grid, invalidCells (writable)       │
│              内部持有 Game 实例                              │
│    - game.js: gameWon, gamePaused (writable)                │
│    - hints.js: hints, usedHints (writable)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ 创建/调用
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain Layer (domain/*.js)                                 │
│    - Sudoku: 纯业务逻辑，框架无关                            │
│    - Game: 持有 Sudoku，管理历史                            │
└─────────────────────────────────────────────────────────────┘
```

**具体消费方式：**

```svelte
<!-- Board.svelte -->
<script>
  import { userGrid, grid, invalidCells } from '@sudoku/stores/grid';
  import { cursor } from '@sudoku/stores/cursor';
</script>

{#each $userGrid as row, y}
  {#each row as value, x}
    <!-- 使用 $store 语法自动订阅 -->
    <Cell {value} 
          disabled={$grid[y][x] !== 0}
          conflicting={$invalidCells.includes(`${x},${y}`)} />
  {/each}
{/each}
```

### 3.2 View 层拿到的数据是什么？

| Store | 类型 | 说明 |
|-------|------|------|
| `userGrid` | `writable<number[][]>` | 当前用户填写的网格（UI 渲染来源） |
| `grid` | `writable<number[][]>` | 初始谜题网格（判断哪些格子是用户可填的） |
| `invalidCells` | `writable<string[]>` | 冲突单元格列表（用于高亮错误） |
| `gameWon` | `writable<boolean>` | 游戏是否胜利 |
| `gamePaused` | `writable<boolean>` | 游戏是否暂停 |
| `hints` | `writable<number>` | 剩余提示次数 |
| `timer` | `writable<number>` | 计时器 |
| `cursor` | `writable<{x, y}>` | 当前选中位置 |
| `candidates` | `writable<object>` | 候选数标记 |

### 3.3 用户操作如何进入领域对象？

用户操作通过 **Adapter Layer (game.js)** 进入领域对象：

#### 1. 开始游戏

```javascript
// 组件调用 (Modal.svelte)
import game from '@sudoku/game';
game.startNew('medium');

// game.js 内部流程
export function startNew(difficultyValue) {
  resetTimer();
  resetHints();
  resetGameState();
  candidates.clearAll();
  cursor.reset();
  setDifficulty(difficultyValue);
  
  // 关键：创建领域对象
  startNewGame(difficultyValue);  // → createSudoku → createGame
  
  startTimer();
}

// stores/grid.js
export function startNewGame(difficulty) {
  const puzzle = generatePuzzle(difficulty);
  initGame(puzzle);
}

export function initGame(puzzle) {
  const sudoku = createSudoku(puzzle);
  game = createGame({ sudoku });  // 创建 Game 实例
  
  grid.set(puzzle);
  userGrid.set(sudoku.getGrid());
  invalidCells.set([]);
}
```

#### 2. 填数操作

```javascript
// 组件调用 (Keyboard.svelte)
import { setGuess } from '@sudoku/stores/grid';
setGuess($cursor, num);

// stores/grid.js
export function setGuess(cursor, value) {
  if (!game) return;
  
  // 检查是否是初始数字
  if (initialGrid && initialGrid[cursor.y][cursor.x] !== 0) {
    return;
  }
  
  // 关键：调用领域对象
  game.guess({ row: cursor.y, col: cursor.x, value });
  
  // 更新响应式状态（触发 UI 更新）
  const newGrid = game.getSudoku().getGrid();
  userGrid.set(newGrid);
  invalidCells.set(game.getSudoku().getInvalidCells());
}
```

#### 3. Undo / Redo

```javascript
// 组件调用 (Actions.svelte)
import { undo, redo, canUndo, canRedo } from '@sudoku/game';

<button on:click={undo} disabled={!canUndo()}>撤销</button>

// game.js
export function undo() {
  const game = getGame();
  if (game && game.canUndo()) {
    game.undo();  // 调用领域对象
    
    // 更新 UI 状态
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
  }
}
```

#### 4. 使用提示

```javascript
// 组件调用
import { hint } from '@sudoku/game';
hint();

// game.js
export function hint() {
  const currentCursor = get(cursor);
  if (currentCursor.x !== null && currentCursor.y !== null) {
    if (useHint()) {  // 消耗提示次数
      applyHint(currentCursor);
    }
  }
}

// stores/grid.js
export function applyHint(cursor) {
  if (!game) return false;
  
  // 先检查有效性，再填入（避免污染历史记录）
  for (let v = 1; v <= 9; v++) {
    if (isValidPlacement(cursor, v)) {
      game.guess({ row: cursor.y, col: cursor.x, value: v });
      userGrid.set(game.getSudoku().getGrid());
      invalidCells.set(game.getSudoku().getInvalidCells());
      return true;
    }
  }
  return false;
}
```

### 3.4 领域对象变化后，Svelte 为什么会更新？

**关键机制：显式调用 `.set()` 更新 writable store**

```
用户操作
    │
    ▼
game.guess()  ──────► 领域对象内部状态变化
    │                    (currentGrid 更新)
    │
    ▼
userGrid.set(newGrid)  ──► Store 值变化
    │
    ▼
Svelte 响应式系统  ──────► 通知所有订阅者
    │
    ▼
组件重新渲染
```

**核心代码：**
```javascript
// stores/grid.js
export function setGuess(cursor, value) {
  // 1. 调用领域对象修改状态
  game.guess({ row: cursor.y, col: cursor.x, value });
  
  // 2. 显式更新响应式 store（触发 UI 更新）
  const newGrid = game.getSudoku().getGrid();  // 获取副本
  userGrid.set(newGrid);  // ← 这里触发 Svelte 响应式更新！
  invalidCells.set(game.getSudoku().getInvalidCells());
}
```

**为什么必须显式调用 `.set()`？**

因为领域对象（Game/Sudoku）本身**不是响应式的**，它们是纯 JavaScript 对象。Svelte 的响应式系统无法检测到这些对象内部的变化。

Store Layer 的职责就是：
1. 持有领域对象实例
2. 在领域对象变化后，**手动**更新响应式 store
3. 让 Svelte 组件能够订阅这些变化

---

## 四、响应式机制说明

### 4.1 依赖的机制

本项目主要依赖：

| 机制 | 用途 |
|------|------|
| `writable` store | 创建可订阅的响应式状态 |
| `$store` 语法 | 组件中自动订阅/取消订阅 store |
| 显式 `.set()` 调用 | 领域对象变化后手动更新 store |

**为什么不使用 `$:` reactive statements？**

本项目的数据流是**单向的**：`领域对象 → store → UI`

当领域对象变化时，我们通过显式调用 `.set()` 来更新 store，这种方式：
- 更加明确和可控
- 避免了 reactive statement 的隐式依赖追踪问题
- 便于调试和理解数据流

### 4.2 响应式边界在哪里？

```
┌─────────────────────────────────────────────────────────────┐
│  Domain Layer (非响应式)                                    │
│  Game, Sudoku: 纯 JavaScript 对象，内部状态变化不会触发 UI  │
├─────────────────────────────────────────────────────────────┤
│  Store Layer (响应式边界) ◄────── 这里是响应式边界！        │
│  writable stores: 值变化会通知订阅者                        │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (响应式消费)                                      │
│  $store 语法: 自动订阅 store 变化                           │
└─────────────────────────────────────────────────────────────┘
```

**响应式边界**位于 Store Layer：
- 边界之下（Domain）：非响应式，纯业务逻辑
- 边界之上（UI）：响应式消费，自动更新

### 4.3 哪些数据是响应式暴露给 UI 的？

| 数据 | 暴露方式 | 说明 |
|------|---------|------|
| `userGrid` | writable store | 当前网格状态，UI 直接渲染 |
| `grid` | writable store | 初始谜题，用于判断用户可填区域 |
| `invalidCells` | writable store | 冲突单元格，用于高亮显示 |
| `gameWon` | writable store | 胜利状态，触发结束弹窗 |
| `gamePaused` | writable store | 暂停状态，控制界面交互 |
| `hints` | writable store | 剩余提示次数 |
| `timer` | writable store | 计时器 |
| `cursor` | writable store | 当前选中位置 |
| `candidates` | writable store | 候选数标记 |

### 4.4 哪些状态留在领域对象内部？

| 数据 | 存储位置 | 说明 |
|------|---------|------|
| `currentGrid` / `initialGrid` | Sudoku 内部闭包 | 网格数据，只能通过方法访问 |
| `history` / `historyIndex` | Game 内部闭包 | 历史记录，对 UI 不可见 |

这些状态不直接暴露给 UI，只能通过领域对象的方法访问（如 `getGrid()`, `canUndo()`）。

### 4.5 如果直接 mutate 内部对象会出什么问题？

#### 问题 1：Svelte 无法检测到变化

```javascript
// ❌ 错误做法：直接修改内部数组
function setGuess(cursor, value) {
  game.getSudoku().currentGrid[cursor.y][cursor.x] = value;  // 直接修改
  // 没有 .set() 调用，UI 不会更新！
}
```

**原因：** Svelte 的响应式基于**赋值检测**，直接修改对象内部属性或数组元素不会触发更新。只有当 store 的值被 `.set()` 替换时，Svelte 才会通知订阅者。

#### 问题 2：破坏领域对象的封装

```javascript
// ❌ 错误做法：外部直接访问内部状态
const grid = game.getSudoku().currentGrid;  // 如果暴露了内部引用
grid[y][x] = 5;  // 外部可以直接修改，绕过验证逻辑
```

这会绕过 Sudoku 的验证逻辑（如初始数字不可修改），导致数据不一致。

#### 正确做法

```javascript
// ✅ 正确做法：通过方法修改，返回新值，更新 store
game.guess({ row, col, value });              // 通过方法修改
const newGrid = game.getSudoku().getGrid();   // 获取副本
userGrid.set(newGrid);                         // 更新 store 触发 UI
```

---

## 五、深入理解 Svelte 响应式机制

### 5.1 为什么修改对象内部字段后，界面不一定自动更新？

Svelte 的响应式系统基于**变量赋值**检测，而不是对象属性变化检测。

```javascript
let obj = { count: 0 };

function increment() {
  obj.count++;  // ❌ Svelte 不会检测到这个变化
}

function incrementCorrect() {
  obj = { ...obj, count: obj.count + 1 };  // ✅ 赋值会触发更新
}
```

对于 store：
```javascript
const store = writable({ count: 0 });

// ❌ 可能不更新：虽然调用了 update，但返回的是同一个对象引用
store.update(s => { s.count++; return s; });

// ✅ 正确：返回新对象
store.update(s => ({ ...s, count: s.count + 1 }));
```

### 5.2 为什么直接改二维数组元素，Svelte 不会按预期刷新？

数组是引用类型，修改元素不会改变数组引用：

```javascript
let grid = [[1, 2, 3], [4, 5, 6]];

grid[0][0] = 9;  // ❌ 引用没变，Svelte 可能不更新

grid = [...grid];  // ✅ 创建新引用，触发更新
```

**本项目的解决方案：**

`Sudoku.getGrid()` 返回深拷贝，每次调用都是新数组：
```javascript
getGrid() {
  return deepCloneGrid(currentGrid);  // 返回新数组，确保响应式更新
}
```

### 5.3 为什么 store 可以被 `$store` 消费？

`$store` 是 Svelte 的语法糖，编译时会自动：

1. 在组件初始化时调用 `store.subscribe(callback)`
2. 在组件销毁时调用 `unsubscribe()`
3. 创建一个响应式变量，当 store 值变化时自动更新

编译前：
```svelte
<script>
  import { userGrid } from './stores/grid.js';
</script>

<div>{$userGrid[0][0]}</div>
```

编译后（简化）：
```javascript
let $userGrid;
const unsubscribe = userGrid.subscribe(value => {
  $userGrid = value;
  // 触发组件重新渲染
});

// 组件销毁时
onDestroy(unsubscribe);
```

### 5.4 为什么 `$:` 有时会更新，有时不会更新？

`$:` 是 Svelte 的 reactive statement，它依赖的**变量引用**变化时才会执行。

**不会更新的情况：**

```javascript
let obj = { value: 0 };

$: doubled = obj.value * 2;  // 依赖 obj.value

obj.value = 5;  // ❌ 不会触发，因为 obj 引用没变
obj = { value: 5 };  // ✅ 会触发
```

**间接依赖问题：**

```javascript
let a = 1;
let b = a;

$: doubled = b * 2;  // 依赖 b，不是 a

a = 2;  // ❌ 不会触发 doubled 更新
b = a;  // ✅ 这样才会触发
```

### 5.5 本项目的避免策略

**不依赖 reactive statement 来追踪领域对象变化**，而是：
- 显式调用 `.set()` 更新 store
- 确保数据流清晰可控
- 避免隐式依赖追踪的陷阱

---

## 六、改进说明

### 6.1 相比 HW1 的改进

| 改进点 | HW1 问题 | 改进方案 |
|--------|---------|---------|
| 接入程度 | 领域对象只在测试中可用 | 真正接入 Svelte 游戏流程 |
| 职责分离 | 部分逻辑散落在组件中 | 统一到 `game.js` 适配层 |
| 响应式边界 | 不清晰 | 明确 Store Layer 为响应式边界 |
| 模块系统 | 使用 CommonJS `require` | 改为 ES 模块 `import` |
| 初始化问题 | grid/userGrid 初始化为空数组 | 初始化为 9x9 网格 |
| Store 类型 | gameWon 使用 derived，无法 set | 改为 writable store |

### 6.2 HW1 做法不足以支撑真实接入的原因

1. **领域对象孤立存在**：HW1 中的 Sudoku/Game 仅在测试中使用，UI 没有真正消费
2. **缺少适配层**：没有将领域对象状态转换为 Svelte 可消费的响应式状态
3. **模块系统不统一**：使用 `require` 导致在 ES 模块环境下无法运行
4. **直接操作数组**：组件直接修改二维数组，绕过了领域对象的验证逻辑
5. **Store 类型错误**：derived store 只读，无法用于需要手动更新的场景

### 6.3 新设计的 Trade-offs

**优点：**
- 领域对象完全独立于框架，可独立测试
- 响应式边界清晰，便于理解和维护
- 支持未来迁移到其他框架（只需重写 Store Layer）
- 数据流单向，便于调试

**缺点：**
- 需要手动调用 `.set()` 更新 UI，可能遗漏
- 增加了一层抽象，代码量略有增加
- 历史记录存储完整快照，内存占用相对较高

---

## 七、项目文件结构

```
src/
├── main.js                      # 应用入口
├── App.svelte                   # 根组件
├── constants.js                 # 常量定义
├── sencode.js                   # 数独编码/解码
│
├── domain/                      # 领域层（框架无关）
│   ├── index.js                 # 导出入口
│   ├── Sudoku.js                # Sudoku 领域对象
│   └── Game.js                  # Game 领域对象
│
├── stores/                      # Store 层（响应式边界）
│   ├── index.js                 # 导出入口
│   ├── grid.js                  # 网格状态，持有 Game 实例
│   ├── game.js                  # 游戏状态（gameWon, gamePaused）
│   ├── hints.js                 # 提示次数
│   ├── timer.js                 # 计时器
│   ├── cursor.js                # 当前选中位置
│   ├── candidates.js            # 候选数标记
│   ├── difficulty.js            # 难度
│   ├── settings.js              # 用户设置
│   ├── modal.js                 # 弹窗状态
│   └── keyboard.js              # 键盘状态
│
├── game.js                      # 适配层（协调 stores 和 domain）
│
├── node_modules/@sudoku/        # 模块别名（rollup alias）
│   ├── game.js                  # 适配层副本
│   ├── stores/                  # stores 副本
│   └── domain/                  # domain 副本
│
└── components/                  # UI 组件
    ├── Board/
    ├── Controls/
    ├── Header/
    └── Modal/
```

---

## 八、迁移到 Svelte 5 的考量

如果将来迁移到 Svelte 5：

**最稳定的层：Domain Layer**
- Sudoku / Game 是纯 JavaScript 对象，与框架无关
- 无需任何修改即可继续使用

**最可能改动的层：Store Layer**
- Svelte 5 引入 runes（`$state`, `$derived`）
- writable store 可能被 reactive class 替代
- 但 Adapter Layer（game.js）的接口可保持不变

**迁移策略：**
1. 保持 Domain Layer 不变
2. 将 Store Layer 改为使用 Svelte 5 的 reactive primitives
3. UI 组件逐步迁移到新的响应式语法

---

## 九、总结

本设计通过 **Store Adapter 模式**，成功将领域对象（Sudoku/Game）接入 Svelte 游戏流程：

| 层次 | 职责 | 响应式 |
|------|------|--------|
| Domain Layer | 纯业务逻辑 | ❌ 非响应式 |
| Store Layer | 持有领域对象，暴露响应式状态 | ✅ 响应式边界 |
| Adapter Layer | 协调操作，连接 UI 与 Domain | - |
| UI Layer | 消费响应式状态，触发领域对象方法 | ✅ 响应式消费 |

**关键设计决策：**

1. **领域对象与框架解耦**：Sudoku/Game 是纯 JavaScript，可独立测试
2. **显式更新策略**：领域对象变化后手动调用 `.set()` 更新 store
3. **深拷贝保护**：`getGrid()` 返回副本，防止外部修改内部状态
4. **单向数据流**：用户操作 → 领域对象 → store 更新 → UI 刷新

这种分层设计确保了：
- 领域对象的独立性和可测试性
- Svelte 响应式机制的正确使用
- 未来框架迁移的灵活性
