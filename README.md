# 个人生存看板（Personal Survival Dashboard）

纯前端静态网站，本地计算「剩余生命时间」与「存款可支撑时长」。所有数据保存在浏览器 `localStorage`，**不上传任何服务器**。

> 本项目仅为个人计算工具，不提供任何金融、投资、医疗或寿命预测建议。

**当前版本：`v1.1.0`**

## 功能

- **生命倒计时**：按用户设定的预期寿命，线性换算剩余时间、已活百分比、下次生日、退休日
- **存款生存计算器**：按月消耗模拟存款可支撑月数、耗尽日期、压力测试（支出+20% / 收入−50% / 通胀翻倍）
- **数据安全与备份（v1.1 新增）**：
  - 导出文件名带时间戳（`psd-backup-YYYYMMDD-HHmmss.json`），连续导出不再互相覆盖
  - 备份文件自带格式标记、schema 版本与导出时间，能识别并兼容 V1.0 旧备份
  - 导入前强制校验（结构 / 版本 / 字段范围），**校验不通过绝不改动现有数据**
  - 导入前弹出预览，列清楚「哪些新增、哪些覆盖」，确认后才写入
  - 有改动未备份、或距上次备份超过 14 天时，页面内温和提醒（可「稍后再说」）
- **数据本地化**：localStorage 存储，零网络请求
- **响应式**：桌面 / 平板 / 手机三档自适应（1440 / 1024 / 820 / 390 / 360 实测无横向溢出）

## 数据备份与恢复（v1.1）

### 导出

页面「数据安全」卡片 → **导出备份**。文件名形如 `psd-backup-20260925-135000.json`（本地时间，秒级精度）。文件内容结构：

```json
{
  "psdExport": true,
  "formatVersion": 1,
  "appVersion": "v1.1.0",
  "schemaVersion": 1,
  "exportedAt": "2026-09-25T05:50:00.000Z",
  "itemCount": 2,
  "data": { "PROFILE": { "...": "..." }, "SAVINGS": { "...": "..." } }
}
```

### 导入

**导入备份** → 选择文件 → 弹出预览 → 确认导入。校验规则：

| 情况 | 处理 |
|---|---|
| 不是合法 JSON | 拒绝，提示原因 |
| 非本应用备份（无格式标记） | 拒绝，提示原因 |
| V1.0 旧版备份（无标记但有 `data`） | **接受**，提示「已识别为 V1 旧版备份」 |
| `schemaVersion` 高于当前版本 | **接受**（尽力导入）并明确提示，无法识别的字段被忽略 |
| 单字段越界或类型错误 | 该字段回退默认值 + 警告，其余数据照常导入 |
| 缺少 `PROFILE.birthDate` 等必填项 | 该数据项整体忽略，其余照常导入 |

导入为**覆盖式**：备份里有的数据项会被写入，备份里没有的保持不动（不会误删）。
写入失败会自动回滚到导入前的状态，并给出错误提示。

**注意**：备份文件包含你的个人参数（预期寿命、存款等），虽然只在本地下载、不经网络传输，仍请妥善保管。

### 备份提醒

满足以下任一条件时，数据安全卡片内会出现提醒条：有数据但从未备份 / 有改动未备份 / 距上次备份 ≥ 14 天。
点「稍后再说」静默 24 小时；点「立即导出」直接导出。

## 目录结构

```
personal-survival-dashboard/
├── index.html              # 页面骨架
├── css/
│   └── style.css           # 样式（含三档响应式）
├── js/
│   ├── core/               # 核心计算逻辑（项目负责人维护）
│   │   ├── config.js       # 默认配置、常量、导入校验规则
│   │   ├── storage.js      # localStorage 封装 + 导出信封 + 导入校验 + 备份状态
│   │   ├── life.js         # 生命倒计时引擎
│   │   ├── savings.js      # 存款生存计算器
│   │   └── index.js        # 统一导出
│   └── ui/                 # UI 层
│       ├── app.js          # 入口与事件编排（导入两步确认流程）
│       ├── render.js       # 各模块渲染（含数据安全卡片）
│       ├── components.js   # 组件工厂（含导入预览对话框）
│       └── format.js       # 格式化工具
├── assets/
├── scripts/
│   └── push.ps1            # 本机专用推送脚本（见「推送」一节）
├── UI-REQUIREMENTS.md      # 前端 UI 需求文档
├── V1.1-PLAN-DATA-DURABILITY.md   # v1.1 实现方案与决策记录
├── V1-RELEASE-RETROSPECTIVE.md    # v1.0 上线复盘
├── TRAE-PROMPT.md          # 交给 Trae 的生成指令
├── README.md
└── .gitignore
```

