# 可为健康平台 RBAC / 管理员角色体系设计方案

> 版本：v1 草案（Design Only — 不落地代码）
> 日期：2026-10-05
> 状态：待评审 · 待合规/业务方 sign-off · 待律师就 §9 隐私边界复核
> 责任：架构（JackHe）· 合规（PIA 负责人）

---

## 一、背景与目标

### 1.1 现状
本平台目前**完全未实现 RBAC**，所有已鉴权接口仅区分「登录/未登录」：

- `User` 表仅有 `status` 枚举（`ACTIVE`/`DISABLED`/`DELETED`），**无 role/permission 字段**（见 `server/prisma/schema.prisma` L16-45）。
- `JwtStrategy.validate` 返回 `{ userId, phone }`，无角色信息（`server/src/auth/jwt.strategy.ts` L16-22）。
- `JwtAuthGuard` 是裸 `AuthGuard('jwt')`，仅做 passport 校验，无授权分级（`server/src/auth/jwt-auth.guard.ts`）。
- 数据隔离靠**每个 service 手写 `where: { userId }`**，属"约定式越权防御"，缺集中授权层。
- 分享 token 通过 `scope='share'` 在 validate 内拒绝登录，属临时特例（`jwt.strategy.ts` L18）。

### 1.2 缺口（触发本设计的需求）
| 缺口 | 出处 | 影响 |
|------|------|------|
| PIA **R-3** 跨用户全量审计查询 | `PIA-REPORT.md` L73 | 监管/合规检查时无法提供平台级数据访问报表 |
| PIA **R-6** 跨用户全量分享管理 | `PIA-REPORT.md` L76 | 应急不良内容/泄露时无法集中撤销 |
| 等保三级"访问控制、最小权限" | `COMPLIANCE-ANALYSIS.md` L142 / `PRIVACY-POLICY.md` L106 | 上线测评 P0 |
| 客服/运营无后台 | PROGRESS 阶段七 | 用户支持只能读库改库 |
| 内部危险操作无审计 | 现有 AuditInterceptor 仅覆盖 C 端 | 无法追溯员工越权 |

### 1.3 目标（本方案要交付什么）
- **v1 目标**：一套最小可行的 RBAC，能解锁 PIA R-3/R-6 尾项、满足等保三级访问控制、支持内部 4 个基础角色；不追求企业级完整 RBAC。
- **本方案（本次交付）**：确定数据模型、权限矩阵、鉴权链路、接口清单、实施分期、风险与边界；**不写代码**，作为后续实现任务的输入。

---

## 二、范围与非目标

### 2.1 覆盖（v1 范围内）
- 内置角色（4 个，硬编码枚举）：`SUPER_ADMIN` / `OPERATOR` / `SUPPORT` / `AUDITOR`
- 权限清单（约 15 项，硬编码枚举）
- 角色 × 权限矩阵
- 后端 `RolesGuard` + `@Roles()` / `@Permissions()` 装饰器
- JWT payload 扩展 role/permission
- 管理端 HTTP 前缀 `/admin/*` 与其上具体端点
- Web 端「管理后台」侧边栏分组 + 路由守卫 + 403 页
- 管理操作强制走 `AuditLog`（扩展 `action=ADMIN_*` 前缀）
- 初始超管 seed 引导

### 2.2 不覆盖（v1 明确 out-of-scope）
- ❌ 客户自定义角色 / 权限（不做 DB 表动态角色）
- ❌ ABAC（属性基授权，如"同部门""同地域"）
- ❌ 多租户隔离（SaaS 化，本业务模型不需要）
- ❌ 外部 IdP / SSO / LDAP
- ❌ 小程序管理端（v1 后台仅 Web；小程序面向 C 端用户）
- ❌ 权限审批工作流（申请-审批）
- ❌ 时间窗授权 / 临时授权 / 会签
- ❌ API 网关层鉴权（应用层内解决，网关层待部署阶段另议）

---

## 三、角色模型

### 3.1 内置角色定义
| 角色 | code | 用途 | 预期人数 |
|------|------|------|---------|
| 超级管理员 | `SUPER_ADMIN` | 系统配置、授予角色、危险操作终审 | 1-3 |
| 运营 | `OPERATOR` | 内容/用户运营、查看统计、处理工单 | 2-5 |
| 客服 | `SUPPORT` | 查看单个用户基本信息与工单，不可读健康数据明文 | 3-10 |
| 审计员 | `AUDITOR` | 只读全量审计日志、导出合规报告 | 1-2 |

