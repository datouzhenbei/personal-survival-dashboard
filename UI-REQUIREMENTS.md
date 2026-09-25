# 个人生存看板 — 前端 UI 需求文档

> 本文档为前端页面生成规格，供前端工程师 / AI（Trae）据此生成 `index.html`、`css/`、`js/ui/` 下全部前端代码。
> 后端核心计算逻辑（`js/core/`）已由项目负责人完成，前端**只负责 UI 渲染与调用**，不要重复实现计算。

---

## 1. 项目概述

- **名称**：个人生存看板（Personal Survival Dashboard）
- **性质**：纯前端静态网站，零后端、零网络请求
- **核心功能**：
  1. 生命倒计时（按用户给定的预期寿命做线性时间换算）
  2. 存款生存计算器（按月消耗模拟可支撑时长）
- **数据存储**：`localStorage`，不上传任何服务器
- **定位声明**：个人计算工具，**不提供任何金融、投资、医疗、寿命预测建议**（页脚必须有免责声明）

## 2. 技术栈与约束

- **HTML**：单页 `index.html`，使用原生 ES Module（`<script type="module">`）
- **CSS**：原生 CSS（`css/style.css`），不引入框架；可用 CSS 变量统一管理设计 token
- **JS**：原生 JavaScript（ES2020+），UI 层放 `js/ui/`，通过 `import` 引用 `js/core/index.js`
- **禁止**：不使用 React/Vue/构建工具；不引入任何 CDN 或外部网络资源（保证离线可用）
- **字体**：系统字体栈优先，中文 `"-apple-system", "PingFang SC", "Microsoft YaHei", sans-serif`
- **图标**：内联 SVG（不依赖图标库 CDN）

## 3. 目录与文件分工

```
personal-survival-dashboard/
├── index.html                  # ← Trae 生成（页面骨架）
├── css/
│   └── style.css               # ← Trae 生成（全部样式）
├── js/
│   ├── core/                   # ← 已由项目负责人完成，前端不要改动
│   │   ├── config.js
│   │   ├── storage.js
│   │   ├── life.js
│   │   ├── savings.js
│   │   └── index.js            # 统一导出
│   └── ui/                     # ← Trae 生成（UI 编排与交互）
│       ├── app.js              # 应用入口、初始化、事件编排
│       ├── render.js           # 各模块渲染函数
│       ├── format.js           # 本地化格式化（货币/日期/数字）
│       └── components.js       # 可复用组件工厂
├── assets/                     # 图标/字体等本地资源（如有）
├── UI-REQUIREMENTS.md          # 本文档
├── README.md
└── .gitignore
```

## 4. 设计系统

### 4.1 配色（暗色简约）

全程使用暗色背景 + 高对比浅色文字。单一强调色用于「时间剩余 / 关键数值」。

| Token              | 值           | 用途                         |
| ------------------ | ------------ | ---------------------------- |
| `--bg-base`        | `#0a0a0c`    | 页面底色                     |
| `--bg-card`        | `#141417`    | 卡片背景                     |
| `--bg-card-hover`  | `#1c1c20`    | 卡片悬停                     |
| `--bg-input`       | `#1a1a1e`    | 输入框背景                   |
| `--border`         | `#26262b`    | 边框/分割线                  |
| `--border-strong`  | `#34343a`    | 强调边框（输入聚焦）         |
| `--text-primary`   | `#f5f5f6`    | 主文字                       |
| `--text-secondary` | `#a1a1aa`    | 次文字 / 说明                |
| `--text-muted`     | `#6b6b73`    | 弱化文字 / 占位             |
| `--accent`         | `#f5a623`    | 强调色（时间剩余、关键数值） |
| `--accent-soft`    | `rgba(245,166,35,0.12)` | 强调色弱底          |
| `--danger`         | `#ef4444`    | 警告/耗尽/负数               |
| `--success`        | `#22c55e`    | 可持续/正向                   |
| `--ring-track`     | `#26262b`    | 进度环底色                    |

