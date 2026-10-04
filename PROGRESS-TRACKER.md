# 可为健康 — 项目进度跟踪表

> 版本：v1.1
> 创建日期：2026-09-27
> 最后更新：2026-10-02
> 负责人：JackHe

---

## 使用说明

- ✅ 已完成
- 🔄 进行中
- ⏳ 待开始
- ❌ 已取消/延期

---

## 第一阶段：行政启动 + 后端开发（第1-5周）

### 1.1 行政启动（第1周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 1.1.1 | 公司注册（个体工商户或有限责任公司） | ⏳ | 第1周 | | 线上办理，3-5个工作日出执照 |
| 1.1.2 | 银行开户 |  | 第1周 | | 预约后办理 |
| 1.1.3 | 域名注册 | ⏳ | 第1周 | | 阿里云/腾讯云，选.com或.cn |
| 1.1.4 | ICP备案提交 | ⏳ | 第1周 | | 通过云服务商提交，等待20个工作日 |
| 1.1.5 | 商标注册申请 |  | 第1周 | | 第9类+第42类，等待6-9个月 |
| 1.1.6 | 云服务器购买 + 环境配置 |  | 第1周 | | 阿里云ECS + PostgreSQL + OSS + Redis |
| 1.1.7 | 微信小程序企业主体注册 | ⏳ | 第1周 | | 需要营业执照 |
| 1.1.8 | 隐私政策起草（AI辅助） | ⏳ | 第1周 | | 用AI生成初稿，后续律师审核 |

### 1.2 后端API开发（第2-3周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 1.2.1 | 项目初始化（NestJS + Prisma） | ✅ | 第2周 | 已完成 | 脚手架搭建，npm workspaces |
| 1.2.2 | 数据库模型设计 + 迁移 | ✅ | 第2周 | 已完成 | 全部表结构创建（PostgreSQL） |
| 1.2.3 | 认证模块（注册/登录/JWT） | ✅ | 第2周 | 已完成 | 手机号+密码已实现；微信登录未接 |
| 1.2.4 | 用户模块（个人信息CRUD） | ✅ | 第2周 | 已完成 | 含 /auth/me |
| 1.2.5 | 家庭成员模块 | ✅ | 第2周 | 已完成 | 增删改查 + 按套餐限制成员上限 |
| 1.2.6 | 报告模块（核心） | ✅ | 第3周 | 已完成 | 报告CRUD + dashboard + trackable-items + 趋势接口 |
| 1.2.7 | 诊断记录模块 | ✅ | 第3周 | 已完成 | 就诊诊断CRUD |
| 1.2.8 | 用药记录模块 | ✅ | 第3周 | 已完成 | 用药CRUD + 当前用药 |
| 1.2.9 | 上传模块（OSS对接） | ✅ | 第3周 | 已完成 | 图片上传已实现（本地存储）；OSS待接 |
| 1.2.10 | AI识别模块（Mock + API对接） | ✅ | 第3周 | 已完成 | 识别接口+结构化返回已通；无密钥降级mock；识别前扣AI额度 |
| 1.2.11 | 会员订阅模块 | ✅ | 第3周 | 已完成 | 四档套餐+配额+付费墙+到期降级，端到端验证通过 |
| 1.2.12 | Swagger文档生成 | ✅ | 第3周 | 已完成 | /api/docs |
| 1.2.13 | 审计日志中间件 | ⏳ | 第3周 | | 合规要求 |
| 1.2.14 | 数据加密中间件 |  | 第3周 | | 健康数据AES-256加密（**实际实现见 6.1.6**：Prisma 中间件+service 层透明加解密；此行为早期粗粒度计划项，不重复计入总数） |

### 1.3 后端完善 + 云部署（第4-5周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 1.3.1 | Docker + Docker Compose配置 | ✅ | 第4周 | 已完成 | monorepo 感知的多阶段构建（根 lock + workspaces），启动自动 migrate deploy |
| 1.3.2 | Nginx配置 | ✅ | 第4周 | 已完成 | 反向代理 + 安全头 + /uploads 静态 + /health 探活转发（配置已落地，尚未部署至真实云主机） |
| 1.3.3 | CI/CD流水线（GitHub Actions） | ✅ | 第4周 | 已完成 | .github/workflows/ci.yml：三端构建+后端单测，master 额外验证 Docker 镜像构建（未接部署推送） |
| 1.3.4 | 后端单元测试（AI生成） | ✅ | 第4周 | 已完成 | 6 大核心 service（member/report/diagnosis/medication/auth/ai）共 63 用例全过；CI 每次 push 自动执行；user/family-member 等简单 CRUD 按需补 |
| 1.3.5 | API接口联调自测 | ✅ | 第4周 | 已完成 | e2e-test.ps1 回归脚本，发现并修复4处前后端契约bug |
| 1.3.6 | 性能优化（索引、缓存） | ✅ | 第5周 | 已完成 | 前端拆包：manualChunks（react/antd/echarts/utils）+ 路由级懒加载，主包 2350KB→17KB；echarts 按需引入（echarts/core 只注册 LineChart+Grid/Tooltip+Canvas）并卸载未用的 echarts-for-react，vendor-echarts 降至 455KB(gzip 156KB)；缓存：@nestjs/cache-manager 封装 AppCacheService（内存 store 起步，接口预留切 Redis 代码不变），趋势/首页概览 getOrSet 命中缓存 + 版本号失效（写操作 bump），67/67 单测通过 |
| 1.3.7 | 安全加固 | ✅ | 第5周 | 已完成 | @nestjs/throttler 全局限流 60/min；登录注册 5/min、AI识别 10/min、上传 20/min、探活豁免（实测 429 生效）；CORS 环境变量化；防注入由 Prisma 参数化保障 |

**第一阶段里程碑**
- [ ] 公司营业执照到手
- [ ] ICP备案已提交（等待中）
- [ ] 商标申请已提交（等待中）
- [x] 后端全部API接口开发完成（本地环境跑通）
- [ ] 云服务器部署完成，API可访问（本地开发环境已完成，云部署待做）
- [x] Swagger文档完整

---

## 第二阶段：Web前端开发（第6-9周）

### 2.1 基础框架 + 登录注册（第6周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 2.1.1 | 项目初始化（React + Vite + Ant Design） | ✅ | 第6周 | 已完成 | |
| 2.1.2 | 路由配置 + 布局框架 | ✅ | 第6周 | 已完成 | 侧边栏 + 顶部导航（MainLayout） |
| 2.1.3 | 登录/注册页面 | ✅ | 第6周 | 已完成 | 手机号+密码；微信登录未接 |
| 2.1.4 | 认证状态管理 | ✅ | 第6周 | 已完成 | Token存储 + 路由守卫 |
| 2.1.5 | API请求封装 + 拦截器 | ✅ | 第6周 | 已完成 | axios 统一拦截 |
| 2.1.6 | 首页（健康概览） | ✅ | 第6周 | 已完成 | 对接 /reports/dashboard |

### 2.2 报告管理页面（第7周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 2.2.1 | 报告列表页 | ✅ | 第7周 | 已完成 | 列表 + 分类筛选 + 搜索（/reports/search） |
| 2.2.2 | 报告详情页 | ✅ | 第7周 | 已完成 | 结构化数据 + 参考范围/异常标记 |
| 2.2.3 | 指标趋势图（ECharts） | ✅ | 第7周 | 已完成 | Trend 页，趋势数据点字段 date |
| 2.2.4 | 上传报告页 | ✅ | 第7周 | 已完成 | 选图→AI识别→确认保存 |
| 2.2.5 | 手动添加报告 | ✅ | 第7周 | 已完成 | 报告/诊断列表页均有手动添加 |

### 2.3 诊断 + 用药 + 个人中心（第8周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 2.3.1 | 诊断记录列表页 | ✅ | 第8周 | 已完成 | 含新增/编辑/删除 |
| 2.3.2 | 诊断详情页 | ✅ | 第8周 | 已完成 | DiagnosisDetail 独立页：基本信息 + 关联报告 + 关联用药联动 |
| 2.3.3 | 用药记录页 | ✅ | 第8周 | 已完成 | 当前用药 + 历史用药 |
| 2.3.4 | 个人中心页 | ✅ | 第8周 | 已完成 | Profile 页含家庭成员管理 |
| 2.3.5 | 会员订阅页 | ✅ | 第8周 | 已完成 | Membership 页：套餐展示+升级（mock支付） |
| 2.3.6 | 订阅管理页 | ✅ | 第8周 | 已完成 | 订单历史：PaymentOrder 落库(PENDING→PAID) + /member/orders + Membership 页表格 |

### 2.4 功能完善 + 自测（第9周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 2.4.1 | 付费墙弹窗（超出额度引导升级） | ✅ | 第9周 | 已完成 | 后端拦截改抛 402；Web Modal 引导 + 小程序 showModal 跳转会员中心，防重复弹窗 |
| 2.4.2 | 空状态引导页 | 🔄 | 第9周 | | Web 列表空态已接 EmptyGuide 行动引导（报告/用药/就诊）；新用户首次使用引导待补 |
| 2.4.3 | 错误处理 + 加载状态 | ✅ | 第9周 | 已完成 | 全局 ErrorBoundary（500 兜底可刷新/回首页）+ 404 页（保留导航框架）；路由切换 Loading 由 Suspense fallback 覆盖 |
| 2.4.4 | 响应式适配 | ✅ | 第9周 | 已完成 | Grid.useBreakpoint 断点：<lg 侧边栏收纳为 Drawer+汉堡；首页统计/列表栅格 xs 堆叠；Reports/Diagnoses/Medications 四表 scroll.x 窄屏横向滚动 |
| 2.4.5 | 前端单元测试（AI生成） | ⏳ | 第9周 | | 用AI批量生成 |
| 2.4.6 | 前后端联调 | ✅ | 第9周 | 已完成 | 方向2回归验证，修复4处契约bug（items/date/search） |