**说明**：
- 一个用户可挂**多角色**，权限取并集（v1 采用最简 OR 语义）。
- 角色为**内置硬编码**（`enum`），非 DB 动态维护，简化实现 + 便于代码静态审查。
- **不引入"普通用户"角色**——C 端用户走 `req.user.userId` 自隔离，与本 RBAC 并行；管理端点仅要求 role 命中矩阵。

### 3.2 权限清单（`Permission` 枚举）
按资源分组，动作粒度（v1 约 15 项，够覆盖已知缺口）：

| 组 | Permission code | 语义 |
|----|----------------|------|
| 用户 | `user:read` | 查看用户列表/详情（脱敏 PII） |
| 用户 | `user:update_status` | 启用/禁用账号 |
| 用户 | `user:impersonate` | ⚠️ 以用户身份临时登录（v1 不开放，P3 再谈） |
| 健康数据 | `health:read_meta` | 查看某用户的报告/诊断元数据（医院/日期/类型），不含明细 |
| 健康数据 | `health:read_full` | ⚠️ 查看含解密后的健康明细，需二次密码验证 + 理由字段 |
| 审计 | `audit:read_all` | 跨用户查看审计日志 |
| 审计 | `audit:export` | 导出合规报表 CSV/PDF |
| 分享 | `share:read_all` | 跨用户查看分享链接 |
| 分享 | `share:revoke_any` | 强制撤销任意分享链接（应急） |
| 订阅 | `subscription:read` | 查看订阅/订单 |
| 订阅 | `subscription:refund` | 触发退款（P2，支付网关对接后） |
| 配置 | `role:assign` | 给用户授予/撤销角色（仅 SUPER_ADMIN） |
| 配置 | `system:config` | 系统参数（保留期/加密密钥轮换等，P3） |

### 3.3 角色 × 权限矩阵
| Permission | SUPER_ADMIN | OPERATOR | SUPPORT | AUDITOR |
|-----------|:-----------:|:--------:|:-------:|:-------:|
| user:read | ✓ | ✓ | ✓ |   |
| user:update_status | ✓ | ✓ |   |   |
| user:impersonate | ⚠ 需工作流 |   |   |   |
| health:read_meta | ✓ | ✓ |   |   |
| health:read_full | ⚠ 需二次验证 |   |   |   |
| audit:read_all | ✓ |   |   | ✓ |
| audit:export | ✓ |   |   | ✓ |
| share:read_all | ✓ | ✓ |   |   |
| share:revoke_any | ✓ | ✓ |   |   |
| subscription:read | ✓ | ✓ | ✓ |   |
| subscription:refund | ✓ |   |   |   |
| role:assign | ✓ |   |   |   |
| system:config | ✓ |   |   |   |

**关键设计**：
- **客服默认不能读健康数据**（最小权限）：处理用户咨询仅需 `user:read`+`subscription:read`。
- **`health:read_full` 极敏感**：即使 SUPER_ADMIN 也需 step-up 二次验证（§9.2）+ 理由字段落 AuditLog。
- **`AUDITOR` 与 `OPERATOR` 职责分离**：审计员不改数据、运营不查审计（防掩盖）。

---

## 四、数据模型与迁移

### 4.1 Prisma Schema 提案
```prisma
enum Role {
  SUPER_ADMIN
  OPERATOR
  SUPPORT
  AUDITOR
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  role      Role
  grantedBy String?  // 授予者 userId（首次 seed 时为 null）
  grantedAt DateTime @default(now())
  revokedAt DateTime? // 软撤销，保留历史
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@index([userId])
  @@index([role])
}
```
**变更点**：
- `User` 增加 `roles UserRole[]` 关系。
- `UserRole` 用**软撤销**（`revokedAt`）保留历史，方便追溯"谁在何时被授予/撤销"（等保）。
- **不建 `Permission` 表**：权限清单是代码 enum，避免"数据 vs 代码"漂移；矩阵在 §3.3 硬编码进 `RBAC_MATRIX` 常量。
- 无外键指向 `AuditLog`（与既有 AuditLog 无 User 外键的策略一致，见记忆 b6b2e0c2）。

### 4.2 迁移
- 迁移文件：`prisma/migrations/2026xxxx_add_rbac/migration.sql`
- `CREATE TYPE "Role" AS ENUM (...); CREATE TABLE "UserRole" (...);`
- **不改动现有 `User` 表列**（无破坏性变更，只新增关联表）。
- 现有 CI `npm ci` + `prisma generate` 即可，无需回滚脚本。

