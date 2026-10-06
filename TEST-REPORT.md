# 可为健康 — 自动化测试报告（5.2.1）

> 报告日期：2026-10-05 ｜ 范围：后端（NestJS）+ Web 前端（React）自动化测试全量执行结果
> 执行环境：本地 Windows / Node 20；CI（GitHub Actions, ubuntu-latest, Node 20）均已验证通过

## 一、执行总览

| 层级 | 框架 | 套件 / 文件 | 用例数 | 结果 |
|------|------|-----------|--------|------|
| 后端单元测试（Service/Controller/拦截器/加密基座+中间件/RBAC Guard） | Jest + ts-jest | 27 | 270 | ✅ 全过 |
| 后端接口集成测试（HTTP 层） | supertest + @nestjs/testing | 13 | 89 | ✅ 全过 |
| 前端组件测试 | Vitest + @testing-library/react + jsdom | 16 | 63 | ✅ 全过（本地 npm test -w web 已跑通 63/63） |
| **合计（自动化）** | | **56** | **422** | ✅ **全绿** |
| 前后端契约回归 | `server/e2e-test.ps1`（需运行中的服务 + DB） | — | 报告/诊断/用药/会员主流程 | ⏸ 需部署环境手动执行 |
| 微信小程序 | 无自动化测试脚本 | 0 | 0 | — 仅 `build:mp-weixin` 编译校验 |

- 后端命令：`npm test -w server`（全量）· `npm run test:cov -w server`（含覆盖率门禁）
- 前端命令：`npm test -w web`
- CI 已接入：`npm test -w server` + `npm test -w web`（push/PR 每次执行）
- 更新（RBAC P0 批次 2026-10-05）：后端新增 `rbac/roles.guard.spec.ts`（9）+ `admin/admin.controller.spec.ts`（8，守卫链集成），并扩 `auth.service`（+4）/`audit.service.queryAll`（+5）/`jwt.strategy`（+2），本地全量 **37 套件/285 用例全绿**；前端新增 `RequireRole`（5）+ `admin/AllAudit`（3）、扩 `AuthContext`（+2）。
- 更新（RBAC P1 批次 2026-10-05）：后端 `admin.controller.spec` 8→16（P1 六新端点元数据/角色边界矩阵：授撤角色与强制撤销/禁用仅 SUPER_ADMIN，OPERATOR/AUDITOR 越权 403）+ 新增 `admin.service.spec`（8：响应脱敏/状态机校验/角色软撤销/分享 active 过滤/幂等撤销/审计留痕），本地全量 **38 套件/301 用例全绿**，`nest build` 绿；前端新增 `admin/AllShares`（5）+ `admin/Users`（6）页单测（角色显隐/脱敏渲染/空态/按钮可见性），`npm run build -w web` 绿；vitest 全量本地仍受 Windows 环境阻断，**已经 CI（ubuntu）复验全绿：14 文件/54 用例（run 37323084313；首跑因 antd 两字中文按钮自动插空格导致文本断言失败 4 例，已改用弹性正则修复）**。
- 更新（RBAC P2 批次 2026-10-05）：后端新增 `rbac/stepup.guard.spec.ts`（7：opt-in 短路 / header 缺失 / 验签失败 / typ 非 stepup / sub 不匹配 / 全通 / 未登录兼容）+ `auth.service.spec` 扩 stepUp 分支（6：密码对/错/无密码账号/未登录/DELETED/DISABLED）+ `auth.controller.spec` 扩 stepup endpoint（2：成功落 STEPUP/success 审计 + 失败落 failure+status） + `jwt.strategy.spec` 拒 stepup token 冒充登录凭证（1）+ `admin.controller.spec` 给 4 个危险端点补 stepup 成功与失败用例（新增 7 + 元数据 stepup: true 断言）+ `audit.service.spec` queryAll action 逗号多值支持（2）。本地全量 **39 套件/324 用例全绿**，`nest build` 绿。前端新增 `utils/stepup.tsx`（密码弹窗 + sessionStorage 5min 缓存）+ `pages/admin/PermissionHistory.tsx`（5 用例单测）及测试，`npm run build -w web` 绿；vitest 本地仍受 Windows OOM 阻断，待 CI 验证。
- 更新（RBAC P3 首项 2026-10-06）：后端 `audit.service.ts` 抽 `buildAdminWhere`（分页查询与导出共用，防页面/导出语义漂移）+ `queryForExport`（`take=cap+1` 探测截断，`EXPORT_MAX_ROWS=10000` 硬上限）；新建 `audit-export.service.ts`（xlsx 双 sheet：概览自证页 + 审计日志；csv 带 UTF-8 BOM + 公式注入防护 + 引号翻倍）+ 单测 `audit-export.service.spec`（11：PK 魔数/双 sheet/文件名/BOM/标签映射/列顺序/转义/公式防护/免登录占位/非法 format/截断透传）；`audit.service.spec` 扩 `queryForExport`（6）；`admin.controller.spec` 扩导出端点（6：SUPER_ADMIN 下载头/csv 透传/导出留痕/OPERATOR 403/SUPPORT 403/未登录 401）。本地全量 **40 套件/347 用例全绿**，`nest build` 绿；前端 `AllAudit.tsx` 加导出 Excel/CSV 按钮（blob 下载 + 截断警告），vitest 本地 **15 文件/59 用例全绿**，`web build` 绿。**CI 已绿（run 37407384057：三端构建 + jest 40 套件 + vitest + Docker 镜像验证全过）**。
- 更新（RBAC P3 订阅/订单 2026-10-06）：后端 `admin.service.ts` 新增 `listSubscriptions`（跨用户订阅分页，plan/status/userId 过滤，手机号脱敏，落 ADMIN_SUBSCRIPTIONS_LIST 审计）+ `listOrders`（跨用户订单分页，userId/status/plan 过滤，手机号脱敏，落 ADMIN_ORDERS_LIST 审计）；`admin.controller.ts` 新增 `GET /admin/subscriptions` + `GET /admin/orders`（@Roles(SUPER_ADMIN,OPERATOR)+@Permissions(SUBSCRIPTION_READ/ORDER_READ)）；`admin.service.spec` +4 用例、`admin.controller.spec` +8 用例。本地全量 **40 套件/359 用例全绿**，`nest build` 绿；前端新建 `Subscriptions.tsx`（Tab 切换订阅/订单列表，筛选器+分页+脱敏渲染）+ `Subscriptions.test.tsx` 4 用例，vitest **16 文件/63 用例全绿**，`web build` 绿。

