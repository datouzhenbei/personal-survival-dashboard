# 给 Trae 的指令（复制粘贴用）

> **用法**：在 Trae 里用「打开文件夹」打开本项目目录 `D:\workwork\outputs\personal-survival-dashboard`，然后把下面「指令正文」整段复制到 Trae 对话/Builder 输入框，发送即可。

---

## 指令正文

你是一名资深前端工程师。请为「个人生存看板」项目生成完整的前端页面代码。

### 1. 先读规格（最重要）

请先完整读取本目录下的 **`UI-REQUIREMENTS.md`**（前端 UI 需求文档），严格按它的每一个章节执行。该文档定义了：页面模块、暗色配色 CSS 变量、组件清单、响应式断点、数据绑定契约、验收标准。

### 2. 边界：只做前端，不要碰核心逻辑

- `js/core/` 目录（`config.js` / `storage.js` / `life.js` / `savings.js` / `index.js`）是**已完成的核心计算引擎**，**禁止修改、禁止覆盖、禁止重写**。
- 你只能创建/修改以下文件：
  - `index.html`
  - `css/style.css`
  - `js/ui/app.js`、`js/ui/render.js`、`js/ui/format.js`、`js/ui/components.js`

### 3. 必须遵守的硬约束

1. **纯静态、零依赖**：原生 HTML + CSS + ES Module JS。**不引入任何框架、任何 CDN、任何外部网络资源**（必须离线可用）。
2. **复用核心逻辑**：通过 `import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';` 调用，**不要自己重复实现任何计算**（倒计时、百分比、存款模拟、压力测试全部由 core 提供）。
3. **存储统一走 `Storage`**：键名用 `Config.KEYS.PROFILE` / `Config.KEYS.SAVINGS` / `Config.KEYS.SETTINGS`。**不要直接写 `localStorage.setItem`**。
4. **暗色简约主题**：配色严格使用 `UI-REQUIREMENTS.md` 第 4.1 节的 CSS 变量；强调色 `--accent: #f5a623`（暖橙）。
5. **响应式**：桌面 / 平板 / 手机三档（断点见文档第 8 节）；移动端**不得出现横向滚动**；输入控件触控热区 ≥ 44×44px。
6. **禁用原生弹窗**：不要用 `confirm()` / `alert()`；二次确认（清空数据、重置）用自实现模态。
7. **免责声明**：页脚必须显示 `Config.DISCLAIMER` 全文。本工具仅做个人计算，**不得出现任何金融、投资、医疗建议类文案**。
8. **异常处理**：core 在参数非法时会 `throw`，UI 层必须 `try/catch` 并在对应输入旁显示行内错误，**不得白屏**。
9. **性能**：倒计时每秒刷新时**只更新数字文本节点**，不要整卡重绘。
10. 生命周期「已超期」（`stats.isOver === true`）用 `--success` 绿色正向表达，不要用危险色。

### 4. 交付要求

- 生成后，对照 `UI-REQUIREMENTS.md` 第 13 节「验收标准」**逐条自检**并说明是否满足。
- 每个 JS 文件顶部加注释说明该文件职责。
- 保持代码整洁、可读，函数职责单一。

### 5. 完成后输出

列出所有新增/修改的文件清单，并简述每个文件的作用。

---

## 附：核心 API 速查（避免你猜错）

```js
import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';

// —— 生命倒计时 ——
const life = new LifeCountdown({ birthDate: '1990-01-15', gender: 'male' /* male|female|unspecified */ });
const stats = life.getStats();
// stats.breakdown     -> { years, days, remDays, hours, minutes, seconds }
// stats.percentLived  -> 已活百分比（0-100）
// stats.isOver        -> 是否已超过设定预期寿命
// stats.age           -> 整数年龄
// stats.nextBirthday  -> Date
// stats.retirementDate-> Date
// stats.daysUntilNextBirthday / stats.daysUntilRetirement

// —— 存款生存计算器 ——
const calc = new SavingsCalculator({
  savings: 500000,        // 当前存款
  monthlyExpense: 8000,   // 月支出
  monthlyIncome: 0,       // 月收入，可省略（默认 0）
  inflationRate: 2.5,     // 年化通胀率 %，可省略（默认取 Config.DEFAULTS.inflationRate）
});
const result = calc.simulate();
// result.monthsLeft    -> 可支撑月数（可能为 Infinity，表示可持续）
// result.isSustainable -> 是否可持续
// result.depletionDate -> Date 或 null
// result.yearsLeft / result.remainingMonths
// result.monthlyBurn   -> 月净消耗（正=消耗，负=盈余）
const stress = calc.stressTests();
// stress.expenseUp20 / stress.incomeDown50 / stress.inflationDoubled  -> 各自可支撑月数

// —— 存储 ——
Storage.save(Config.KEYS.PROFILE, { birthDate: '1990-01-15', gender: 'male' });
const profile = Storage.load(Config.KEYS.PROFILE, null);
Storage.exportJSON();          // 返回 JSON 字符串（供下载备份）
Storage.importAll(jsonString); // 导入，返回 boolean
Storage.clearAll();            // 清空本应用数据
```