### 4.3 Seed 引导
`prisma/seed.ts` 中新增：
```ts
const superAdminPhone = process.env.SUPERADMIN_PHONE;
if (superAdminPhone) {
  const u = await prisma.user.findUnique({ where: { phone: superAdminPhone } });
  if (u) await prisma.userRole.upsert({
    where: { userId_role: { userId: u.id, role: 'SUPER_ADMIN' } },
    create: { userId: u.id, role: 'SUPER_ADMIN' },
    update: {},
  });
}
```
- `SUPERADMIN_PHONE` env 未设 → seed 跳过（生产由部署时人工创建）
- **上线纪律**：seed 后**立即**删除或改空 env，避免二次执行造成意外授予。

---

## 五、鉴权链路

### 5.1 JWT Payload 扩展
**签发时**（`auth.service.ts` 三个 login 方法 + `refresh`）：
```json
{
  "sub": "<userId>",
  "phone": "<脱敏手机号或明文>",
  "roles": ["OPERATOR"],            // 新增：当前有效角色（revokedAt=null）
  "scope": undefined | "share"       // 保留原语义
}
```
- `roles` 在签发时从 `UserRole` 一次性查出并缓存进 token；权限变更**不强制品 token 失效**，靠短时 TTL（当前 7d 待议，可考虑降到 24h + refresh）。
- 若某角色被撤销且要立即生效 → 走 `user:update_status` 禁用账号 + 触发前端强制重登（v1 简单方案，v2 可加 jti 黑名单）。

**验证时**（`JwtStrategy.validate`）：
```ts
return { userId: payload.sub, phone: payload.phone, roles: payload.roles ?? [] };
```

### 5.2 Guard 链
| Guard | 作用 | 顺序 |
|-------|------|------|
| `ThrottlerGuard` | 全局限流 | 1（既有） |
| `JwtAuthGuard` | 校验 token、注入 `req.user` | 2（既有） |
| `RolesGuard` | 读 `@Roles()` / `@Permissions()` 元数据比对 | 3（**新增**） |
| `AuditInterceptor` | 记录读写留痕 | 4（既有拦截器，顺序在 guard 之后） |

`RolesGuard` 伪代码：
```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const requiredPerms = this.reflector.getAllAndMerge<Permission[]>('permissions', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndMerge<Role[]>('roles', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!requiredPerms.length && !requiredRoles.length) return true; // 无注解 → 放行
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new UnauthorizedException();
    const perms = expandRolesToPermissions(user.roles); // 查 §3.3 矩阵
    if (requiredRoles.some(r => !user.roles.includes(r)) &&
        !requiredPerms.every(p => perms.includes(p))) {
      throw new ForbiddenException('权限不足');
    }
    return true;
  }
}
```

### 5.3 装饰器
```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions('audit:read_all')          // 声明所需权限（推荐）
// 或 @Roles('SUPER_ADMIN', 'AUDITOR')   // 声明所需角色（简单场景）
@Get('admin/audit')
async queryAll(@Query() q: AuditQueryDto) { ... }
```
- 优先用 `@Permissions`，让矩阵演进不必改控制器代码。
- 二者可叠加，取 AND 语义（v1 简单）。

### 5.4 与分享 token 的边界
`jwt.strategy.ts` 已有 `payload.scope==='share'` 拒绝登录 → 保留。
分享 token 不带 `roles`，即使被塞进 `Authorization` 也只会命中"无 role → 权限不足"分支。

---

## 六、接口清单（管理端 `/admin/*`）

约定：所有管理端点前缀 `/admin`，独立 controller 目录 `server/src/admin/`；写操作**强制** `@Audit` 且 `resourceType=ADMIN`（新增）+ 理由字段。

