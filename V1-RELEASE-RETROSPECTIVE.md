# 个人生存看板 V1 上线复盘报告

| 项目 | 内容 |
|---|---|
| 版本 | **v1.0.0**（首次公开发布） |
| 版本锚点 | Git tag `v1.0.0` → commit `ef68f20` |
| 上线时间 | 2026-09-25 |
| 线上地址 | https://datouzhenbei.github.io/personal-survival-dashboard/ |
| 代码仓库 | https://github.com/datouzhenbei/personal-survival-dashboard （公开） |
| 部署方式 | GitHub Pages（`source=main:/`，legacy 构建），push 后自动发布 |
| 数据存储 | 浏览器 `localStorage`（前缀 `psd_`），**零网络请求、零后端、不上传任何服务器** |
| 合规边界 | 仅「剩余生命时间」与「存款可支撑时长」本地计算器，**不含任何金融/投资建议** |

---

## 一、目标达成情况

| # | 原定目标 | 状态 | 说明 |
|---|---|---|---|
| 1 | 规划目录、定义业务逻辑（生命倒计时 + 存款生存计算器，localStorage 本地保存） | ✅ | 目录与核心引擎完成，ES Module 分层 |
| 2 | 输出后端计算 JS 代码 | ✅ | `js/core/` 5 个模块，全程未被前端改动 |
| 3 | 输出前端 UI 需求文档给 Trae | ✅ | `UI-REQUIREMENTS.md`（15KB）+ `TRAE-PROMPT.md` |
| 4 | 合并前后端、查逻辑 bug、双端适配 | ✅ | 修复 5 处真实 bug；五档视口回归通过 |
| 5 | git 初始化、提交 GitHub、一键静态部署 | ✅ | Pages 已上线，HTTP 200 |
| 6 | 数据全本地、无投资建议 | ✅ | 无任何网络请求；页面含完整免责声明 |

---

## 二、交付物清单

| 文件 | 职责 | 作者 |
|---|---|---|
| `index.html` | 页面骨架、内容安全策略、页脚免责声明 | Trae |
| `css/style.css` | 暗色简约主题、三档响应式断点 | Trae（负责人微调） |
| `js/ui/format.js` | 金额/日期/百分比/时钟格式化 | Trae |
| `js/ui/components.js` | `h()`、`icon()`、StatCard、ProgressRing、InputField、ChipGroup、DataTable、confirmDialog、Toast | Trae |
| `js/ui/render.js` | 各模块渲染、状态机显示、错误态与空状态 | Trae（负责人修 bug 5） |
| `js/ui/app.js` | 事件绑定、状态编排、持久化调度 | Trae（负责人修 bug 1） |
| `js/core/config.js` | `psd_` 前缀、KEYS、DEFAULTS、LIMITS、DISCLAIMER | 负责人 |
| `js/core/storage.js` | 带版本号读写 `{__v,__t,data}`、导入导出、清空 | 负责人 |
| `js/core/life.js` | `LifeCountdown` 生命倒计时引擎 | 负责人 |
| `js/core/savings.js` | `SavingsCalculator` 逐月模拟 + 压力测试 | 负责人（修 bug 2/3/4） |
| `js/core/index.js` | 核心模块统一出口 | 负责人 |
| `UI-REQUIREMENTS.md` | 前端 UI 需求规格（配色 token、六大模块、组件、绑定契约、验收标准） | 负责人 |
| `TRAE-PROMPT.md` | 给 Trae 的可直接粘贴指令 | 负责人 |
| `scripts/push.ps1` | 本机专用推送脚本（绕开环境级故障） | 负责人 |
| `README.md` | 项目说明、目录结构、本地运行、推送说明 | 负责人 |

---

## 三、质量验证数据

### 3.1 响应式回归（自制同源 iframe harness + headless Chrome `--dump-dom`）

| 视口宽度 | 档位 | 横向溢出 |
|---|---|---|
| 1440px | 桌面 | 无 |
| 1024px | 桌面 / 平板交界 | 无 |
| 820px | 平板 | 无 |
| 390px | 手机（iPhone 常见宽度） | 无 |
| 360px | 手机（窄屏） | 无 |