> 说明：强调色 `--accent` 选用暖橙（`#f5a623`），与"时间流逝"的紧迫感契合且不刺眼。不要使用纯红/纯绿作为主色。

### 4.2 字体与字号

- 字号阶梯：`--fs-hero: 3.5rem`、`--fs-h1: 2rem`、`--fs-h2: 1.5rem`、`--fs-body: 1rem`、`--fs-sm: 0.875rem`、`--fs-xs: 0.75rem`
- 数字采用等宽或 tabular-nums（`font-variant-numeric: tabular-nums`），避免跳动
- 关键大数值（剩余天数、可支撑月数）使用 `--fs-hero` 等宽

### 4.3 间距 / 圆角 / 阴影

- 间距阶梯：`--sp-1: 4px`、`--sp-2: 8px`、`--sp-3: 12px`、`--sp-4: 16px`、`--sp-6: 24px`、`--sp-8: 32px`
- 圆角：`--radius-sm: 8px`、`--radius-md: 12px`、`--radius-lg: 16px`、`--radius-pill: 999px`
- 阴影：`--shadow-card: 0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.3)`

### 4.4 动效

- 倒计时秒数每秒刷新，**只更新数字文本**，不做整卡重绘，避免抖动
- 进度环/条用 `transition: stroke-dashoffset 0.6s ease` 平滑过渡
- 输入失焦后 200ms 内完成计算与回填，期间数值区可加一个极轻的 `opacity` 过渡
- 禁止：花哨的入场动画、闪烁、自动滚动

## 5. 页面整体结构

单页纵向布局，自上而下：

1. **顶栏（Header）**：站点标题 + 数据状态指示（已保存/未保存） + 数据菜单（导入/导出/清空）
2. **首屏总览（Hero）**：两个核心大数字卡并排（桌面）/ 堆叠（移动）—— 剩余生命天数 · 存款可支撑月数
3. **生命倒计时模块**
4. **存款生存计算器模块**
5. **设置面板**（可折叠 / 抽屉式）：个人档案 + 偏好
6. **页脚（Footer）**：免责声明 + 数据本地化说明

桌面端最大宽度 `1200px` 居中；移动端全宽，左右内边距 `16px`。

## 6. 页面模块详述

### 6.1 顶栏 Header

- 左：标题「生存看板」+ 副标题「本地计算 · 数据不上传」
- 右：三个图标按钮（内联 SVG）——「导出 JSON」「导入 JSON」「清空数据」
  - 清空需二次确认（自定义 confirm 弹层，**不要用浏览器原生 `confirm`**）
- 数据状态点：绿点=已保存过数据，灰点=首次使用未保存

### 6.2 首屏总览 Hero

两张并排大卡（`grid-template-columns: 1fr 1fr`，移动端 `1fr`）：

**卡 A：剩余生命时间**
- 主数值：剩余天数（来自 `lifeStats.breakdown.days`）→ `--fs-hero` 等宽，`--accent` 色
- 副信息：`XX 年 XX 天 XX:XX:XX`（年=breakdown.years，天=remDays，时:分:秒）
- 角标：百分比 `已活 XX%` / `剩余 XX%`

**卡 B：存款可支撑时长**
- 主数值：可支撑月数（来自 `savingsResult.monthsLeft`，若为 `Infinity` 显示"可持续"）
- 副信息：`XX 年 XX 个月` 或 `耗尽日期：YYYY-MM-DD`
- 角标：`月净消耗 ¥XXXX`

> 首屏两张卡即核心信息密度，不要塞更多元素。

### 6.3 生命倒计时模块

布局：左侧大进度环（生命进度百分比），右侧参数 + 详情列表。

- **进度环**：SVG circle，`stroke-dashoffset` 随 `percentLived` 变化；环内显示 `XX%` 大字 + 「已度过」小字
- **参数区**（可编辑，失焦即存）：
  - 出生日期（`<input type="date">`）
  - 性别（`male/female/unspecified` 三选一 chip 组）
  - 预期寿命（`<input type="number" min="1" max="150">`，留空用性别默认）
  - 退休年龄（可选，留空用性别默认）