**第二阶段里程碑**
- [x] Web端全部页面开发完成（诊断详情/订单历史已补齐）
- [x] 前后端联调通过
- [x] 付费墙逻辑正常（后端 402 拦截 + 双端升级引导弹窗）
- [x] 趋势图渲染正常

---

## 第三阶段：小程序端开发（第10-12周）

### 3.1 小程序框架 + 核心页面（第10周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 3.1.1 | 项目初始化（uni-app + Vue3 + Pinia） | ✅ | 第10周 | 已完成 | npm workspaces；源码已重构至 src/；pinia 已注册 |
| 3.1.2 | 页面路由 + TabBar配置 | ✅ | 第10周 | 已完成 | 首页/报告/上传/我的；图标已补（脚本生成 81x81 双态 PNG，static/tabbar） |
| 3.1.3 | 登录页 | ✅ | 第10周 | 已完成 | 手机号+密码（未注册自动注册）；微信授权登录待接 |
| 3.1.4 | 首页（健康概览） | ✅ | 第10周 | 已完成 | dashboard/用药/可追踪指标真实数据 |
| 3.1.5 | 报告列表页 | ✅ | 第10周 | 已完成 | reportApi.list（items契约）+ onShow 刷新 |
| 3.1.6 | 报告详情页 | ✅ | 第10周 | 已完成 | 按 id 拉取，referenceText/min/max 渲染 |
| 3.1.7 | API请求封装 | ✅ | 第10周 | 已完成 | uni.request 封装：Bearer注入、401防抖跳登录、uploadFile |

### 3.2 上传 + 诊断 + 用药（第11周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 3.2.1 | 上传报告页 | ✅ | 第11周 | 已完成 | 选成员→真实上传→AI识别→确认保存；含AI额度展示 |
| 3.2.2 | 诊断记录页 | ✅ | 第11周 | 已完成 | diagnoses 页：时间线列表+详情展开+手动添加+删除；首页/我的页已有入口 |
| 3.2.3 | 用药记录页 | ✅ | 第11周 | 已完成 | 当前用药 + 历史用药 |
| 3.2.4 | 我的页面 | ✅ | 第11周 | 已完成 | /auth/me + 订阅配额展示 + 退出登录 |
| 3.2.5 | 会员订阅页 | ✅ | 第11周 | 已完成 | membership 页：套餐展示+升级（mock支付） |
| 3.2.6 | 家庭成员管理页 | ✅ | 第11周 | 已完成 | family 页：列表+添加（受套餐上限约束） |

### 3.3 小程序完善 + 自测（第12周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 3.3.1 | 空状态引导 | ⏳ | 第12周 | | |
| 3.3.2 | 错误处理 + 加载状态 | ⏳ | 第12周 | | |
| 3.3.3 | 小程序端自测 | 🔄 | 第12周 | | build:mp-weixin 编译通过；开发者工具/真机功能自测待做 |
| 3.3.4 | 真机调试 | ⏳ | 第12周 | | iOS + Android双平台 |
| 3.3.5 | 性能优化 |  | 第12周 | | 图片压缩 + 懒加载 |

**第三阶段里程碑**
- [x] 小程序全部页面开发完成（含诊断记录页，编译验证通过）
- [ ] 真机测试通过（iOS + Android）
- [ ] 小程序提交审核准备就绪（需企业主体+Appid）

---

## 第四阶段：AI对接 + 功能完善（第13-15周）

### 4.1 AI服务对接（第13周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 4.1.1 | 国内AI服务选型（百度/阿里/腾讯OCR） | ✅ | 第13周 | 已完成 | 选定百度OCR（数据不出境合规，见决策记录） |
| 4.1.2 | OCR服务对接 | 🔄 | 第13周 | | 接口抽象+无密钥降级mock已就绪；待申请密钥正式对接 |
| 4.1.3 | AI结构化提取Prompt设计 | ⏳ | 第13周 | | 大模型提取检查项目、数值、单位 |
| 4.1.4 | 诊断记录AI识别 | ⏳ | 第13周 | | 识别诊断信息、ICD编码 |
| 4.1.5 | 用药记录AI识别 | ⏳ | 第13周 | | 识别药品名、用法、用量 |

### 4.2 会员系统 + 支付对接（第14周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 4.2.1 | 微信支付对接 | ⏳ | 第14周 | | 小程序支付 |
| 4.2.2 | 支付宝支付对接 |  | 第14周 | | Web端支付 |
| 4.2.3 | 订阅管理逻辑 | ✅ | 第14周 | 已完成 | 到期自动降级 + 升级激活，已验证 |
| 4.2.4 | 配额计数系统 | ✅ | 第14周 | 已完成 | AI识别次数计数 + 跨月重置 + 超限拦截（现为402），单测覆盖 | 
| 4.2.5 | 付费墙弹窗完善 | ⏳ | 第14周 | | 各等级权益对比展示 |
| 4.2.6 | 增值服务购买流程 | ⏳ | 第14周 | | 单次AI解读、数据导出付费 |

### 4.3 功能收尾（第15周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 4.3.1 | 数据导出功能（PDF/Excel） | ✅ | 第15周 | 已完成 | Excel + PDF 双格式：①Excel——GET /export/health-data（exceljs 聚合四表）；②PDF——GET /export/health-data/pdf（pdfkit 生成 A4 健康档案，含报告/明细/就诊/用药三段）。中文渲染：resolveCjkFont 运行时探测（env PDF_CJK_FONT + Win/Linux/macOS 常见路径，找不到降级内置字体不报错），pdfkit 自动子集化嵌入中文字体（实测 21KB）；生产 Dockerfile 加 font-noto-cjk。两者共用 gatherData，canExport 标准版起 + 402 付费墙，Web 首页 Excel/PDF 双按钮 blob 下载；含 6 单测（4 excel + 2 pdf） |
| 4.3.2 | 报告分享功能 | ✅ | 第15周 | 已完成 | 三端齐备：后端 POST /share/report/:id（JWT scope=share 签发、无新增表、30天有效、归属校验）+ 免登录 GET /share/view/:token（脱敏只读）；Web 分享弹窗/公开查看页；小程序报告详情页“分享报告”按钮（生成链接 + 复制到剪贴板）；canShare 家庭版权益位 + 402 付费墙（request.ts 自动弹升级），分享 token 不可冒充登录态（jwt.strategy 拦截）；含 7 单测 |
| 4.3.3 | 健康预警功能 | ✅ | 第15周 | 已完成 | 两类预警双端闭环：①复诊提醒——GET /diagnoses/upcoming-visits（逾期+未来N天，daysLeft/overdue 标记）+ Web 首页 Alert + Web 就诊列表角标 + 小程序首页提醒条 + 小程序就诊列表角标；②指标异常预警（4.3.3 收尾）——通知中心 getNotifications 新增 health 通知（近 14 天报告中 abnormal 为 HIGH/LOW/ABNORMAL 的 ReportItem，以 reportDate 为窗口、纯读取零新表、名称去重），Web/小程序首页均渲染（actionUrl=/reports）。含 member 单测 2 新用例 |
| 4.3.4 | 通知系统 | 🔄 | 第15周 | | 通知中心双端已齐：GET /member/notifications（订阅到期/续费 + AI 额度≥ 80% 预警，基于现有 Subscription 字段计算）；Web 首页 Alert + 小程序首页通知提醒条（点击跳会员页）；含 4 单测；短信/微信订阅消息等外部推送渠道待配置 |
| 4.3.5 | 全局功能联调 | 🔄 | 第15周 | | 本地环境端到端回归已通过；云端联调待部署后 |

**第四阶段里程碑**
- [ ] AI识别服务对接完成，准确率 > 90%（选型已定，待密钥对接）
- [ ] 支付功能正常（微信 + 支付宝）（当前为mock支付，订单/激活链路已通）
- [x] 会员订阅全流程跑通（配额/升级/到期降级/付费墙，本地验证）
- [ ] 数据导出、分享、预警功能完成

---

## 第五阶段：AI自动化测试（第16-18周）