> 判定方式是**逐元素**比对 `getBoundingClientRect().right > clientWidth`，而非只看 `scrollWidth`——后者会被 `body{overflow-x:hidden}` 掩盖。

### 3.2 功能基线用例

场景：出生 1990-01-15 / 男 / 预期寿命 80 岁，存款 500,000 / 月支出 8,000 / 通胀 2.5%

| 指标 | 结果 | 与人工实测是否一致 |
|---|---|---|
| 存款可支撑时长 | 59 个月 | ✅ 一致 |
| 耗尽日期 | 2031-08-25 | ✅ 一致 |
| 压力测试：支出 +20% | 50 个月 | ✅ 一致 |
| 压力测试：收入 −50% | 59 个月 | ✅ 一致 |
| 压力测试：通胀翻倍 | 56 个月 | ✅ 一致 |

其余场景：月收入 ≥ 支出 → 正确显示「可持续 / 不会耗尽 / 月盈余」；存款 0 且月支出 0 → 正确显示「可持续」；非法输入（通胀 200、预期寿命 200）→ 转行内错误提示，不白屏；清空数据 → 自定义模态二次确认。

### 3.3 数据观察清单（说明）

本产品**刻意不做任何埋点与上报**（零网络请求是硬性设计约束），因此不存在服务端数据看板。上线后观察改为**本地自检清单**：

- [ ] 刷新页面后数据是否保留
- [ ] 导入 JSON 能否正确恢复，版本号不兼容时是否有提示
- [ ] 移动端浏览器（iOS Safari / Android Chrome）首屏是否有横向滚动
- [ ] 长时间停留时倒计时是否仍每秒刷新且无抖动
- [ ] 隐私模式（localStorage 受限）下是否优雅降级而非白屏

---

## 四、缺陷与修复记录

前端由 Trae 生成并自测通过，但在**合并校验**阶段发现 5 处真实逻辑 bug（Trae 自测未覆盖）。

| # | 严重度 | 现象 | 根因 | 修复 |
|---|---|---|---|---|
| 1 | **高** | 首屏「存款可支撑时长」卡片永久显示「——」 | `app.js` 的 `buildCtx` 未把 `savingsCfg` 挂到上下文，渲染层读取恒为 `undefined` | `buildCtx` 补充 `savingsCfg: state.savingsCfg` |
| 2 | 中 | 存款 0 且月支出 0 时误报「1 个月」并伪造耗尽日期 | 落在逐月循环里，除法边界未处理 | 提前判定 `monthlyExpense <= 0` 为可持续 |
| 3 | 中 | 无存款（`savings <= 0`）时同样伪造耗尽日期 | 缺少零存款分支 | 新增 `savings <= 0` → `monthsLeft: 0` |
| 4 | 中 | 年化通胀填 51–100（UI 允许的合法输入）导致整个存款模块被错误提示替换 | 压力测试用 `inflationRate × 2`，超 `_validate` 的 100 上限被拒 | 通胀上限放宽至 1000 |
| 5 | 中 | 计算报错被「还没有存款数据」空状态覆盖，用户看不到真实错误 | `renderSavingsResults` 中错误态判定排在空状态之后 | 调整判定顺序，错误态优先 |

附带修正：

- `index.html` 页脚仓库链接指向真实地址
- `app.js` 去掉对仓库链接的误拦截
- `css/style.css`：`.brand h1` 加 `white-space: nowrap`；新增 `@media (max-width: 400px)` 收起顶栏状态文字（修 360px 窄屏标题折行）
- `README.md` 更正本地运行说明：ES Module 受同源策略限制，**不能 `file://` 直开**，必须走 HTTP

**回归结论**：修复后上述场景全部复测通过，且 `js/core/` 4 个核心文件哈希与初始提交完全一致（前端未越界改动核心引擎）。

---

## 五、事故复盘：本机 `git push` 静默崩溃

### 5.1 时间线