- **详情列表**：
  - 当前年龄（整数 + 小数一位）
  - 已度过：X 年 X 天
  - 剩余：X 年 X 天 XX:XX:XX（每秒刷新）
  - 下次生日：YYYY-MM-DD（距 X 天）
  - 退休日：YYYY-MM-DD（距 X 天）
- **已超期**状态（`lifeStats.isOver === true`）：进度环显示 100%，副文字提示「已超过设定预期寿命 XX 天」，用 `--success` 而非危险色（正向表达）

### 6.4 存款生存计算器模块

布局：左侧输入卡，右侧结果卡。

- **输入卡**（失焦即算、即存）：
  - 当前存款（元，`<input type="number" min="0">`，千分位显示）
  - 月支出（元）
  - 月收入（元，默认 0，可留空）
  - 年化通胀率（%，默认 2.5，范围 0–100）
- **结果卡**：
  - 大数字：可支撑月数 → 顶部 Hero 卡 B 同源数据
  - 耗尽日期：YYYY-MM-DD（可持续时显示「— 不会耗尽 —」）
  - 月净消耗：`¥支出 − ¥收入 = ¥净`（净为正=消耗，红；为负=盈余，绿）
  - 累计支出 / 累计收入（模拟期内）
  - **压力测试小表**（三行）：
    - 支出 +20% → X 个月
    - 收入 −50% → X 个月
    - 通胀翻倍 → X 个月
- 输入校验：负数禁止输入；通胀超 0–100 显示行内提示

### 6.5 设置面板

抽屉式或折叠面板，包含：
- 货币符号（默认 ¥）
- 默认通胀率
- 主题（预留"暗色/自动"，当前仅暗色，可留 UI 占位但不切换）
- 「重置全部为默认」按钮（二次确认）
- 「导出 JSON」「导入 JSON」入口（与顶栏一致）

### 6.6 页脚 Footer

- 一行免责声明（来自 `Config.DISCLAIMER`）
- 一行数据本地化说明：「所有数据仅保存在本设备的浏览器 localStorage 中，清除浏览器数据将丢失。」
- 版本号 + GitHub 仓库链接占位

## 7. 组件清单（可复用）

| 组件            | 用途                                   | 关键点                                                       |
| --------------- | -------------------------------------- | ------------------------------------------------------------ |
| `StatCard`      | 单个数值卡                             | 标题 + 大数值 + 单位 + 副信息                                |
| `ProgressRing`  | 环形进度（生命进度）                   | SVG circle + `stroke-dashoffset`，支持 100% 封口             |
| `InputField`    | 带标签/单位/校验的输入                 | label、input、unit、error 槽                                 |
| `ChipGroup`     | 多选一标签组（性别等）                 | 单选语义，可键盘聚焦                                         |
| `DataTable`     | 压力测试小表                           | 两列：情景 / 可支撑月数                                       |
| `ConfirmDialog` | 自定义二次确认（清空/重置）            | 模态层 + 遮罩 + ESC 关闭，**禁用原生 confirm/alert**          |
| `Toast`         | 轻提示（保存成功/导入成功）            | 右下角，3 秒自动消失                                         |

## 8. 响应式适配

| 断点            | 宽度        | 行为                                            |
| --------------- | ----------- | ----------------------------------------------- |
| `desktop`       | ≥ 1024px    | Hero 两列、模块左右分栏、最大宽 1200px 居中     |
| `tablet`        | 640–1023px  | Hero 两列、模块纵向堆叠                          |
| `mobile`        | < 640px     | 全部单列、字号降一级、间距 `--sp-4`             |

- 所有输入控件触控热区 ≥ 44×44px
- 数字大屏在移动端使用 `clamp(2rem, 12vw, 3.5rem)` 防溢出
- 横屏手机下进度环可缩为更小尺寸

## 9. 与核心 JS 的数据绑定契约（关键）

UI 层通过统一入口引入，**严禁重复实现计算**：

```js
import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';
```