| Method | Path | Permission | 说明 |
|--------|------|-----------|------|
| GET | `/admin/users` | `user:read` | 分页/关键词查用户（响应不含 password/明文健康字段/密码 hash） |
| GET | `/admin/users/:id` | `user:read` | 详情（脱敏 PII：手机号 mask、wx 隐藏） |
| PATCH | `/admin/users/:id/status` | `user:update_status` | ACTIVE↔DISABLED（不覆盖 DELETED） |
| GET | `/admin/users/:id/health-meta` | `health:read_meta` | 只读元数据（医院/日期/类型/数量），不解密 |
| GET | `/admin/users/:id/health-full` | `health:read_full` | ⚠️ 需 body.reason 非空 + header.x-stepup-token |
| GET | `/admin/audit` | `audit:read_all` | 跨用户审计查询（解锁 PIA R-3） |
| GET | `/admin/audit/export` | `audit:export` | 导出 xlsx/csv（✅ 已于 2026-10-06 落地：单次 10000 行硬上限+截断标注、导出行为自身落审计，解锁 PIA R-3 尾项） |
| GET | `/admin/shares` | `share:read_all` | 跨用户分享列表（解锁 PIA R-6） |
| DELETE | `/admin/shares/:id` | `share:revoke_any` | 强制撤销（应急不良内容） |
| GET | `/admin/subscriptions` | `subscription:read` | 订阅/订单列表（✅ 已于 2026-10-06 落地：GET /admin/subscriptions + /admin/orders，仅 SUPER_ADMIN/OPERATOR，跨用户分页+过滤+审计留痕） |
| POST | `/admin/users/:id/roles` | `role:assign` | 授予角色 |
| DELETE | `/admin/users/:id/roles/:role` | `role:assign` | 撤销角色 |

**响应字段脱敏纪律**（关键，v1 必须实现）：
- 任何 `/admin/users*` GET 响应**不得**包含：`password`（bcrypt hash）、`wxOpenId`、`wxUnionId`、明文 `allergyHistory`/`medicalHistory`（除非走 `health:read_full`）。
- 手机号统一 mask（`138****8888`）。

---

## 七、前端（Web）

### 7.1 认证上下文扩展
- `web/src/stores/auth.ts`（或对应 provider）：登录响应存 `user.roles: string[]` + `user.permissions: string[]`（后端展开好返回，前端不重复实现矩阵）。
- 新增 `hasPermission(perm)`、`hasAnyRole(...roles)` helper。

### 7.2 路由与菜单
- `App.tsx` 增管理路由组：`/admin/users`、`/admin/audit`、`/admin/shares`…
- `MainLayout` 侧边栏：若 `roles.length > 0` 显示"管理后台"分组（`SettingOutlined`/`TeamOutlined`/`AuditOutlined` 图标）；否则隐藏。
- 路由守卫 `AdminRoute`：进入前检查 `hasPermission`，失败重定向到 `/403`。
- 新增 `403.tsx`：无权限友好提示 + 返回。

### 7.3 组件
- `AccessRecords.tsx`（本人版）**不动**；新增 `admin/AllAudit.tsx`（跨用户版，含 userId 列 + 用户搜索）。
- `MyShares.tsx`（本人版）**不动**；新增 `admin/AllShares.tsx`。
- 危险操作（撤销任意分享 / 禁用账号 / 授予角色）→ `Modal.confirm` 二次确认 + 理由必填。

### 7.4 小程序
- v1 **不做**管理端 UI。理由：①审核风险（微信小程序类目对"企业内部工具"有限制）②移动端屏幕窄不适合作管理后台 ③客服/审计场景 PC 端更合适。
- 若后续需要"移动审批"，走独立小程序 + 二次验证，不共用 C 端小程序。

---

## 八、审计日志扩展

- `resourceType` 新增 `ADMIN`；`action` 沿用 READ/CREATE/UPDATE/DELETE + 特殊值 `ROLE_ASSIGN`/`ROLE_REVOKE`/`SHARE_REVOKE_ANY`/`USER_DISABLE`。
- `meta` 强制记：`actor.roles`（操作时角色快照）、`reason`（若端点要求）、`targetUserId`（被操作对象）。
- 管理端所有查询（即使 GET）也留痕（不同于 C 端"仅敏感读写留痕"），等保三级"操作行为可追溯"要求。
- `AuditLog.userId` 记**操作者**（管理员），`meta.targetUserId` 记被操作用户，两者独立。

---

## 九、安全与合规

### 9.1 最小权限与职责分离
- 每个角色只授必要权限（§3.3）。
- 授予角色需 `role:assign`（仅 SUPER_ADMIN）+ 落审计。
- **建议纪律**：`SUPER_ADMIN` ≤3 人，且**不允许**同一人兼任 SUPPORT（防自审自改）。