## 二、后端覆盖率（Jest --coverage，门禁 Stmts/Lines ≥ 80%）

**总计：90.71% Stmts ｜ 75% Branch ｜ 86.99% Funcs ｜ 91.53% Lines** —— 达成阶段目标（>80%），门禁通过。（本批为分享撤销/有效期 R-6 重写 `share.service` + 扩充 `share.e2e`，`share` 目录 100% Stmts / 92.1% Branch）

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

覆盖 15 个模块，共 59 用例（含 PIA R-5 家庭成员录入授权二次确认、R-1 敏感个人信息单独同意弹窗、R-6 我的分享列表/撤销、R-3 我的访问记录端到端、RBAC P0 管理端入口/路由守卫、RBAC P1 用户管理/跨用户分享管理、RBAC P2 权限变更履历）：

- **EmptyGuide**（列表空态引导）：描述文案渲染 / 默认按钮「去添加」/ 自定义 actionText / 点击触发 onAction
- **ErrorBoundary**（全局错误边界）：正常时渲染 children / 子组件抛错时渲染兜底页（含错误信息 + 刷新/返回按钮）
- **NotFound**（404 页）：MemoryRouter 下渲染 404 文案与返回按钮
- **utils/api**（拦截器，6 用例）：请求拦截附 Authorization / 无 token 不附；响应错误 401 清登录态+跳转 /login、402 弹付费墙且并发去重、其他状态码提示后端 message、无响应提示网络错误
- **AuthContext**（登录态 Provider + useAuth，7 用例）：无 token 无缓存不请求、无 token 但本地有缓存直接回填、有 token 拉 /auth/me 回填并写缓存、/auth/me 失败清态、login 写 localStorage、logout 清理、无 Provider 时返回默认上下文
- **MyShares**（我的分享列表/撤销，R-6 端到端，3 用例）：列表与 /reports join 展示报告信息 + 状态标签（生效中/已过期/已撤销）+ 未匹配报告 fallback；点撤销→二次确认后调用 `DELETE /share/:id` 并刷新；无记录时展示引导空态
- **AccessRecords**（我的访问记录，R-3 知情权端到端，3 用例）：`GET /audit/me` 分页列表映射中文操作/数据对象标签与成功/失败状态并展示总数；按操作类型筛选后以 `action=EXPORT` 重新请求；无记录时展示空态
- **RequireRole**（RBAC P0 前端路由守卫，5 用例）：持匹配角色渲染 children；持其它角色放行；无匹配角色/未登录/旧后端无 roles 字段 → 渲染 403 兜底
- **admin/AllAudit**（管理端跨用户审计，R-3 尾项端到端，3 用例）：`GET /admin/audit` 分页列表含 userId 列与 `(免登录)` 占位；空态提示；首拉请求路径/参数断言
- **admin/AllShares**（RBAC P1 跨用户分享管理，R-6 尾项，5 用例）：首拉 `/admin/shares` 分页断言 + 所有者/报告/状态列渲染；SUPER_ADMIN+生效中→展示强制撤销入口；OPERATOR 只读无撤销按钮；报告已删除 join 未匹配占位；空态
- **admin/Users**（RBAC P1 用户管理，6 用例）：首拉 `/admin/users` 断言脱敏手机号渲染；SUPER_ADMIN+ACTIVE 展示禁用入口；AUDITOR 只读仅详情；DELETED 不提供启停（状态机不可逆）；DISABLED 展示启用；空态
- **admin/PermissionHistory**（RBAC P2 权限变更履历，5 用例）：预置 `resourceType=ADMIN&action=ROLE_GRANT,ROLE_REVOKE` 拉 `/admin/audit`；授予行渲染角色 Tag/目标用户/理由/操作者角色快照；撤销行动作标签「撤销」；空态；meta 缺 reason 时占位「—」不影响其他列

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