## 版本历史

| 版本 | 内容 |
|---|---|
| `v1.1.0` | 数据更耐用：时间戳文件名、导出格式信封、导入强制校验与预览确认、备份提醒、数据安全卡片 |
| `v1.0.0` | 首个公开版本：生命倒计时 + 存款生存计算器，本地存储、响应式、GitHub Pages 上线 |

## 分工

- **项目负责人**：架构、目录、核心计算 JS（`js/core/`）、UI 需求文档、v1.1 数据安全模块
- **前端（Trae）**：v1.0 按 `UI-REQUIREMENTS.md` 生成 `index.html`、`css/`、`js/ui/`
- **合并**：项目负责人读取前端代码，与核心 JS 合并、检查逻辑、响应式校验
- **部署**：Git → GitHub → GitHub Pages

> ⚠️ 若在 Trae 中继续改 UI，请先对 `js/ui/app.js`、`js/ui/render.js`、`js/core/storage.js`、`js/core/config.js`、`index.html`、`css/style.css` 执行重新读取（Revert File），避免用旧上下文覆盖 v1.1 的改动。

## 数据契约

前端通过统一入口调用核心模块：

```js
import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';
```

v1.1 新增的 Storage API：

| 方法 | 说明 |
|---|---|
| `buildExport()` / `exportJSON()` | 生成带信封的导出内容 |
| `exportFileName(date?)` | 生成带时间戳的文件名 |
| `parseImport(raw)` | 解析 + 校验，**纯函数不写数据**，返回 `{ok, isLegacy, meta, data, warnings, errors, ignoredFields}` |
| `applyImport(data)` | 白名单写入，失败自动回滚，返回 `{ok, written, error?}` |
| `backupStatus(now?)` | 备份状态（数据量、最后备份时间、是否该提醒） |
| `markExported()` / `markChanged()` / `snoozeBackupReminder()` | 备份元信息维护 |

## 本地运行

本项目使用 **ES Module**（`<script type="module">` + `import`），受浏览器同源策略限制：**直接双击 `index.html`（`file://` 协议）会因 CORS 报错而白屏**，必须通过 HTTP 打开。

任选一种本地静态服务器（在项目根目录执行）：

```bash
python -m http.server 8123     # 然后访问 http://localhost:8123
npx serve .                    # 或 npx http-server -p 8123
```

## 在线访问

已部署到 GitHub Pages（源码 push 后自动发布）：

- 站点：https://datouzhenbei.github.io/personal-survival-dashboard/
- 仓库：https://github.com/datouzhenbei/personal-survival-dashboard

## 推送（本机特殊情况）

本机 Windows 上 `git-remote-https.exe` 在**派生凭据助手子进程**时会稳定崩溃
（Windows 应用日志：异常代码 `0xc0000005`；表现为**退出码 128 且无任何输出**）。

已排查结论：与 Git 版本无关（2.48.1 / 2.55.0.3 表现一致）、与代理无关、与用哪个凭据助手无关
（GCM、gh 助手均崩），且在沙箱外同样复现；不需要认证的 `fetch` / `ls-remote` 因从不派生子进程而始终正常。

因此**不要用普通的 `git push`**，改用仓库自带脚本（凭据内联 + 禁用助手，全程不派生子进程）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\push.ps1            # 推送当前分支
powershell -ExecutionPolicy Bypass -File scripts\push.ps1 main v1.0.0  # 推送指定 ref
```

脚本会先设置 Clash Verge 代理（`127.0.0.1:7897`，GitHub 直连会 `unexpected EOF`），
再从 `gh auth token` 实时读取凭据，**不落盘**。

## 免责声明

本看板仅为「剩余生命时间」与「存款可支撑时长」的本地计算工具，不提供任何金融、投资、医疗或寿命预测建议。所有数据仅保存在你的浏览器本地，不上传任何服务器。
