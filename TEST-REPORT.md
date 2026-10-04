# 可为健康 — 自动化测试报告（5.2.1）

> 报告日期：2026-10-03 ｜ 范围：后端（NestJS）+ Web 前端（React）自动化测试全量执行结果
> 执行环境：本地 Windows / Node 20；CI（GitHub Actions, ubuntu-latest, Node 20）均已验证通过

## 一、执行总览

| 层级 | 框架 | 套件 / 文件 | 用例数 | 结果 |
|------|------|-----------|--------|------|
| 后端单元测试（Service/Controller/拦截器/加密基座+中间件） | Jest + ts-jest | 22 | 183 | ✅ 全过 |
| 后端接口集成测试（HTTP 层） | supertest + @nestjs/testing | 12 | 54 | ✅ 全过 |
| 前端组件测试 | Vitest + @testing-library/react + jsdom | 8 | 27 | ✅ 全过 |
| **合计（自动化）** | | **42** | **264** | ✅ **全绿** |
| 前后端契约回归 | `server/e2e-test.ps1`（需运行中的服务 + DB） | — | 报告/诊断/用药/会员主流程 | ⏸ 需部署环境手动执行 |
| 微信小程序 | 无自动化测试脚本 | 0 | 0 | — 仅 `build:mp-weixin` 编译校验 |

- 后端命令：`npm test -w server`（全量）· `npm run test:cov -w server`（含覆盖率门禁）
- 前端命令：`npm test -w web`
- CI 已接入：`npm test -w server` + `npm test -w web`（push/PR 每次执行）

## 二、后端覆盖率（Jest --coverage，门禁 Stmts/Lines ≥ 80%）

**总计：90.36% Stmts ｜ 74.06% Branch ｜ 86.63% Funcs ｜ 91.23% Lines** —— 达成阶段目标（>80%），门禁通过。（本批新增登录审计留痕与只读查询端点的 `audit.controller`/`auth.controller` 单测 + `audit.service` 扩充；`audit` 目录 95.55% Stmts、`auth` 98.96% Stmts）

| 模块 | Stmts | 模块 | Stmts |
|------|-------|------|-------|
| health | 100% | common | 100% |
| auth | 98.96% | share | 100% |
| family-member | 97.5% | medication | 97.77% |
| diagnosis | 96.72% | upload | 94.73% |
| report | 90.21% | export | 84.17% |
| member | 79.36% | prisma | 71.42% |
| ai | 67.18% | audit | 95.55% |
| common/crypto（加密基座+中间件）| 93.81% | — | — |

## 三、前端测试（Vitest）

覆盖 8 个模块，共 27 用例（含 PIA R-5 家庭成员录入授权二次确认、R-1 敏感个人信息单独同意弹窗）：

- **EmptyGuide**（列表空态引导）：描述文案渲染 / 默认按钮「去添加」/ 自定义 actionText / 点击触发 onAction
- **ErrorBoundary**（全局错误边界）：正常时渲染 children / 子组件抛错时渲染兜底页（含错误信息 + 刷新/返回按钮）
- **NotFound**（404 页）：MemoryRouter 下渲染 404 文案与返回按钮
- **utils/api**（拦截器，6 用例）：请求拦截附 Authorization / 无 token 不附；响应错误 401 清登录态+跳转 /login、402 弹付费墙且并发去重、其他状态码提示后端 message、无响应提示网络错误
- **AuthContext**（登录态 Provider + useAuth，7 用例）：无 token 无缓存不请求、无 token 但本地有缓存直接回填、有 token 拉 /auth/me 回填并写缓存、/auth/me 失败清态、login 写 localStorage、logout 清理、无 Provider 时返回默认上下文

> 未启用 V8/istanbul 覆盖率采集（前端以行为断言为主）。

## 四、发现与缺口（供后续 5.2.2 / 迭代参考）

> 更新（缺口收敛批次 2026-10-03）：初版报告点名的 `jwt.strategy.ts`（0%→90.9%，validate 拒绝 share 分支已测）与 `common/app-cache.service.ts`（17.85%→100%，version/bump/buildKey/getOrSet 直测）已补单测收敛（新增 2 套件/14 用例）。剩余项如下：

| 项 | 现状 | 说明 / 处置建议 |
|----|------|----------------|
| `jwt.strategy.ts` | 90.9% | ✅ validate 已全覆盖（share 拒绝/登录返回）；仅剩构造器 options 行（strategy 注册）未跑，属预期 |
| `member.controller.ts` | 65.38% | upgrade/plans 等次要路由分支未全覆盖 |
| `ai.service.ts` | 59.61% | 百度 OCR 真实调用分支（`recognizeWithBaidu`/`getBaiduToken`）依赖外部密钥，mock 路径已覆盖，真实路径待密钥对接后测 |
| `prisma.service.ts` | 71.42% | `onModuleInit` 连接需真实 DB，CI 无库不覆盖，属预期 |
| 微信小程序 | 无自动化 | 建议后续引入 uni-app 逻辑层的纯函数/工具单测（如复诊角标计算、金额格式化） |
| 契约 e2e / 性能 / 兼容性 | 手动 | 需云服务器 + 真机 + 压测环境，暂不具备本地自动化条件 |

## 五、结论

- 后端 Service 层与 Controller HTTP 层已建立完整自动化测试（**237 用例全绿**，本批为已落地的数据访问审计（R-3）补齐**登录成功/失败留痕 + 本人只读审计查询端点**的单测，并完成健康数据静态加密全量中间件回归），覆盖率门禁固化进配置，随 CI 持续守护。
- 前端测试基建从零建成并接入 CI，覆盖关键展示/容错组件与核心业务逻辑（登录态 Context + API 拦截器 + PIA 隐私提示与家庭成员授权二次确认）。
- 阶段五「自动化测试脚本」（5.1.x）与「全面测试执行」的安全审计（5.2.3）均已关账；余下性能/兼容性/真机/契约联调类依赖外部运行环境，待部署后推进。