### 5.1 自动化测试脚本（第16周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 5.1.1 | AI生成后端单元测试 | ✅ | 第16周 | 已完成 | 后端 Service 层全覆盖（11 个有逻辑的模块）：ai/auth/diagnosis/export/family-member/medication/member/report/share/upload 均有 service 单测，+ health 探活 controller 单测；共 12 套件/109 用例（含 upload 写盘+分页、health db up/down） |
| 5.1.2 | AI生成API集成测试 | ✅ | 第16周 | 已完成 | supertest + @nestjs/testing e2e harness 覆盖 **全部 12 个 controller**（health/member/auth/share/report/upload/diagnosis/medication/user/family-member/export/ai），共 **53 e2e 用例**：验证全局前缀 /api、JwtAuthGuard（401）、静态路由优先于 :id、query/body 透传、分页与 days 转数字、multipart 上传、导出下载头、share token 404、免费/上限 402；mock Prisma/Service 零真实 DB |
| 5.1.3 | AI生成前端组件测试 | ✅ | 第16周 | 已完成 | Web 端新建 Vitest 基建（vitest@1 + @testing-library/react@14 + jest-dom + jsdom + user-event）；独立 `web/vitest.config.ts`（environment=jsdom、globals、@ 别名），`setup-tests.ts` 预置 jest-dom/vitest + matchMedia/ResizeObserver polyfill（antd 依赖）；tsconfig 排除测试使 `tsc && vite build` 不受影响；覆盖 3 核心组件共 7 用例：EmptyGuide（描述/默认与自定义按钮文案/点击回调）、ErrorBoundary（正常渲染 children / 抛错兑底页含错误信息与按钮）、NotFound（MemoryRouter 下 404 文案与返回按钮）；踩坑：带图标按钮可访问名含 aria-label（如 "plus 去添加"），用正则子串匹配。已接入 CI（`npm test -w web`），3 文件/7 用例全过、web build 绿 |
| 5.1.4 | AI生成E2E测试脚本 | ✅ | 第16周 | 已完成 | server/e2e-test.ps1：覆盖报告/诊断/用药/会员核心流程 |
| 5.1.5 | 测试覆盖率检查 | ✅ | 第16周 | 已完成 | jest --coverage 基线：后端 **84.87% Stmts / 85.22% Lines**（达成 >80% 目标），Branch 66.14%、Funcs 77.22%；jest.config.js 固化 collectCoverageFrom（排除 spec/e2e/module/main）+ coverageThreshold 门禁（Stmts/Lines≥80、Funcs≥75、Branch≥60 留安全余量）；package.json 新增 `test:cov` 脚本；短板为 ai.service(59%,需外部 OCR 密钥)、prisma.service(onInit 需真实 DB)、member.controller(65%,次要分支)，业务主链路均已覆盖 |

### 5.2 全面测试执行（第17周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 5.2.1 | 运行全部自动化测试 | ✅ | 第17周 | 已完成 | 全量实跑并产出 `TEST-REPORT.md`：后端 13 单测套件/112 用例 + 12 e2e 套件/53 用例、覆盖率 84.93% Stmts/85.27% Lines（门禁过）；前端 Vitest 3 文件/7 用例；**自动化合计 28 套件/172 用例全绿**（本地 + CI）。已记录缺口：jwt.strategy 0%、app-cache.service 17.85%（均属后续收敛批次：已分别补至 90.9%/100%，总覆盖率 89.01% Stmts）、member.controller 65%、ai.service 真实 OCR 分支（待密钥）、小程序无自动化；契约 e2e/性能/兼容性需部署环境手动执行 |
| 5.2.2 | AI辅助Bug修复 | ⏳ | 第17周 | | AI分析错误日志 + 生成修复方案 |
| 5.2.3 | 安全测试（AI代码审计） | ✅ | 第17周 | 已完成 | 后端全量安全审计（零新依赖）：✅ SQL 注入（仅 health 静态 `$queryRaw\`SELECT 1\``，无插值）；✅ 鉴权覆盖（11/12 controller 有 `@UseGuards(JwtAuthGuard)`，health 公开探活符合预期）；✅ 越权/归属（report/medication/diagnosis/family-member/upload/share 均按 userId 限定，写操作先 findOne 校验）；✅ 路径穿越（ai 用 `path.basename`、upload 随机文件名）；✅ share token（验签+scope+归属，jwt.strategy 拒绝 share 作登录凭证）；✅ 限流/密码/日志/CORS。**高危修复 1 项**：JWT 兜底密钥硬编码（jwt.strategy + auth.module）——新增 `common/jwt-config.ts::resolveJwtSecret()`，生产未设 JWT_SECRET 则 fail-fast 拒启、非生产兼容并告警（含 3 单测）。全量 25 套件/165 用例、build 绿。待办：~~.env.example 模板~~（✅ 2026-10-03 已交付 `server/.env.example`，变量与代码逐一比对：NODE_ENV/PORT/DATABASE_URL/JWT_SECRET/CORS_ORIGINS/AI_PROVIDER/BAIDU_API_KEY·SECRET_KEY/PDF_CJK_FONT；REDIS 与支付未接入已标注，不含真实密钥）、真机/云端渗透测试 |
| 5.2.4 | 性能测试 |  | 第17周 | | 并发测试 + 慢查询优化 |
| 5.2.5 | 兼容性测试 |  | 第17周 | | Chrome/Firefox/Safari/Edge + iOS/Android微信 |

### 5.3 Bug修复 + 回归测试（第18周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 5.3.1 | P0 Bug修复 | ⏳ | 第18周 | | 阻塞性Bug优先 |
| 5.3.2 | P1 Bug修复 | ⏳ | 第18周 | | 功能缺陷 |
| 5.3.3 | P2 Bug修复 | ⏳ | 第18周 | | 体验优化 |
| 5.3.4 | 回归测试 | 🔄 | 第18周 | | 契约bug修复后已回归通过；全量待测试体系建立后 |
| 5.3.5 | AI识别准确率测试 | ⏳ | 第18周 | | 准备50+张测试图片验证 |

**第五阶段里程碑**
- [ ] 测试覆盖率 > 80%
- [ ] P0/P1 Bug全部修复
- [ ] AI识别准确率 > 90%
- [ ] 安全测试通过
- [ ] 性能测试通过

---

## 第六阶段：合规上线（第19-20周）

### 6.1 合规收尾（第19周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 6.1.1 | ICP备案号获取（应已审批通过） | ⏳ | 第19周 | | 网站底部公示 |
| 6.1.2 | 隐私政策终稿（律师审核） | 🔄 | 第19周 | | **初稿已产出** `PRIVACY-POLICY.md`（13 章，盖 PIPL 敏感个人信息单独同意/境内不出境/AES-256+等保三级/用户权利/家庭成员他人数据授权/未成年人/PIA 与 DPO 联系），【】占位待填，**待执业律师审核定稿** |
| 6.1.3 | 用户协议终稿 | 🔄 | 第19周 | | **初稿已产出** `USER-AGREEMENT.md`（15 章，含非医疗服务定性与免责声明/AI 结果仅供参考/他人数据授权保证/自动续费与退款/责任限制/管辖），**待执业律师审核定稿** |
| 6.1.4 | 等保测评启动（如预算允许） | ⏳ | 第19周 | | 联系测评机构 |
| 6.1.5 | 个人信息保护影响评估（PIA） | ✅ | 第19周 | 已完成 | **已产出** `PIA-REPORT.md`（PIPL 第55/56 条三要素）：处理活动范围/合法性正当性必要性/对个人权益影响与风险（R-1~R-9）/已有控制（经代码核验：bcrypt/限流/JWT scope/userId 隔离/软删除+注销/密钥 fail-fast）**与差距**（健康数据 AES-256 静态加密未落地→R-2/6.1.6；无数据访问审计日志→R-3/6.1.7；敏感信息单独同意交互待确认→R-1）/剩余风险评级/整改优先级。结论：**有条件通过**，P0 未完成前不具备上线。未改代码 |
| 6.1.6 | 健康数据静态加密 | ✅ | 第19周 | 已完成 | **已实现（PIA P0 之 R-2 缓解）**：加密基座 `common/crypto/encryption.ts`（AES-256-GCM、版本化自描述 token `enc:v1:`、兼容存量明文/幂等/GCM 完整性）+ `encryption-config.ts`（`DATA_ENCRYPTION_KEY` env，非生产兜底告警/生产 fail-fast，密钥不入库）。覆盖范围：①`User.allergyHistory`/`medicalHistory`（service 层 `updateProfile`写加密、`getUserById`/`auth.sanitizeUser` 收敛解密）；②**集中式 Prisma 中间件** `common/crypto/prisma-encryption.ts`（`PrismaService.$use`）对 `Report.summary`/`Diagnosis.complaint·diagnosisText·advice`/`Medication.notes` 写前加密、读后解密，一次覆盖列表/详情/搜索/概览/导出/分享全部读写面，避免逐点漏解密。因 summary 密文化，`report.service.search` 已从 DB 模糊匹配移除该字段（保留医院+指标名）。新增 prisma-encryption 单测套件；后端 **32 套件/218 用例全绿**（覆盖率 89.66% Stmts，crypto 模块 93.81%）、`nest build` 绿（`dist/main.js` 路径不受 `src/scripts` 影响）。存量明文一次性回填脚本 `src/scripts/backfill-encryption.ts`（裸 PrismaClient、幂等、含 User）+ `npm run db:backfill-encrypt`。**部署门槛**：上线前注入与 App 一致的 `DATA_ENCRYPTION_KEY` 并执行回填。`.env.example` 已补密钥说明 |
| 6.1.7 | 审计日志验证 | ✅ | 第19周 | 已完成 | **已实现**数据访问审计（对应 PIA R-3）：新增 `AuditLog` Prisma 模型（userId/action/resourceType/resourceId/ip/userAgent/success/meta/createdAt，两组合索引，不建 User 外键保证注销后仍留存）+ 迁移 `20261003000000_add_audit_log`；`audit/` 特性：`@Audit(resourceType, action?)` 装饰器 + `AuditInterceptor`（全局 APP_INTERCEPTOR，基于 Reflector 元数据 opt-in，action 缺省按 HTTP 方法推断 GET→READ/POST→CREATE…，成功/失败均留痕且异常不阻断主链路）+ `AuditService.record()`（写库异常仅告警）。已对 REPORT/DIAGNOSIS/MEDICATION/FAMILY_MEMBER/UPLOAD/USER 类及导出（强制 EXPORT）、分享查看（SHARE_VIEW）挂审计。新增 2 套件/9 单测；后端 29 套件/191 用例全绿（覆盖率 89.07%→**89.36% Stmts**）、nest build 绿。部署需执行 `prisma migrate deploy` 建表。**【R-3 尾项增强已完成】**：①`AuditService.recordLogin()` + `AuthController` 对手机/密码/微信登录**成功与失败均留痕**（`action=LOGIN`/`resourceType=AUTH`，失败记录 `maskIdentity()` 脱敏账号 + HTTP 状态码，便于追溯爆破/枚举；审计写入非阻塞，绝不阻断登录）；②新增**只读查询端点 `GET /audit/me`**（`AuditController`，JwtAuthGuard），`AuditService.queryOwn()` 按已鉴权 `req.user.userId` 强制过滤，分页（pageSize≤100）+ action/resourceType/success/时间范围过滤——仅能查**本人**数据访问记录（数据主体知情权）；跨用户全量管理端查询待 RBAC/管理员角色后开放。新增 audit.controller/auth.controller 2 套件 + audit.service 扩充用例，后端 **34 套件/237 用例全绿**（整体覆盖率 90.36% Stmts，audit 目录 95.55%）、nest build 绿 |
| 6.1.8 | 用户注销+数据删除功能验证 | ✅ | 第19周 | 已完成 | 代码核验：`DELETE /user/account` → `deleteAccount` 置 `status=DELETED`+`deletedAt`（软删除）；各数据查询均按 userId 隔离且过滤 `deletedAt:null`；schema 子关系 `onDelete: Cascade`。**发现并修复真实缺陷**：三个登录入口（loginByPhone/Password/Wechat）**未校验 status**，已注销/禁用账号仍可登录并重获访问权——新增 `assertActive()` 在签发 token 前拒绝非 ACTIVE 账号（DELETED→“账号已注销”/DISABLED→“账号已被禁用”），补 3 单测（auth.service 13→16 用例）；后端 27 套件/182 用例全绿。**遗留**：注销后健康数据的**物理清除/匿名化**未实现（仅软删）→归入 PIA R-9，待补定时硬删除策略 |