### 9.2 危险操作 step-up 二次验证
`health:read_full` / `user:update_status` / `role:assign` 等敏感动作，除常规 JWT 外**额外**要求 header `x-stepup-token`：
- 前端点击危险按钮 → 弹密码重输框 → `POST /auth/stepup`（校验当前密码）→ 返回 5min TTL 短 token → 附在真实请求 header。
- v1 起步可先落 `role:assign` 一处，其他按 P1/P2 补上。
- **【RBAC P2 已落地（2026-10-05）】**：`POST /auth/stepup` 签发 `typ:stepup` 5min TTL 短 token；`StepUpGuard`（`@RequireStepUp()` opt-in）已挂 4 个危险管理端点（用户启停 / 角色授予 / 角色撤销 / 跨用户强撤）；Web 端 `utils/stepup.tsx` 密码弹窗 + sessionStorage 5min 缓存。本批采用无状态短 token（**无 jti 黑名单**），5min TTL 兜底自然过期即失效；即时吊销 defer v2（见 §十三 13.3）。`health:read_full` 端点属 P3，尚未落地，不在本批 step-up 覆盖范围内。

### 9.3 敏感数据边界
- 管理员**永远不能**看到 bcrypt 密码 hash（controller 层 select 排除）。
- 健康数据明文解密只在 `health:read_full` 端点内触发，且要求 reason；service 层集中式 Prisma 中间件解密照常工作，controller 输出前手动脱敏。
- **PIA 复核项**：§9.3 边界文案需律师确认（是否构成"未同意的二次使用"，或需更新隐私政策"为提供客服支持 / 履行法定义务"处理合法性依据）。

### 9.4 权限提升 / 异常检测
- 每次 role 授予落 `AuditLog(action=ROLE_ASSIGN)`；查询某用户全部 `ROLE_*` 事件即成"权限变更履历"。
- 管理端点单点登录失败/频繁 403 → 现有 ThrottlerGuard + 登录留痕（记忆 0b386f8f）覆盖，v2 可加告警。

### 9.5 与既有控制的衔接
| 既有控制 | 关系 |
|---------|------|
| ThrottlerGuard 全局限流 | 保留，管理端点可选加更严 rate-limit |
| JwtStrategy 拒绝 scope=share | 保留 |
| `assertActive()` 校验 status | 保留，禁用账号即刻无法进入管理端 |
| 集中式 Prisma 加解密中间件 | 保留，controller 出参前手动脱敏 |
| CORS/env fail-fast | 保留 |

---

## 十、实施分期与工作量估算

| 阶段 | 内容 | 估算 | 依赖 |
|------|------|------|------|
| **P0** | Schema + 迁移 + seed；`RolesGuard` + `@Permissions`/`@Roles`；JWT payload 扩展；首个端到端解锁点：`GET /admin/audit`（对应 PIA R-3）+ 单测/e2e；Web `AllAudit.tsx` + 侧边栏动态显示 + 403 页 | 3-4 天 | 本方案 review 通过（✅ 已于 2026-10-05 落地） |
| **P1** | 用户管理端点（`/admin/users*`）+ 分享管理端点（`/admin/shares*`，解锁 PIA R-6 尾项）+ 各自 Web UI | 3-4 天 | P0（✅ 已于 2026-10-05 落地） |
| **P2** | `role:assign` + `x-stepup-token` 二次验证 + 权限变更履历页 | 3-5 天 | P1（✅ 已于 2026-10-05 落地：step-up 短 token + `StepUpGuard` 挂 4 危险端点 + `/admin/permission-history` 履历页） |
| **P3** | `subscription:read` / `refund`（对接支付网关退款）/ `health:read_full`（律师 sign-off 后再做）/ `system:config` | 待定 | 外部条件（支付网关能力、隐私政策终稿）（已落地 2026-10-06：① `audit:export` 审计导出 xlsx/csv；② `subscription:read` + `order:read` 跨用户订阅/订单管理端点 + Web 页。余 refund / health:read_full / system:config 待外部条件） |

**每阶段验收**：本地全量 jest + nest build + web vitest + web build + 小程序 build（若涉及）+ CI 绿灯；PIA/PROGRESS 文档同步。

---

## 十一、风险与开放问题

