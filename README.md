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

## 免责声明

本看板仅为「剩余生命时间」与「存款可支撑时长」的本地计算工具，不提供任何金融、投资、医疗或寿命预测建议。所有数据仅保存在你的浏览器本地，不上传任何服务器。