### 6.2 正式上线（第20周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 6.2.1 | 生产环境部署 | ⏳ | 第20周 | | Docker Compose + Nginx |
| 6.2.2 | HTTPS证书配置 | ⏳ | 第20周 | | 免费证书或付费证书 |
| 6.2.3 | 数据库备份策略配置 |  | 第20周 | | 每日自动备份 |
| 6.2.4 | 监控告警配置 | ⏳ | 第20周 | | CPU/内存/磁盘/API错误率 |
| 6.2.5 | 小程序提交审核 | ⏳ | 第20周 | | 等待微信审核（3-7天） |
| 6.2.6 | Web端上线 | ⏳ | 第20周 | | 域名解析 + 访问验证 |
| 6.2.7 | 线上冒烟测试 | ⏳ | 第20周 | | 核心功能验证 |
| 6.2.8 | 正式发布 | ⏳ | 第20周 | | 🎉 |

**第六阶段里程碑**
- [ ] 生产环境稳定运行
- [ ] Web端可正常访问
- [ ] 微信小程序审核通过并发布
- [ ] 全部合规手续完成

---

## 第七阶段：运营迭代（第21-24周）

| # | 任务 | 状态 | 计划完成 | 实际完成 | 备注 |
|---|------|------|---------|---------|------|
| 7.1 | 种子用户招募（50-100人） |  | 持续 | | 朋友圈、社群、V2EX |
| 7.2 | 用户反馈收集 | ⏳ | 持续 | | 问卷 + 社群 + 应用内反馈 |
| 7.3 | Bug修复 |  | 第21-22周 | | 用户反馈的问题 |
| 7.4 | AI识别准确率优化 | ⏳ | 第21-22周 | | 补充训练数据/调整Prompt |
| 7.5 | 性能优化 | ⏳ | 第21-22周 | | 慢查询、图片压缩、懒加载 |
| 7.6 | 用户体验优化 | ⏳ | 第21-22周 | | 空状态引导、操作反馈 |
| 7.7 | 内容运营（健康科普） | ⏳ | 持续 | | 公众号/小红书引流 |
| 7.8 | 付费转化优化 |  | 第23-24周 | | 优化付费墙文案和时机 |

**第七阶段里程碑**
- [ ] 种子用户50-100人
- [ ] 首批付费用户出现
- [ ] AI识别准确率提升至95%+
- [ ] 用户留存率 > 30%（7日）

---

## 行政工作跟踪

| # | 任务 | 状态 | 提交日期 | 完成日期 | 备注 |
|---|------|------|---------|---------|------|
| A1 | 公司注册 |  | | | 3-5个工作日出照 |
| A2 | ICP备案 | ⏳ | | | 等待20个工作日 |
| A3 | 商标申请（第9类） | ⏳ | | | 等待6-9个月 |
| A4 | 商标申请（第42类） |  | | | 等待6-9个月 |
| A5 | 微信小程序注册 | ⏳ | | | 需要营业执照 |
| A6 | 隐私政策终稿 | ⏳ | | | AI生成+律师审核 |
| A7 | 用户协议终稿 | ⏳ | | | |
| A8 | 等保测评 | ⏳ | | | MVP阶段可暂缓 |

---

## 风险与问题跟踪

| # | 风险/问题 | 影响 | 应对措施 | 状态 | 负责人 |
|---|----------|------|---------|------|--------|
| R1 | ICP备案被退回 | 高 | 提前咨询云服务商客服，确保材料齐全 | 待监控 | JackHe |
| R2 | 一个人burnout | 高 | 严格周末休息，设定阶段性小目标庆祝 | 待监控 | JackHe |
| R3 | 技术难题卡住 | 中 | 加入技术社群（V2EX/掘金），善用AI编程助手 | 待监控 | JackHe |
| R4 | 小程序审核不通过 | 中 | 提前了解审核规则，避免敏感词，首次提交前自查 | 待监控 | JackHe |
| R5 | AI识别准确率不达标 | 中 | 多方案备选（百度+阿里），人工修正机制 | 待监控 | JackHe |
| R6 | 合规手续拖延 | 中 | 每周固定2小时处理行政事务，不挤占开发时间 | 待监控 | JackHe |

---

## 进度统计

### 总体进度

| 阶段 | 总任务数 | 已完成 | 进行中 | 待开始 | 完成率 |
|------|---------|--------|--------|--------|--------|
| 第一阶段：行政+后端 | 29 | 19 | 0 | 10 | 66% |
| 第二阶段：Web前端 | 23 | 21 | 1 | 1 | 91% |
| 第三阶段：小程序 | 18 | 13 | 1 | 4 | 72% |
| 第四阶段：AI+功能 | 16 | 6 | 3 | 7 | 38% |
| 第五阶段：测试 | 15 | 7 | 1 | 7 | 43% |
| 第六阶段：合规上线 | 16 | 4 | 1 | 11 | 25% |
| 第七阶段：运营迭代 | 8 | 0 | 0 | 8 | 0% |
| **合计** | **125** | **70** | **7** | **48** | **56%** |

> 注：任务总数按各阶段实际行重新盘点（含 1.1 行政 8 项）；开发主体（后端/Web/小程序）已基本完成，当前重心转向支付对接、真机测试与云部署。

### 里程碑完成情况

| 里程碑 | 计划完成 | 实际完成 | 状态 |
|--------|---------|---------|------|
| M1: 后端API完成 | 第5周 | 本地环境已达成 | ✅（云部署待做） |
| M2: Web前端完成 | 第9周 | 核心页面+联调完成 | ✅（次要视图待完善） |
| M3: 小程序完成 | 第12周 | 开发+编译完成 | 🔄（真机测试待做） |
| M4: AI+支付完成 | 第15周 | | 🔄（会员体系已通，支付/AI密钥待接） |
| M5: 测试完成 | 第18周 | | ⏳ |
| M6: 正式上线 | 第20周 | | ⏳ |
| M7: 种子用户达标 | 第24周 | | ⏳ |

---

## 更新日志

