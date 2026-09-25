# 个人生存看板（Personal Survival Dashboard）

纯前端静态网站，本地计算「剩余生命时间」与「存款可支撑时长」。所有数据保存在浏览器 `localStorage`，**不上传任何服务器**。

> 本项目仅为个人计算工具，不提供任何金融、投资、医疗或寿命预测建议。

## 功能

- **生命倒计时**：按用户设定的预期寿命，线性换算剩余时间、已活百分比、下次生日、退休日
- **存款生存计算器**：按月消耗模拟存款可支撑月数、耗尽日期、压力测试（支出+20% / 收入-50% / 通胀翻倍）
- **数据本地化**：localStorage 存储，支持 JSON 导入/导出备份
- **响应式**：桌面 / 平板 / 手机三档自适应

## 目录结构

```
personal-survival-dashboard/
├── index.html              # 页面骨架（前端生成）
├── css/
│   └── style.css           # 样式（前端生成）
├── js/
│   ├── core/               # 核心计算逻辑（已由项目负责人完成）
│   │   ├── config.js       # 默认配置与常量
│   │   ├── storage.js      # localStorage 封装
│   │   ├── life.js         # 生命倒计时引擎
│   │   ├── savings.js      # 存款生存计算器
│   │   └── index.js        # 统一导出
│   └── ui/                 # UI 层（前端生成）
├── assets/
├── scripts/
│   └── push.ps1            # 本机专用推送脚本（见「推送」一节）
├── UI-REQUIREMENTS.md      # 前端 UI 需求文档
├── README.md
└── .gitignore
```

## 分工

- **项目负责人（已完成）**：架构、目录、核心计算 JS（`js/core/`）、UI 需求文档
- **前端（Trae）**：按 `UI-REQUIREMENTS.md` 生成 `index.html`、`css/`、`js/ui/`
- **合并**：项目负责人读取前端代码，与核心 JS 合并、检查逻辑、响应式校验
- **部署**：Git 初始化 → GitHub → 一键静态部署

## 数据契约

前端通过统一入口调用核心模块：

```js
import { Config, Storage, LifeCountdown, SavingsCalculator } from './js/core/index.js';
```

完整字段与调用示例见 `UI-REQUIREMENTS.md` 第 9 节「与核心 JS 的数据绑定契约」。

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