### 9.1 localStorage 键（统一走 `Storage`，不要直接 `localStorage.setItem`）

```js
const profile = Storage.load(Config.KEYS.PROFILE, null);
// profile 结构示例：{ birthDate: '1990-01-15', gender: 'male', lifeExpectancy: 80, retirementAge: 60 }

const savings = Storage.load(Config.KEYS.SAVINGS, null);
// savings 结构示例：{ savings: 500000, monthlyExpense: 8000, monthlyIncome: 0, inflationRate: 2.5 }
```

### 9.2 调用生命倒计时

```js
const life = new LifeCountdown({
  birthDate: profile.birthDate,
  gender: profile.gender,
  lifeExpectancy: profile.lifeExpectancy, // 可选，未给用性别默认
  retirementAge: profile.retirementAge,   // 可选
});
const stats = life.getStats();
// stats 字段：见 js/core/life.js getStats() 返回
// 关键字段：breakdown{years,days,remDays,hours,minutes,seconds}、percentLived、isOver、nextBirthday、retirementDate
```

### 9.3 调用存款计算器

```js
const calc = new SavingsCalculator({
  savings: savingsCfg.savings,
  monthlyExpense: savingsCfg.monthlyExpense,
  monthlyIncome: savingsCfg.monthlyIncome ?? 0,
  inflationRate: savingsCfg.inflationRate ?? Config.DEFAULTS.inflationRate,
});
const result = calc.simulate();
// result 字段：monthsLeft(可能 Infinity)、yearsLeft、depletionDate、monthlyBurn、isSustainable、note
const stress = calc.stressTests();
// stress: { expenseUp20, incomeDown50, inflationDoubled }  每项为 monthsLeft
```

### 9.4 持久化时机

- 任何输入失焦（`blur`）或 `change` 时 → 立即 `Storage.save(KEY, value)` → 重新计算并渲染
- 不要在 `input` 事件里高频写 localStorage（节流到 blur/change）
- 倒计时秒数刷新**只重渲染数字节点**，不重读 localStorage

### 9.5 导入/导出

```js
// 导出
const json = Storage.exportJSON();          // 返回 JSON 字符串 → 下载为 .json
// 导入
Storage.importAll(parsedJson);              // 成功返回 true → 触发全量重渲染
```

### 9.6 错误处理

核心模块在参数非法时会 `throw`，UI 层必须 `try/catch` 并在对应输入旁显示行内错误，**不得让页面白屏**。常见异常：
- 出生日期晚于当前
- 预期寿命超 0–150
- 存款/收支为负
- 通胀率超 0–100

## 10. 状态管理与初始化流程

`app.js` 启动顺序：

1. 读 `Config.KEYS.PROFILE` → 若无，展示「首次使用」引导卡（提示填写出生日期等），不渲染倒计时
2. 读 `Config.KEYS.SAVINGS` → 若无，存款卡显示空状态 + 引导
3. 任意一项就绪即渲染对应模块
4. 启动 `setInterval(updateClock, 1000)` 仅刷新秒数字节点
5. 监听所有输入 `change`/`blur` → 存盘 → 重算 → 局部重渲染

## 11. 文案与免责

- 所有货币默认 `¥`，数字用 `toLocaleString('zh-CN')` 千分位
- 日期用 `toLocaleDateString('zh-CN')` 或 `YYYY-MM-DD`
- 页脚必须显示 `Config.DISCLAIMER` 全文
- 生命预期相关处显示 `Config.LIFE_EXPECTANCY_NOTE` 作为小字说明

## 12. 可访问性

- 所有图标按钮带 `aria-label`
- 进度环 `role="progressbar"` + `aria-valuenow`
- 输入有显式 `<label for>`
- 颜色对比度 ≥ AA（暗底浅字已满足）
- 键盘可达：Tab 顺序自上而下，模态可 ESC 关闭

## 13. 验收标准