| 日期 | 更新内容 | 更新人 |
|------|---------|--------|
| 2026-09-27 | 创建进度跟踪表 | JackHe |
| 2026-09-30 | 同步三个方向完成情况：①后端会员订阅体系（四档套餐/配额/付费墙/到期降级，端到端验证通过）；②前后端契约回归（e2e-test.ps1，修复4处bug）；③微信小程序全页面接真实API并编译通过（build:mp-weixin，源码重构至src/）。总进度由0%更新为36% | JackHe |
| 2026-09-30 | 补齐小程序就诊诊断记录页（列表/详情展开/添加/删除，接入 /diagnoses CRUD），首页与我的页增加入口，build:mp-weixin 编译验证通过；小程序阶段完成率 67%→72% | JackHe |
| 2026-09-30 | TabBar 图标补齐：新增 scripts/gen-tabbar-icons.ps1（System.Drawing 绘制 81x81 灰/蓝双态 8 图），pages.json 配置 iconPath，重新编译产物验证通过 | JackHe |
| 2026-09-30 | Web端补齐 + 云部署配置：①新增 DiagnosisDetail 独立详情页（关联报告/用药联动）；②订阅订单历史（新增 PaymentOrder 表+迁移、/member/orders、Membership 订单表格，下单PENDING→激活PAID 链路验证通过）；③重写 Dockerfile（monorepo 多阶段）+ docker-compose（healthcheck/AI适配）+ nginx（/health/uploads）+ .dockerignore，后端新增 /api/health 探活、uploads 静态托管、CORS_ORIGINS；修复 workspaces vite 版本冲突（根 overrides）使三端构建恢复通过。总进度 37%→40% | JackHe |
| 2026-09-30 | CI/CD + 付费墙闭环 + 后端单测：①新增 GitHub Actions 流水线（三端构建+单测，master 验证 Docker 镜像）；②付费墙：后端拦截改抛 402（HttpException PAYMENT_REQUIRED），Web Modal/小程序 showModal 双端引导升级；③Jest+ts-jest 基建，member.service 11 用例全过（配额/付费墙/订单落库/激活/契约），tsconfig.build.json 排除 spec。总进度 40%→42% | JackHe |
| 2026-09-30 | CI 首跑验证闭环：build job 一次通过；Docker job 暴露 workspaces 坑（npm ci 不生成 server/node_modules）→ prod-deps 改整仓 --omit=dev + 显式 prisma generate + mkdir 兼容，第二轮全绿。另：Web 三列表页接入 EmptyGuide 空态行动引导（2.4.2 启动）；前端性能优化（1.3.6 启动）：manualChunks 四分包 + App 路由级 React.lazy，主包 2350KB→17KB | JackHe |
| 2026-09-30 | 安全加固+单测扩展+错误处理：①1.3.7 ✅ @nestjs/throttler 全局限流（登录 5/min、AI 10/min、上传 20/min、探活豁免，实测第 6 次请求返回 429）；②1.3.4 扩展 report/diagnosis/medication 三 service 共 28 新用例，39/39 全过，test 脚本固化 --runInBand 规避 worker 内存崩溃；③2.4.3 ✅ 全局 ErrorBoundary + 404 页。总进度 42%→43% | JackHe |
| 2026-09-30 | 单测收尾+复诊预警：①1.3.4 ✅ auth.service（13 用例：自动建档/密码 hash/401 不泄露账号存在性/BigInt 序列化）+ ai.service（8 用例：前置校验不白扣额度/402 中止不回写/降级策略/路径穿越防护），63/63 全过；②4.3.3 启动：新增 GET /diagnoses/upcoming-visits（逾期+未来 N 天，daysLeft/overdue 标记，含 3 新单测），Web 首页复诊提醒 Alert。总进度 43%→44% | JackHe |
| 2026-09-30 | 小程序复诊提醒 + 缓存接入：①小程序首页新增复诊提醒条（复用 /diagnoses/upcoming-visits，逾期红/临期橙，点击跳就诊记录，build:mp-weixin 验证通过）；②1.3.6 ✅ @nestjs/cache-manager（内存 store 起步，预留 Redis 平滑切换）封装 AppCacheService，趋势/首页概览 getOrSet 缓存 + 版本号失效（写操作 bump），ReportService 可选注入向后兼容，新增 4 缓存单测，67/67 全过。三端构建均绿。总进度 44%→45% | JackHe |
| 2026-10-02 | 复诊预警闭环 + echarts 瘦身：①小程序就诊列表页新增复诊待办角标（基于 nextVisitDate 客户端算逾期红/7天内橙，无需额外请求）；②1.3.6 收尾：Trend 页改 echarts/core 按需注册（LineChart+Grid+Tooltip+Canvas），卸载未用的 echarts-for-react，vendor-echarts 全量~1MB→455KB(gzip 156KB)。web/mini 构建均绿 | JackHe |
| 2026-10-02 | 2.4.4 Web 响应式适配 ✅：MainLayout 用 Grid.useBreakpoint 做断点，<lg 侧边栏改为 Drawer+汉堡按钮（菜单桌面/移动共用一份）；首页统计卡 xs=24/sm=8、主副区 xs=24/lg=16+8 堆叠；Reports/Diagnoses/Medications 四个 Table 加 scroll.x=max-content 窄屏横向滚动。web 构建绿。阶段二 87%→91%，总进度 45%→46% | JackHe |
| 2026-10-02 | 4.3.1 数据导出（Excel）+ Web 复诊角标：①后端新增 ExportModule（exceljs 聚合四表 GET /export/health-data），plan.config 加 canExport 权益位、MemberService.assertExportAccess 免费版抛 402 付费墙，含 4 单测（71/71 全过）；②Web 首页右侧快捷区加「导出健康档案」按钮（blob 下载，402 由 api 拦截器弹升级引导）；③4.3.3 补齐 Web 就诊列表复诊角标（基于 nextVisitDate 逾期红/今天红/7天内橙，对齐小程序）。server build/web build/71 测试全绿 | JackHe |
| 2026-10-02 | 4.3.2 报告分享 + 4.3.4 通知中心：①分享（家庭版）——新增 ShareModule，POST /share/report/:id 用 JWT（scope=share + reportId + ownerId、无新增表、 30 天）签发只读链接，免登录 GET /share/view/:token 脱敏返回；plan.config 加 canShare、assertShareAccess 非家庭版抛 402；jwt.strategy 拒绝 share token 冒充登录；Web Reports 分享弹窗 + 公开查看页 /share/report/:token（App.tsx 免登录路由前置）；②通知（4.3.4）——MemberService.getNotifications（订阅到期/续费 + AI 额度≥80% 预警）+ GET /member/notifications + Web 首页 Alert。share 7 + member 7 新增单测，85/85→全量 8 套件/82 用例全过；server/web build 全绿 | JackHe |
| 2026-10-02 | 小程序通知/分享对齐（4.3.2 关账 ✅ + 4.3.4）：①api.ts 新增 memberSubscriptionApi.notifications + shareApi.createReport；②首页新增订阅/额度通知提醒条（复用 /member/notifications，error 红/warning 橙，点击跳会员页）；③报告详情页新增“分享报告”按钮（POST /share/report/:id → 拼 WEB_BASE_URL+path → uni.setClipboardData 复制；config.ts 新增 WEB_BASE_URL），非家庭版 402 由 request.ts 统一弹升级。4.3.2 三端齐备故置 ✅；build:mp-weixin 绿（MINI_EXIT=0，未改后端）。阶段四 19%→25%，总进度 57→58 完成 | JackHe |
| 2026-10-02 | 指标异常预警（4.3.3 收尾 ✅）：①后端 MemberService.getNotifications 新增第 3 类 health 通知——查近 14 天（以 reportDate 为窗口）abnormal ∈ {HIGH,LOW,ABNORMAL} 的 ReportItem，名称去重后取前 3 拼提示，unshift 置顶；纯读取零新表、try/catch 隔离不影响其他通知；②双端渲染：Web 首页 Alert 已按 n.actionUrl 导航（/reports 天然生效）；小程序首页提醒条改为 goNotice(n) 按 actionUrl 路由（/reports→switchTab 报告 tab，否则会员页）。member spec 补 reportItem.findMany mock + 2 用例（有/无异常项）。全量 8 套件/87 用例全过；server build/mini build 全绿（JEST_ALL_EXIT=0/MINI_EXIT=0，未改 Web 代码）。4.3.3 两类预警双端闭环置 ✅，阶段四 25%→31%，总进度 58→59 | JackHe |
| 2026-10-02 | PDF 导出（4.3.1 收尾 ✅）：①server 新增依赖 pdfkit + @types/pdfkit；②export.service 抽取 gatherData（Excel/PDF 共用）+ resolveCjkFont（运行时探测 CJK 字体：env PDF_CJK_FONT + Win/Linux/macOS 常见路径，找不到降级内置字体不报错）+ exportHealthDataPdf（pdfkit A4，报告/明细/就诊/用药三段，fillColor/自动分页）；③export.controller 新增 GET /export/health-data/pdf（application/pdf 下载头）；④Web 首页导出按钮改 Space.Compact Excel/PDF 双选项（handleExport(format)，修正 url 变量重名）；⑤Dockerfile 生产段 apk 加 font-noto-cjk。中文渲染本地实测生成 21KB 且 FontFile 子集化嵌入；export spec +2 PDF 用例（402 前置 / %PDF 头与文件名）。全量 8 套件/89 用例全过；server/web build 全绿（JEST_ALL_EXIT=0/WEB_EXIT=0）。4.3.1 置 ✅，阶段四 31%→38%，总进度 59→60 | JackHe |
| 2026-10-02 | user / family-member 单测（5.1.1 推进 🔵）：①新增 user.service.spec（updateProfile 的 birthDate 字符串→Date/未传不写、getUserById 剔除 password 与 null 分支、deleteAccount 软删除置 status+deletedAt）；②新增 family-member.service.spec（findAll 排序、findOne 归属、create 套餐上限 402 且不写库/birthDate 转换、update/remove 先校验归属再操作、越权抛 NotFound 不落地）。新增 2 套件/14 用例，全量 **10 套件/103 用例全过**（JEST_ALL_EXIT=0），server build 绿（BUILD_EXIT=0）。阶段五 7%→11%（5.1.1 置 🔵）；未改业务代码/Web/小程序，纯测试增量 | JackHe |
| 2026-10-02 | upload / health 单测（5.1.1 关账 ✅）：①新增 upload.service.spec（saveImage 写盘+落库、storagePath 保留扩展名/状态 PENDING、updateStatus、findAll 分页 skip/take 与默认页，jest.mock('fs') 隔离真实 IO）；②新增 health.controller.spec（$queryRaw 成功 → ok/up、抛错 → degraded/down）。至此 **后端 Service 层单测全覆盖**（+ health controller）：全量 **12 套件/109 用例全过**（JEST EXIT=0），server build 绿（BUILD_EXIT=0）。5.1.1 置 ✅，阶段五 11%→15%，总进度 48%→49%（已完成 60→61） | JackHe |
| 2026-10-02 | Controller 层集成测试启动（5.1.2 推进 🔵）：①server 新增 devDep @nestjs/testing + supertest + @types/supertest；②建立 supertest e2e harness（用 Test.createTestingModule 启动最小 app + setGlobalPrefix('api')，overrideGuard/mock PrismaService 避免真实 DB）；命名踩坑：jest testRegex 为 `\.spec\.ts$`，文件名需用 `.e2e.spec.ts` 而非 `.e2e-spec.ts` 才会被收集；③新增 health.e2e.spec（GET /api/health 200 ok/up & degraded/down）+ member.e2e.spec（未登录 401、notifications 透传 userId、subscription、orders 分页 query 转数字/默认 1・20）共 6 e2e 用例。全量 **14 套件/115 用例全过**，server build 绿（dist 正确排除 spec）。阶段五 15%→18%，5.1.2 置 🔵 | JackHe |
| 2026-10-02 | Controller e2e 扩展（5.1.2 推进 🔵）：沿用已建立范式新增 4 份 e2e —— auth（login/phone、register、me 未登录 401/登录 200）、share（生成链接、免登录查看、token 失效 404）、report（未登录 401、列表 query 透传、search 优先于 :id 的路由顺序、findOne、create body、remove）、upload（multipart+FileInterceptor 上传 png 命中 saveImage、401）。共 +4 套件/17 用例，全量 **18 套件/132 用例全过**（JEST=0），server build 绿（BUILD_EXIT=0）。e2e 累计覆盖 6 controller/23 用例；阶段五 18%→22% | JackHe |
| 2026-10-02 | Controller e2e 收尾（5.1.2 关账 ✅）：沿用范式新增 6 份 e2e 覆盖剩余 controller —— diagnosis（401/query/upcoming-visits 静态路由优先与 days 转数字/默认 7/CRUD）、medication（401/current 静态路由/CRUD）、user（profile GET/PUT/DELETE account）、family-member（仅透传 userId/402 上限透传/CRUD）、export（@Res 下载头 content-type/content-disposition/content-length、401、402）、ai（recognize 默认 type=report 与 prescription 透传、401）。至此 **12 个 controller 全有 e2e（共 53 用例）**。踩坑：superagent 不将未知二进制 content-type 的 body 解析为 Buffer，改用 content-length 断言。全量 **24 套件/162 用例全过**，server build 绿（BUILD_EXIT=0）。5.1.2 置 ✅，阶段五 22%→27%，总进度 49%→50%（已完成 61→62） | JackHe |
| 2026-10-02 | 测试覆盖率门禁（5.1.5 关账 ✅）：①全量 jest --coverage 采集基线 —— 后端 **84.87% Stmts / 85.22% Lines / 66.14% Branch / 77.22% Funcs**，达成阶段目标 >80%（Stmts/Lines）；②jest.config.js 固化 collectCoverageFrom（纳入 src 全部 TS，排除 spec/e2e/module/main）+ coverageThreshold 门禁（Stmts/Lines≥80、Funcs≥75、Branch≥60 取当前值下取整留安全余量防抖动）；③package.json 新增 `test:cov` 脚本（`test` 保持不采集覆盖率，不影响现有 CI）；④跑 test:cov 验证门禁通过（JEST=0，24 套件/162 用例）。短板定位：ai.service 59%（依赖外部百度 OCR 密钥）、prisma.service onInit（需真实 DB）、member.controller 65%（次要分支）——业务主链路均已覆盖。5.1.5 置 ✅，阶段五 27%→31%，已完成 62→63 | JackHe |
| 2026-10-03 | 安全测试代码审计（5.2.3 关账 ✅）：对后端做全量常见漏洞审计（零新依赖）。结果均安全：①无 SQL 注入（仅 health 静态 `$queryRaw\`SELECT 1\``）；②鉴权全覆盖（11/12 controller `@UseGuards(JwtAuthGuard)`，health 公开探活除外）；③无越权（report/medication/diagnosis/family-member/upload/share 均按 userId 限定，写操作先 findOne 校归属）；④无路径穿越（ai `path.basename`、upload 随机名）；⑤share token 验签+scope+归属，jwt.strategy 拒 share 作登录凭证；⑥bcrypt(10)+密码脱敏+登录/注册 5・分限流+探活豁免+登录错误不抹账号存在性；⑦`.env.production`/`server/.env` 均在 .gitignore（密钥不落仓库）。**修复 1 个高危项**：JWT 兜底密钥硬编码（`process.env.JWT_SECRET \|\| '默认值'`，仓库可见）——若生产漏配可被伪造 token。新增 `server/src/common/jwt-config.ts::resolveJwtSecret()`：有 JWT_SECRET 那么用、生产缺失 fail-fast 抛错拒启、非生产兜底+告警；jwt.strategy + auth.module 改调用。新增 jwt-config.spec（3 用例）。全量 **25 套件/165 用例全过**（JEST=0），server build 绿（dist 含 jwt-config.js、排除 spec）。5.2.3 置 ✅，阶段五 31%→35%，已完成 63→64 | JackHe |
| 2026-10-03 | 前端组件测试基建与核心组件覆盖（5.1.3 关账 ✅，至此 5.1 自动化测试脚本全绿）：①web 新增 devDep vitest@1.6 + jsdom@24 + @testing-library/react@14 + jest-dom@6 + user-event@14（-w web --legacy-peer-deps）；②新建 `web/vitest.config.ts`（独立于 vite.config、environment=jsdom、globals、@ 别名）与 `web/src/setup-tests.ts`（jest-dom/vitest + matchMedia/ResizeObserver polyfill 供 antd）；tsconfig 排除 `*.test/*.spec/setup-tests` 使 `tsc && vite build` 与测试解耦；package.json 新增 `test`(vitest run)/`test:watch`；③新增 3 份组件测共 7 用例：EmptyGuide（描述渲染/默认「去添加」/自定义文案/点击回调）、ErrorBoundary（正常渲染 children/抛错兑底页含错误信息与两个按钮）、NotFound（MemoryRouter 下 404 文案与返回首页/上一页）。踩坑：带图标按钮可访问名含图标 aria-label（"plus 去添加"），getByRole name 改正则 `/去添加/`。本地 vitest 3 文件/7 用例全过（VITEST_EXIT=0）、web build 绿（WEB_BUILD_EXIT=0）；④接入 CI（ci.yml 后端单测后新增 `npm test -w web`）。5.1.3 置 ✅，阶段五 35%→39%，已完成 64→65（总进度 51%→52%） | JackHe |
| 2026-10-03 | 全量自动化测试执行与报告（5.2.1 关账 ✅）：本地实跑采集权威数据——后端 `jest --coverage` **25 套件/165 用例全过**（JEST=0，门禁达阈）、覆盖率 **84.93% Stmts/66.83% Branch/77.34% Funcs/85.27% Lines**（较 5.1.5 基线 +0.06pt，jwt-config.ts 满覆盖拉升）；拆分：13 单测套件/112 用例 + 12 e2e 套件/53 用例。前端 `vitest run` **3 文件/7 用例全过**（VITEST=0）。新增 `TEST-REPORT.md` 汇总：执行总览/后端分模块覆盖率/前端组件清单/缺口（jwt.strategy 0%、app-cache.service 17.85%、member.controller 65%、ai.service 真实 OCR 分支待密钥、小程序无自动化、契约 e2e/性能/兼容性需部署环境）。未改业务/测试代码，纯执行+报告。5.2.1 置 ✅，阶段五 39%→43%，已完成 65→66（总进度 52%→53%） | JackHe |
| 2026-10-03 | 自动化测试缺口收敛（承接 5.2.1）：针对 TEST-REPORT 点名的两块低覆盖补单测——① `auth/jwt.strategy.spec.ts`（3 用例：Object.create 绕 passport 构造直接测 validate，share scope 拒绝/登录返回 {userId,phone}/仅 sub token phone=undefined）；② `common/app-cache.service.spec.ts`（11 用例：Map 版内存 FakeCache 测 version 默认0/bump 递增与用户隔离/buildKey 参键排序与过滤空值/getOrSet 命中回填与 bump 后失效重算/get·set 透传）。新增 2 套件/14 用例：后端 **27 套件/179 用例全绿**（JEST=0，门禁达阈），总覆盖率 **84.93%→89.01% Stmts / 85.27%→89.48% Lines / 66.83%→70.2% Branch / 77.34%→83.97% Funcs**；app-cache.service 17.85%→100%、jwt.strategy 0%→90.9%（仅剩构造器注册行）、common 目录 37.83%→100%、auth 83.33%→96.15%。server build 绿（dist 含 app-cache.service.js、spec 未泄漏）。同步刷新 TEST-REPORT.md（合计 28→30 套件/172→186 用例）。任务状态不变（5.2.1 仍 ✅），属质量收敛 | JackHe |
| 2026-10-03 | 前端测试扩面（承接 5.1.3，登录态与 API 拦截器）：新增 2 份逻辑测试共 13 用例——① `web/src/utils/api.test.ts`（6）：直取 `api.interceptors.*.handlers[0]` 回调避免真实网络，测请求拦截附 Authorization/无 token 不附、响应错误 401 清登录态+跳转 /login、**402 弹付费墙且并发去重**（spy Modal.confirm 不调 afterClose 以保留 paywallShown）、其他码提示后端 message、无响应提示网络错误；② `web/src/contexts/AuthContext.test.tsx`（7）：`vi.mock('../utils/api')` + `renderHook`/`waitFor`，测无token无缓存不请求/无token但本地有缓存直回填/有token 拉 /auth/me 回填写缓存//auth/me 失败清态/login 写 localStorage/logout 清理/无 Provider 返回默认上下文。踩坑：jsdom 下 `window.location.href` 赋值会报 navigation 错，用 `Object.defineProperty(window,'location',{value:{href:''},writable,configurable})` 接管断言；测前先 `localStorage.setItem('token')` 再 renderHook（useState 初始化即读）。前端 **5 文件/20 用例全绿**（VITEST=0）、web build 绿（WEBBUILD=0，tsc 已排除测试）。自动化合计 30→32 文件/186→199 用例，TEST-REPORT.md 同步刷新（含修正一处误写“兑底页”→“兜底页”）。任务状态不变（5.1.3 仍 ✅） | JackHe |
| 2026-10-03 | 阶段六合规文本初稿（开新阶段，6.1.2/6.1.3 → 🔄）：基于 `COMPLIANCE-ANALYSIS.md` 与 Prisma schema 实际字段，产出两份中文初稿——① `PRIVACY-POLICY.md`（隐私政策 13 章）：重点覆盖健康数据=敏感个人信息的**单独同意**、**境内存储不出境**（AI 仅用境内 OCR）、AES-256 存储加密 + 等保三级、用户权利（查阅/导出/更正/删除/撤回同意/注销/拒自动化决策/死者近亲属）、**家庭成员（他人）数据需用户保证已获授权**、未成年人、PIA/DPO 联系渠道、安全事件处置；② `USER-AGREEMENT.md`（用户协议 15 章）：**“非医疗机构/不提供诊疗”定性与免责**、120 紧急提示、AI 结果仅供参考、他人数据授权保证、自动续费/退款/发票、知识产权、责任限制、变更/终止、法律适用与管辖。两文均顶部标注“初稿·待律师审核”、【】占位主体/邮箱/日期。**因需律师审核方可上线，按实置 🔄 不虚标 ✅**。阶段六 0%→（进行中 2 项），合计进行中 6→8。未改代码，纯文档 | JackHe |
| 2026-10-03 | 个人信息保护影响评估 PIA（6.1.5 关账 ✅）：先 grep 核验后端真实实现再写报告，避免把未落地措施写进去。已实现：bcryptjs(cost10)+返回剔 password、全局 ThrottlerGuard 60/分+登录/注册5・AI10・上传20・share view30 收紧、JWT scope 隔离+jwt.strategy 拒 share 作登录凭证、userId 归属隔离、软删除 deletedAt+注销 status=DELETED、resolveJwtSecret fail-fast、境内供应商不出境。差距（如实标注）：健康数据字段 PostgreSQL 明文存、无 AES-256 静态加密（R-2→6.1.6）；仅零散应用 Logger、无数据访问审计日志（R-3→6.1.7）；敏感信息单独同意交互待确认（R-1）。产出 `PIA-REPORT.md`（PIPL 第55/56 三要素）：处理活动范围/合法性正当必要性/风险 R-1~R-9/已有控制与差距/剩余风险评级矩阵/整改优先级（P0 三项★阻断上线）。结论**有条件通过**。6.1.5 置 ✅（评估报告为本地可交付物），阶段六 0%→6%，已完成 66→67（总进度 53%→54%） | JackHe |
| 2026-10-03 | 用户注销+数据删除功能验证（6.1.8 关账 ✅，发现并修复安全缺陷）：核 `DELETE /user/account`→`deleteAccount` 软删（status=DELETED+deletedAt）、各查询 userId 隔离+过滤 deletedAt:null、schema 子关系 onDelete:Cascade。**发现真实缺陷**：`auth.service` 三个登录入口（loginByPhone/loginByPassword/loginByWechat）均**未校验 status**，已注销/禁用用户 findUnique 命中后照样签发 token → 注销形同虚设（且 loginByPhone 查到 DELETED 用户不走建档分支、直接返回带 token）。修复：新增私有 `assertActive(user)`，非 ACTIVE 抛 401（DELETED→“账号已注销，无法登录”/其他非 ACTIVE→“账号已被禁用”），在三个登录入口 sign 前统一调用（自动建档新用户默认 ACTIVE 不受影响）。补 3 单测（DELETED 拒登/DISABLED 密码对仍拒/微信 DELETED 拒且均不 sign）：auth.service.spec 13→16 用例。本地实跑：全量 `jest --coverage` **27 套件/182 用例全绿**（JEST=0，门禁达阈），总覆盖率 89.01%→89.07% Stmts（auth 96.15%→96.38%、auth.service.ts 100% Stmts）。TEST-REPORT 同步（合计 199→202 用例）。阶段六 6%→13%，已完成 67→68。**遗留**（不属本任务，据实标注）：注销后健康数据仅软删、物理清除/匿名化未实现→归入 PIA R-9，待后续补定时硬删策略 | JackHe |
| 2026-10-03 | 交付 `server/.env.example` 配置模板（5.2.3 遗留小尾巴闭环）：先 grep 全仓 `process.env.*` + Prisma datasource + 前端 import.meta.env，拿到真实读取清单后只写已用变量，不凭空造项。收入：NODE_ENV/PORT(默认3000)/DATABASE_URL(Prisma env)/JWT_SECRET(fail-fast 提示)/CORS_ORIGINS/AI_PROVIDER(mock|baidu)/BAIDU_API_KEY·SECRET_KEY/PDF_CJK_FONT；REDIS_URL 与微信支付/支付宝因当前未接入（member.service 直接建单无密钥 env）已注释标明待接入位置；前端 baseURL='/api' 相对路径无需 VITE_ env、小程序接口为源码常量，已在尾部注明。确认 `.gitignore` 仅忽 .env/.env.local/.env.*.local/.env.production，**不命中 .env.example**（可安全提交）。未改代码，模板不含任何真实密钥。5.2.3 仍 ✅（本为补充交付，不动计数） | JackHe |
| 2026-10-03 | 落地 PIA P1 前端隐私提示（承接 6.1.5 R-4/R-5，Web 端）：① `Upload.tsx` AI 识别结果确认页新增 warning Alert“AI 结果仅供参考、不构成医学诊断、请逐项核对后保存”（R-4）；② `Profile.tsx` 新增家庭成员表单增加授权声明 Alert + 必勾二次确认“已获本人/监护人授权”（validator 未勾拒提交，`consent` 仅前端不入库，编辑态不重复要求）（R-5）。新增 `Profile.test.tsx`（2 用例：新增态渲染提示与勾选框、编辑态不渲染）。Web `vitest run` 6 文件/**22 用例**全绿（前端 20→22）、`npm run build -w web` 绿。同步 `PIA-REPORT.md`：R-4/R-5 ❌/⚠️→✅已缓解（剩余风险中→低/低中）。**小程序端同类提示待补**（已如实标注）。未改后端/Prisma，不动任务计数（属 6.1.5 P1 整改） | JackHe |
| 2026-10-03 | PIA P1 隐私提示小程序端对齐（承接上一批次 R-4/R-5，三端合规收口）：将 Web 端已落地的两处提示同步至 uni-app 小程序——① `miniprogram/src/pages/upload/index.vue` AI 识别结果页顶部新增 warning 警示条“AI 结果仅供参考、不构成医学诊断、请逐项核对后保存”（R-4）；② `miniprogram/src/pages/family/index.vue` 添加成员表单新增授权声明提示条 + 必勾二次确认（`consented` ref，未勾时 `addMember` toast 阻断提交，新增成功或重置后回调 false）。小程序无自动化测试，以 `npm run build:mp-weixin` 编译校验（DONE，MP=0）。同步 `PIA-REPORT.md`：R-4/R-5 由“Web 已实现/小程序待补”→“Web+小程序双端已实现”（剩余风险 R-5 低中→低，小程序待办项划除）。未改后端/Prisma/Web，不动任务计数（属 6.1.5 P1 整改收口） | JackHe |
| 2026-10-03 | 敏感个人信息**单独同意**交互落地（**PIA P0 之 R-1 缓解**，Web+小程序双端）：登录页原本无任何同意勾选（印证 R-1 未落地）。新建可复用同意闸门：① Web `web/src/utils/sensitiveConsent.ts`（localStorage 键 healthConsent）+ `web/src/components/HealthDataConsentModal.tsx`（antd Modal，内嵌必勾 checkbox，“同意并继续”未勾禁用，附 `useSensitiveConsentGate()` hook：已同意直接放行、否则弹窗、同意后继续原动作）；接入 `Upload.tsx`（保存报告前）与 `Profile.tsx`（保存含过敏史/慢性病史等健康字段前），拒绝则中止。② 小程序 `miniprogram/src/utils/consent.ts`（受限于 uni.showModal 无法内嵌 checkbox，以显著提示文案+主动点“同意并继续”构成单独明示同意），接入 `upload/index.vue` saveResult。新增 `sensitiveConsent.test.ts`(3)+`HealthDataConsentModal.test.tsx`(2)；Web `vitest run` **8 文件/27 用例全绿**（前端 22→27）、`npm run build -w web` 绿；`npm run build:mp-weixin` DONE。同步 `PIA-REPORT.md`：R-1 ⚠️→✅双端已缓解（剩余风险高→低），**结论 P0 由两项收敛至仅剩 R-2 静态加密（6.1.6）**；TEST-REPORT 同步（合计 213→218 用例/35→37 文件）。未改后端/Prisma，不动任务计数（属 6.1.5 P0 整改，6.1.5 早已 ✅） | JackHe |
| 2026-10-03 | 数据访问审计日志实现（6.1.7 关账 ✅，PIA P0 之 R-3 缓解）：新增 `AuditLog` Prisma 模型（userId 可容分享匿名、action/resourceType/resourceId/ip/userAgent/success/meta/createdAt，(userId,createdAt)·(resourceType,resourceId) 两索引；不建 User 外键以保证注销/删除后审计留存）+ 手写迁移 `20261003000000_add_audit_log/migration.sql`（与现有迁移风格一致，本地无 DB 不跑 migrate，部署需 `prisma migrate deploy`）。先 `prisma generate`（GEN=0，client 含 AuditLog）。新建 `audit/` 特性：`@Audit(resourceType, action?)` 装饰器、`AuditService.record()`（try/catch 吞异常仅告警，不阻断主链路；空值归一 null、success 默认 true、meta 空转 undefined）、`AuditInterceptor`（全局 APP_INTERCEPTOR，Reflector.getAllAndOverride 读类/方法级元数据，无标记直接透传；action 缺省按 HTTP 方法推断 GET→READ/POST→CREATE/PUT·PATCH→UPDATE/DELETE→DELETE，元数据带 action 优先；tap 记 success=true，catchError 记 success=false+status 并 throwError 原样传播）。`AuditModule` 入 app.module；已对 report/diagnosis/medication/family-member/upload/user 类级、export 强制 EXPORT、share view 方法级 SHARE_VIEW 挂审计。新增 audit.service.spec(3)+audit.interceptor.spec(6)=9 用例；全量 `jest --coverage` **29 套件/191 用例全绿**（JEST=0），总覆盖率 89.07%→**89.36% Stmts**（audit 模块 92.85%）；`nest build` 绿。TEST-REPORT 同步（合计 202→211 用例/32→34 文件）；PIA-REPORT 将 R-3 改✅已缓解、结论 P0 三→两项。阶段六 13%→19%，已完成 68→69（总进度 54%→55%） | JackHe |
| 2026-10-03 | 健康数据 **AES-256 静态加密基座 + User 敏感字段纵切**（**PIA P0 之 R-2 部分缓解**，6.1.6 开启）：上轮已与用户确认密钥方案（env 单密钥 `DATA_ENCRYPTION_KEY` + 指定敏感字段列级加密）。新建加密基座：① `server/src/common/crypto/encryption-config.ts`——`resolveDataEncryptionKey()` 将任意长度口令经 SHA-256 归一为 32 字节 AES-256 密钥，沿用 `jwt-config.ts` 的 fail-fast 范式（设置了则用；生产缺失抛错拒启动；非生产缺失内置兜底+告警）；② `encryption.ts`——`encryptField`/`decryptField`/`isEncrypted`，AES-256-GCM，自描述 token `enc:v1:<base64(iv12|tag16|ct)>`（版本前缀便于后续轮换，解密时无前缀视为存量明文原样返回→迁移前后可读且 encrypt 幂等，GCM 自带认证标签→篡改解密抛错），null/空串透传。首条纵切接入 `User.allergyHistory`/`medicalHistory`（过敏史/慢性病史）：`user.service.updateProfile` 仅在被提交时写加密，`getUserById` 经新增 `decryptHealthFields` 解密（并顺手剔除 password）；`auth.sanitizeUser`（登录/刷新//auth/me 单一收敛点）统一解密。**未动用于索引/搜索/趋势的字段**（`ReportItem.value`、`Medication.drugName`、`Report.hospital`）以免破坏查询。新增 `encryption.spec.ts`+`encryption-config.spec.ts`（共 10 用例：往返/随机 IV/null与空串/幂等/存量明文兼容/篡改抛错/密钥归一与 fail-fast 三分支）+ `user.service.spec`(+3)·`auth.service.spec`(+1) 验证“写库为密文、返回为明文/存量明文透传”。全量 `jest --coverage` **31 套件/205 用例全绿**（JEST=0，后端 191→205），总覆盖率 89.36%→**89.85% Stmts**（`common/crypto` 模块 98% Stmts/100% Branch）；`nest build` 绿（BUILD=0）。`server/.env.example` 补 `DATA_ENCRYPTION_KEY` 说明（绝不入库/轮换会致存量密文不可解）。同步 `PIA-REPORT.md`：R-2 ❌→🔶分批落地（剩余风险高→中高），结论由“仅剩 R-2 尚未落地”改为“已进入分批整改、基座+User 字段已落”；`TEST-REPORT.md`（后端 17/138→19/151 单元 + 12/53→54 集成，合计 37→**39 文件/218→232 用例**）。**待后续批次**：`Report.summary`/`Diagnosis.complaint·diagnosisText·advice`/用药自由文本字段接入 + 存量明文一次性回填迁移脚本（本地无 DB，脚本可写、执行留部署环境）。**6.1.6 标 🔶 分批进行中（尚未完成），不计入已完成任务数**（总计数维 69/125） | JackHe |
| 2026-10-04 | **健康数据静态加密全量落地（6.1.6 关账 ✅，PIA P0 之 R-2 缓解）**：承接上批基座，将加密从“User 一条纵切”拓展至**全部目标敏感自由文本字段**。关键决策：因 `Report.summary`/`Diagnosis` 文本的**读取面高度分散**（列表/详情/搜索/首页概览 + `export.service` Excel/PDF + `share.service` 免登录查看均消费），逐点解密易漏某个出口而把密文暴露给客户端——改用**集中式 Prisma 中间件**（`common/crypto/prisma-encryption.ts`，`PrismaService` 构造函数内 `this.$use(createEncryptionMiddleware())`）对 `Report.summary`/`Diagnosis.complaint·diagnosisText·advice`/`Medication.notes` **写前加密、读后解密**，一次覆盖所有现有与未来读写路径；User 字段保留上批 service 层实现（不重复纳入中间件免二次加密）。中间件对 null/空串/存量明文/非目标模型/非写动作均安全透传，encryptField 幂等。新增 `prisma-encryption.spec.ts`（13 用例：写加密/读解密/upsert 分支/未提交不注入/非写动作与非目标模型跳过/数组与标量结果/存量明文透传/select 不含字段不新增 key/中间件端到端串联/幂等）。**行为变更（如实标注）**：`Report.summary` 密文化后无法再做 DB `contains` 模糊匹配，`report.service.search` 已从 OR 移除该字段（保留医院+指标名），对应更新 `report.service.spec` search 断言 OR 长 3→2。新增**存量明文一次性回填脚本** `src/scripts/backfill-encryption.ts`（裸 `new PrismaClient()` 不挂中间件避免反复转换、幂等跳过已加密行、含 User 字段、`process.loadEnvFile` 尽力加载 .env 兼容高低版本）+ npm 脚本 `db:backfill-encrypt`；脚本放 `src/scripts` 而非 `prisma/`（tsconfig 无 include，外部目录会抬高 tsc 推断 rootDir 破坏 `dist/main` 路径），并在 `jest.config.js` 的 `collectCoverageFrom` 排除 `!**/scripts/**`（无测脚本不进门禁）。全量 `jest --coverage` **32 套件/218 用例全绿**（JEST=0，后端 205→218），总覆盖率 89.85%→**89.66% Stmts**（`common/crypto` 整块 93.81% Stmts/89.06% Branch）；`nest build` 绿且确认 `dist/main.js` 仍存在。同步三文档：PIA R-2 🔶→✅（中高→低）、结论 P0 三项全部缓解✓（仅余律师终稿/部署注入密钥+回填/migrate deploy）；TEST-REPORT（unit 19/151→20/164，合计 39→**40 文件/245 用例**）；PROGRESS（6.1.6 🔶→✅、阶段六 19%→25%、已完成 69→70、总进度 55%→56%；1.2.14 标注“实际实现见 6.1.6”不重复计数）。**部署门槛**：上线前注入与 App 一致的 `DATA_ENCRYPTION_KEY` 并执行 `db:backfill-encrypt` | JackHe |
| 2026-10-04 | **审计增强（R-3 尾项，6.1.7 早已 ✅，本为增强不改任务计数）**：落地上批队列的 1️⃣——为已上线的数据访问审计补两块。①**登录成功/失败留痕**：`AuditService` 新增 `recordLogin()`（写 `action=LOGIN`/`resourceType=AUTH`，失败以 `maskIdentity()` 脱敏被尝试账号（手机号留前 3后 4、openId 留前 4）+ HTTP 状态码，便追溯爆破/枚举；委托 `record()`，绝对不抛、审计故障不阻断登录）+ `AuthController` 新增私有 `auditedLogin()` 包装，手机/密码/微信三入口统一留痕（从 `req` 取 ip/UA；register 不纳入登录审计，因重号拒并不属安全相关登录失败）；②**只读审计查询端点**：`AuditService.queryOwn()` + 新增 `AuditController`（`GET /audit/me`，`@UseGuards(JwtAuthGuard)`），**关键安全决策**：项目尚无 RBAC/管理员角色，而审计日志含跨用户访问记录（敏感运维数据）→ 贸然开全量管理端会越权泄露，因此仅开放【本人】维度（userId 由已鉴权 `req.user.userId` 强制注入、不接受外部传入，分页 pageSize≤100 + action/resourceType/success/时间范围过滤，对应数据主体知情权）；跨用户全量管理端查询待 RBAC 后开放（已如实标注为依赖项）。`AuditModule` 新增 `AuditController`；`AuthModule` 导入 `AuditModule`（为 AuthController 提供 AuditService）。新增 `audit.controller.spec`(2)+`auth.controller.spec`(6) + `audit.service.spec` 扩充（recordLogin 成功/失败、queryOwn 过滤/分页上限/时间范围/倒序、maskIdentity 3 用例）。全量 `jest --coverage` **34 套件/237 用例全绿**（JEST=0，后端 218→237），总覆盖率 89.66%→**90.36% Stmts**（audit 目录 95.55%、auth 98.96%）；`nest build` 绿（`dist/main.js` 完好）。同步 PIA R-3 行/描述补登录留痕+只读查询；TEST-REPORT 合计 40→**42 文件/245→264 用例**。未改 Prisma（复用现有 AuditLog 表，无新迁移） | JackHe |