| # | 风险 / 问题 | 建议处置 |
|---|-----------|---------|
| R1 | Bootstrap：初始 SUPER_ADMIN 由 seed 创建，若 env 泄漏可被抢注 | seed 后立即清空 env；生产用部署手册要求人工创建 |
| R2 | JWT TTL 7d 期间角色变更不能即时生效 | 视风险接受度决定：P0 保留 7d + 强制禁用账号即刻失效；P2 考虑 jti 黑名单或 refresh flow（**P2 实际落地采折中方案：step-up 短 token 5min TTL 自然过期兜底，jti 黑名单仍 defer v2**） |
| R3 | 权限矩阵硬编码，未来加权限要发版 | 可接受（v1 权限项少，静态审计友好）；若变多再迁 DB |
| R4 | `health:read_full` 隐私边界 | 需律师复核；隐私政策终稿要新增"为提供客户支持/履行法定义务"处理依据条款（PIA 尾项） |
| R5 | 与会员 Plan 权益混淆 | 明确：**Plan ≠ Role**。Plan 决定 C 端功能配额（AI 次数/家庭人数），Role 决定管理后台权限；两套互不影响 |
| R6 | 管理端点被扫库/暴力破解 | ThrottlerGuard 全局限流兜底；管理端 IP 白名单（VPN/内网）作为部署项，不进代码 |
| R7 | 小程序 C 端误入管理路由 | Web 独立路径 `/admin/*`，小程序无 admin 入口；后端 `/admin/*` 端点即使被 C 端调也会被 RolesGuard 403 |

---

## 十二、验收标准（Definition of Done）

- [ ] 数据模型：`Role` 枚举 + `UserRole` 表 + `prisma migrate deploy` 通过；seed 在 `SUPERADMIN_PHONE` 设置下正确授予
- [ ] 鉴权：`JwtStrategy` 返回 `roles`；`RolesGuard` 单测覆盖"无注解放行 / 角色不足 403 / 权限不足 403 / 权限足够放行"4 用例
- [ ] 端点：首个 `/admin/audit` e2e（AUDITOR 可查、SUPPORT 403、未登录 401、分享 token 401）
- [ ] 审计：管理端点调用留痕，`resourceType=ADMIN`、`meta.actorRoles`、`meta.targetUserId` 齐备
- [ ] Web：登录后按 `roles` 动态显隐"管理后台"；无权限进入 `/admin/*` 落 `/403`
- [ ] 文档：`PROGRESS-TRACKER.md` 相关任务项状态从"待 RBAC"更新为"已 RBAC 落地"；`PIA-REPORT.md` R-3/R-6 充分性表关闭对应尾项
- [ ] 覆盖率：新增代码 `jest --coverage` 单测 Stmts ≥80%、e2e 关键路径全覆盖
- [ ] CI：三端 build + 全量测试绿灯

---

## 十三、附录

### 13.1 参考：既有代码中的相关锚点
- `server/src/auth/jwt.strategy.ts` — validate 返回值需扩展 roles
- `server/src/auth/auth.service.ts` — 三处 login 签发 payload 处需带 roles
- `server/src/audit/audit.controller.ts` L10-12 — 现有注释「待 RBAC 落地后开放」即本方案的 P0 首个解锁点
- `server/src/app.module.ts` — 需注册 `AdminModule`
- `web/src/stores/auth.ts` — 前端存 roles/permissions
- `web/src/layouts/MainLayout.tsx` — 侧边栏动态显隐挂载点

### 13.2 相关记忆
- 记忆 `b6b2e0c2`：AuditLog 无 User 外键，与本次 UserRole 保留历史一致
- 记忆 `0b386f8f`：AuditLog append-only，不因 RBAC 变更
- 记忆 `d7fdac12`：Web 页面挂载规范（管理页沿用 lazy + MainLayout 菜单）

### 13.3 后续讨论项（明确 defer）
- 是否引入 jti 黑名单支持"立即撤销某 token"（性能 vs 一致性权衡）
- 多因子认证（MFA/TOTP）作为 `stepup` 的替代或补强
- 客户方自定义角色与权限（DB 表 + 管理 UI）
- SSO / 企业微信集成（若内部运营需求变化）

---

## 十四、评审与签署

| 角色 | 姓名 | 状态 |
|------|------|------|
| 架构 / 主开发 | JackHe | 待自评 |
| 合规（PIA 负责人） | 待指派 | 待复核 §9.3 隐私边界 |
| 律师（外部） | 待指派 | 隐私政策终稿时新增"处理依据"条款（R4） |
| 运维 / 部署 | JackHe 兼任 | 关注 R1/R6 |

**评审通过后**：拆 P0/P1/P2 到 `PROGRESS-TRACKER.md` 阶段七或新阶段，进入实施。