- [ ] 桌面 / 平板 / 手机三档下无横向滚动、无溢出
- [ ] 出生日期 + 性别填写后，倒计时每秒刷新且不抖动
- [ ] 存款/收支/通胀输入后失焦即算，结果即时更新
- [ ] 月收入 ≥ 月支出时显示"可持续"，无死循环卡顿
- [ ] 导出 JSON 可下载，导入同文件后数据一致
- [ ] 清空数据需二次确认，清空后回到首次使用引导
- [ ] 页脚免责声明完整可见
- [ ] 全程零网络请求（开发者工具 Network 面板无外部请求）
- [ ] 关闭浏览器再打开，数据仍在

---

# 附录 A：v1.1 数据安全模块（2026-09-25 实施）

> v1.1 的 UI 由项目负责人直接实现，本节记录增量规格以保持文档与实现一致。
> 完整方案与决策记录见 `V1.1-PLAN-DATA-DURABILITY.md`。

## A.1 新增页面元素

| 元素 | 位置 | 说明 |
|---|---|---|
| 数据安全卡片 | `main` 内、存款计算器与设置抽屉之间（`#data-module`） | 标题 + 数据量/最后备份时间 + 导出/导入按钮 + 说明文字 |
| 备份提示条 | 数据安全卡片内，满足条件时出现 | 警示图标 + 文案 + 「立即导出」/「稍后再说」 |
| 导入预览对话框 | 全屏遮罩居中（挂载于 `#modal-root`） | 文件信息 + 数据项清单（新增/覆盖徽标）+ 校验提示 + 忽略字段 + 说明 |

## A.2 交互契约

- **导出**：`Storage.exportFileName()` 作为文件名 → 成功后 `Storage.markExported()` → 重渲染
- **导入**：`Storage.parseImport()` → 弹预览 → 用户确认 → `Storage.applyImport()` → 成功后 `Storage.markChanged()` → 重渲染
- **校验不通过**：只弹 Toast，**不弹预览**，现有数据零改动
- **用户取消预览**：Toast 提示「已取消导入」，现有数据零改动
- **「稍后再说」**：`Storage.snoozeBackupReminder()` → 24 小时内不再出现提示条
- **写入失败**：自动回滚到导入前状态并报错

## A.3 数据安全卡片文案

- 无数据：`暂无数据 —— 填写生命倒计时或存款参数后，这里会显示备份状态`
- 有数据：`当前数据 N 项 · 最后备份 {今天 | N 天前 | 从未备份}`
- 有导出记录时追加一行：`上次导出：YYYY-MM-DD HH:mm`

## A.4 v1.1 验收标准（补充 §13）

- [ ] 导出文件名带时间戳，连续两次导出不覆盖
- [ ] 导出内容含 `psdExport` / `schemaVersion` / `exportedAt`
- [ ] V1.0 旧格式文件可导入并提示「已识别为 V1 旧版备份」
- [ ] 损坏 JSON / 非本应用文件被拒绝，且现有数据零改动
- [ ] `schemaVersion` 更高时尽力导入并给出明确提示
- [ ] 单字段越界时逐字段回退默认值 + 警告，其余数据照常导入
- [ ] 导入预览列出的项与实际内容一致；取消后数据零改动
- [ ] 距上次备份 ≥ 14 天 / 有改动未备份 / 从未备份时出现提示条
- [ ] 点「稍后再说」后 24 小时内不再出现
- [ ] 五档视口（1440 / 1024 / 820 / 390 / 360）无横向溢出

## A.5 实现与验收结果（2026-09-25）

| 项目 | 结果 |
|---|---|
| core 层单元验证 | **59 项断言全部通过** |
| 浏览器端验收 | **31 项断言全部通过** |
| 五视口横向溢出 | 全部为 **0** |
| 基线用例 | 1990-01-15 / 男 / 75 岁，50 万存款 / 月支 8000 / 通胀 2.5% → **59 个月** |

> ⚠️ 后续若在 Trae 中继续改 UI，务必先对改动过的文件执行重新读取（Revert File），
> 否则 Trae 上下文中的旧内容会在保存时覆盖 v1.1 的实现。