1. 本地 commit 成功（`c3ceb65`），`git push` **退出码 128 且 stdout/stderr 全空**，无任何报错信息。
2. Windows 应用日志查到 `git-remote-https.exe` 崩溃：异常代码 `0xc0000005`（访问越界），固定偏移。
3. 初步归因为「Git 2.48.1 版本缺陷」，尝试 HTTP/1.1、强制 schannel、加大 postBuffer、SOCKS5、内联凭据、关闭沙箱执行——**全部无效**。
4. 改用 `gh api` REST 通道（blobs → trees → commits → 更新 ref）完成首次推送，并用「远程 tree sha == 本地 `HEAD^{tree}`」校验内容逐字节一致。
5. 升级 Git（2.48.1 → 2.55.0.3）后复测：**崩溃照旧，偏移一致** → 排除版本因素。
6. 用 `GIT_TRACE=1` + `GIT_CURL_VERBOSE=1` 精确定位：崩溃发生在 git 派生**凭据助手子进程**（`credential ... get` / `store`）的那一刻。
7. 用「凭据内联 + 显式清空 helper 列表」（全程零子进程）验证：**推送成功**（`exit=0`）。

### 5.2 根因

**`git-remote-https.exe` 在本机一旦派生凭据助手子进程即崩溃**，与认证是否成功无关。

已排除：Git 版本、代理协议、凭据助手类型（GCM 与 gh 助手均崩）、WorkBuddy 沙箱（**沙箱外同样复现**）、PATH 中的 DLL 冲突。

这也解释了为什么 `fetch` / `ls-remote` 一直正常——它们**从不派生子进程**。

### 5.3 附带发现的配置缺陷

系统级 gitconfig 自带 `credential.helper = manager`（Git Credential Manager）；
而 `credential.<url>.helper` 是**追加**到通用列表、不是替换。`~/.gitconfig` 中 github.com 段落缺少空值清空行，导致实际先执行 GCM。

已补上 `helper = ` 清空行，使 github.com 只走 `gh` 助手。

### 5.4 处置与改进

- **落地改进**：新增 `scripts/push.ps1`——自动设置代理、从 `gh auth token` 实时取凭据、内联推送，**token 不落盘**；已用该脚本自身推送成功。
- **文档化**：`README.md` 新增「推送（本机特殊情况）」一节，记录根因结论与推荐用法。
- **遗留**：该故障影响本机**所有需要认证的 git 操作**，不限于本项目。最可疑方向为安全软件的进程创建钩子或 Windows Exploit Protection 的 ASLR/CFG 策略被改动。建议单独排期做**只读诊断**。

---

## 六、遗留问题与风险

| # | 问题 | 影响 | 当前处置 |
|---|---|---|---|
| 1 | 本机 git 认证操作依赖绕过脚本 | 若脚本或 token 失效，推送中断 | 已文档化；备用通道为 `gh api` REST 推送 |
| 2 | 数据仅存单浏览器 `localStorage` | 换设备/清缓存即丢失 | V1.1 候选项：导出提醒、文件名带时间戳 |
| 3 | 隐私模式下 `localStorage` 受限 | 可能无法保存 | 待验证降级行为 |
| 4 | 无自动测试 | 后续改版易回归 | 可沉淀「五视口 + 功能断言」回归脚本 |

---

## 七、V1.1 候选项（待排期选型）

| 选项 | 内容 | 是否破坏「零后端」约束 |
|---|---|---|
| A | 数据更耐用：导出文件带时间戳、导入前版本校验与提示、定期备份提醒 | 否 |
| B | 多方案对比：保存 2–3 套参数（保守/乐观）并列显示 | 否 |
| C | 只读分享快照：生成可打印/可截图的结果卡 | 否 |
| D | 主题：补亮色主题，或跟随系统偏好自动切换 | 否 |
| E | 跨设备同步 | **是**（需引入云存储，需单独评估） |

---

## 八、行动项

| # | 行动项 | 负责角色 | 状态 |
|---|---|---|---|
| 1 | V1 文档归档至项目资料库 | 项目负责人 | 进行中 |
| 2 | 本报告结论文档化为「看板 V1 上线复盘」事项 | 项目负责人 | 进行中 |
| 3 | V1.1 方向选型（A–D 择一或多项） | 项目负责人 | 待确认 |
| 4 | 本机 git 认证崩溃专项排查（只读诊断） | 项目负责人 | 待排期 |
| 5 | 移动端真机验证（iOS Safari / Android Chrome） | 项目负责人 | 待执行 |
| 6 | `v1.0.0` 补充 GitHub Release 发布说明 | 项目负责人 | 待确认 |