- 后端 Service 层与 Controller HTTP 层已建立完整自动化测试（**324 用例全绿**，本批 RBAC P2 新增 `rbac/stepup.guard.spec.ts` 7 用例覆盖危险操作二次验证守卫的全部分支（opt-in 短路/header 缺失/验签失败/typ 非 stepup/sub 不匹配/全通/未登录），`auth.service.spec` stepUp 密码正确/错误/未设密码/账号已停用 6 分支，`auth.controller.spec` POST /auth/stepup 审计留痕（成功/失败）2 用例，`jwt.strategy.spec` stepup token 冒充登录凭证拒绝 1 用例，`admin.controller.spec` 4 个危险端点 step-up 集成（合法 token 放行 + 缺 token 403 + sub 不匹配 403 + 登录 token 冒充 403），`audit.service.spec` queryAll action 逗号多值 2 用例；此前 RBAC P1 的 `admin/admin.service.spec.ts` 8 用例覆盖 `/admin/users*`/`/admin/shares*` DB 逻辑（响应脱敏不含 password hash/wx 标识/BigInt，启停状态机拒 DELETED 覆写，角色授予先软撤销再创建，分享 active 内存过滤 + 报告 join，跨 owner 撤销幂等，每操作落 resourceType=ADMIN 审计），`admin.controller.spec.ts` 验证 P1 六新端点双装饰器（@Roles+@Permissions）与越权 403 矩阵；此前 RBAC P0 的 `rbac/roles.guard.spec.ts` 9 用例覆盖无标注放行/角色命中与未命中/权限并集覆盖与缺失/SUPPORT 无 health 权限关键边界/req.user 缺失兜底，`retention/data-retention.service.spec.ts` 6 用例覆盖 PIA R-9），覆盖率门禁固化进配置，随 CI 持续守护。
- 前端测试基建从零建成并接入 CI，覆盖关键展示/容错组件与核心业务逻辑（登录态 Context + API 拦截器 + PIA 隐私提示与家庭成员授权二次确认 + 分享列表/撤销端到端（R-6）+ 本人访问记录查看/筛选端到端（R-3）+ RBAC P0 管理端路由守卫 RequireRole 与全量审计页 AllAudit 端到端 + RBAC P1 用户管理/跨用户分享管理页端到端 + RBAC P2 权限变更履历页）。本地 `npm run build -w web` 绿；vitest 全量本地执行受 Windows 环境阻断（PowerShell 管道 OOM + 本地 Node 24 与 vitest 1.6 worker 不兼容），**P0/P1 批次均已由 CI（ubuntu）验证全绿：P1 后 14 文件/54 用例（run 37323084313）；P2 批次本地待提交后 CI 验证 15 文件/59 用例**。小程序端 R-3 访问记录页已接入并编译校验通过（`build:mp-weixin` DONE）；管理端按决策 v1 不做小程序侧。
- 阶段五「自动化测试脚本」（5.1.x）与「全面测试执行」的安全审计（5.2.3）均已关账；余下性能/兼容性/真机/契约联调类依赖外部运行环境，待部署后推进。
