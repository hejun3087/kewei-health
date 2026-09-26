# 可为健康 — 系统设计方案

> 版本：v1.0
> 日期：2026-09-26
> 基于：PRD v1.0（全部开放问题已关闭）

---

## 目录

1. [系统架构设计](#一系统架构设计)
2. [数据库详细设计](#二数据库详细设计)
3. [API接口设计](#三api接口设计)
4. [AI识别流程设计](#四ai识别流程设计)
5. [会员权限系统设计](#五会员权限系统设计)
6. [安全设计](#六安全设计)
7. [缓存策略设计](#七缓存策略设计)
8. [文件存储设计](#八文件存储设计)
9. [部署架构设计](#九部署架构设计)

---

## 一、系统架构设计

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                  │
├─────────────────────┬─────────────────────┬─────────────────────
│   微信小程序         │   Web前端            │   移动App（后期）    │
│   uni-app + Vue3    │   React + Ant Design│   React Native      │
│                     │                     │                     │
│  • 拍照/相册上传     │  • 报告管理          │  • 完整功能          │
│  • 报告查看          │  • 趋势分析          │  • 推送通知          │
│  • 用药提醒          │  • 数据导出          │                     │
└─────────┬───────────┴─────────┬───────────┴─────────┬───────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │ HTTPS
┌──────────────────────────────────────────────────────────────────┐
│                        API网关层                                   │
│  ┌─────────────────────────────────────────────────────────────  │
│  │  Nginx（反向代理 + 负载均衡 + SSL终止）                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────────┐
│                        应用服务层                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  NestJS API Server                                          │  │
│  │                                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │ 认证模块  │ │ 用户模块  │ │ 报告模块  │ │ 诊断模块  │      │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  │  ┌────────── ┌──────────┐ ┌────────── ┌──────────┐      │  │
│  │  │ 用药模块  │ │ 上传模块  │ │ AI模块   │ │ 会员模块  │      │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
───────────────────────────────┼───────────────────────────────────┐
│                        数据层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL   │  │    Redis     │  │   对象存储（OSS）     │   │
│  │  (主数据库)   │  │  (缓存/会话)  │  │  (图片/文件存储)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| **Web前端** | React 18 + Vite + Ant Design 5 | 生态成熟、组件丰富、开发效率高 |
| **小程序** | uni-app + Vue3 + Pinia | 一套代码多端运行、Vue生态 |
| **后端框架** | NestJS 10 | TypeScript全栈、模块化、企业级 |
| **ORM** | Prisma 5 | 类型安全、迁移工具完善、开发体验好 |
| **数据库** | PostgreSQL 16 | 功能强大、JSON支持好、免费开源 |
| **缓存** | Redis 7（前期用内存缓存） | 高性能、数据结构丰富 |
| **对象存储** | 阿里云OSS（前期本地磁盘） | 高可靠、CDN集成、按量付费 |
| **AI服务** | 百度OCR + 通义千问（前期规则提取） | 国内合规、免费额度充足 |
| **容器化** | Docker + Docker Compose | 环境一致性、部署简便 |
| **反向代理** | Nginx | 高性能、SSL终止、负载均衡 |

### 1.3 模块划分

```
server/src/
── auth/              # 认证模块（登录/注册/JWT）
── user/              # 用户模块（个人信息管理）
├── family-member/     # 家庭成员模块
├── report/            # 检查报告模块
├── diagnosis/         # 诊断记录模块
├── medication/        # 用药记录模块
├── upload/            # 文件上传模块
├── ai/                # AI识别模块
├── subscription/      # 会员订阅模块
── notification/      # 通知模块（后期）
└── common/            # 公共模块（拦截器/过滤器/工具）
```

---

## 二、数据库详细设计

### 2.1 ER关系图

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    User      │       │  FamilyMember    │       │   User       │
│──────────────│       │──────────────────│       │──────────────│
│ id (PK)      │──┬───→│ id (PK)          │       │ id (PK)      │
│ phone        │  │    │ userId (FK)      │──┬───→│              │
│ password     │  │    │ name             │  │    └──────────────┘
│ nickname     │  │    │ relation         │  │
│ avatar       │  │    │ gender           │  │    ┌──────────────┐
│ birthday     │  │    │ birthday         │  │    │   User       │
│ height       │  │    │ height           │  │    │──────────────│
│ weight       │  │    │ weight           │  │    │ id (PK)      │
│ allergyHistory│ │    │ avatar           │  │    │              │
│ chronicHistory│ │    └──────────────────┘  │    └──────────────┘
──────────────┘  │                          │
     │            │                          │
     │            │    ┌──────────────────┐  │    ┌──────────────┐
     │            │    │    Report        │  │    │  Diagnosis   │
     │            └───→│──────────────────│  │    │──────────────│
     │                 │ id (PK)          │  │    │ id (PK)      │
     │                 │ userId (FK)      │──┘    │ userId (FK)  │
     │                 │ memberId (FK)    │       │ memberId (FK)│
     │                 │ reportType       │       │ visitDate    │
     │                 │ hospital         │       │ hospital     │
     │                 │ visitDate        │       │ department   │
     │                 │ department       │       │ doctor       │
     │                 │ doctor           │       │ complaint    │
     │                 │ diagnosis        │       │ diagnosisText│
     │                 │ advice           │       │ advice       │
     │                 │ nextVisitDate    │       │ status       │
     │                 │ status           │       └──────────────┘
     │                 └──────────────────┘              │
     │                          │                        │
     │                 ┌──────────────────┐              │
     │                 │  ReportImage     │              │
     │                 │──────────────────│              │
     │                 │ id (PK)          │              │
     │                 │ reportId (FK)    │              │
     │                 │ imageUrl         │              │
     │                 │ thumbnailUrl     │              │
     │                 │ sortOrder        │              │
     │                 └──────────────────┘              │
     │                                                  │
     │    ┌──────────────────┐              ┌──────────────────┐
     │    │   Medication     │              │  DiagnosisImage  │
     │    │──────────────────│              │──────────────────│
     │    │ id (PK)          │              │ id (PK)          │
     │    │ userId (FK)      │              │ diagnosisId (FK) │
     │    │ memberId (FK)    │              │ imageUrl         │
     │    │ medicationName   │              │ thumbnailUrl     │
     │    │ dosage           │              │ sortOrder        │
     │    │ frequency        │              └──────────────────┘
     │    │ startDate        │
     │    │ endDate          │
     │    │ status           │
     │    └──────────────────
     │
     │    ┌──────────────────┐
     │    │  Subscription    │
     │    │──────────────────│
     │    │ id (PK)          │
     │    │ userId (FK)      │
     │    │ planType         │
     │    │ startDate        │
     │    │ endDate          │
     │    │ status           │
     │    │ paymentMethod    │
     │    └──────────────────┘
```

### 2.2 表结构详细设计

#### 2.2.1 User（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 用户ID |
| phone | String (20) | Unique, Not Null | 手机号 |
| password | String (255) | Not Null | 密码（bcrypt加密） |
| nickname | String (50) | | 昵称 |
| avatar | String (500) | | 头像URL |
| gender | Gender | | 性别 |
| birthday | DateTime | | 出生日期 |
| height | Decimal(5,2) | | 身高(cm) |
| weight | Decimal(5,2) | | 体重(kg) |
| allergyHistory | Text | | 过敏史 |
| chronicHistory | Text | | 慢性病史 |
| status | UserStatus | Default: ACTIVE | 用户状态 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

#### 2.2.2 FamilyMember（家庭成员表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 成员ID |
| userId | String (UUID) | FK → User, Not Null | 所属用户 |
| name | String (50) | Not Null | 姓名 |
| relation | MemberRelation | Not Null | 与用户关系 |
| gender | Gender | | 性别 |
| birthday | DateTime | | 出生日期 |
| height | Decimal(5,2) | | 身高(cm) |
| weight | Decimal(5,2) | | 体重(kg) |
| avatar | String (500) | | 头像URL |
| remark | String (200) | | 备注 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

**索引**：
- `idx_user_id`: userId（查询用户的家庭成员）

#### 2.2.3 Report（检查报告表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 报告ID |
| userId | String (UUID) | FK → User, Not Null | 所属用户 |
| memberId | String (UUID) | FK → FamilyMember | 所属成员 |
| reportType | ReportType | Not Null | 报告类型 |
| hospital | String (100) | | 医院名称 |
| visitDate | DateTime | Not Null | 就诊日期 |
| department | String (50) | | 科室 |
| doctor | String (50) | | 医生 |
| diagnosis | String (500) | | 诊断结果 |
| advice | Text | | 医嘱建议 |
| nextVisitDate | DateTime | | 下次就诊日期 |
| status | ReportStatus | Default: PENDING | 报告状态 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

**索引**：
- `idx_user_id`: userId
- `idx_member_id`: memberId
- `idx_visit_date`: visitDate（按日期查询）
- `idx_report_type`: reportType（按类型筛选）

#### 2.2.4 ReportImage（报告图片表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 图片ID |
| reportId | String (UUID) | FK → Report, Not Null | 所属报告 |
| imageUrl | String (500) | Not Null | 图片URL |
| thumbnailUrl | String (500) | | 缩略图URL |
| sortOrder | Int | Default: 0 | 排序序号 |
| fileSize | Int | | 文件大小(bytes) |
| createdAt | DateTime | Default: now() | 创建时间 |

**索引**：
- `idx_report_id`: reportId

#### 2.2.5 Diagnosis（诊断记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 诊断ID |
| userId | String (UUID) | FK → User, Not Null | 所属用户 |
| memberId | String (UUID) | FK → FamilyMember | 所属成员 |
| visitDate | DateTime | Not Null | 就诊日期 |
| hospital | String (100) | | 医院名称 |
| department | String (50) | | 科室 |
| doctor | String (50) | | 医生 |
| complaint | Text | | 主诉 |
| diagnosisText | Text | | 诊断内容 |
| diagnosisCode | String (20) | | ICD-10编码 |
| advice | Text | | 医嘱建议 |
| nextVisitDate | DateTime | | 下次就诊日期 |
| status | DiagnosisStatus | Default: PENDING | 状态 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

**索引**：
- `idx_user_id`: userId
- `idx_member_id`: memberId
- `idx_visit_date`: visitDate

#### 2.2.6 DiagnosisImage（诊断图片表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 图片ID |
| diagnosisId | String (UUID) | FK → Diagnosis, Not Null | 所属诊断 |
| imageUrl | String (500) | Not Null | 图片URL |
| thumbnailUrl | String (500) | | 缩略图URL |
| sortOrder | Int | Default: 0 | 排序序号 |
| fileSize | Int | | 文件大小(bytes) |
| createdAt | DateTime | Default: now() | 创建时间 |

**索引**：
- `idx_diagnosis_id`: diagnosisId

#### 2.2.7 Medication（用药记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 用药ID |
| userId | String (UUID) | FK → User, Not Null | 所属用户 |
| memberId | String (UUID) | FK → FamilyMember | 所属成员 |
| medicationName | String (100) | Not Null | 药品名称 |
| dosage | String (50) | | 用量 |
| frequency | String (50) | | 频次 |
| route | String (50) | | 给药途径 |
| startDate | DateTime | Not Null | 开始日期 |
| endDate | DateTime | | 结束日期 |
| status | MedicationStatus | Default: ACTIVE | 状态 |
| remark | Text | | 备注 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

**索引**：
- `idx_user_id`: userId
- `idx_member_id`: memberId
- `idx_status`: status（查询当前用药）

#### 2.2.8 Subscription（订阅记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 订阅ID |
| userId | String (UUID) | FK → User, Not Null | 所属用户 |
| planType | PlanType | Not Null | 套餐类型 |
| billingCycle | BillingCycle | Not Null | 计费周期 |
| startDate | DateTime | Not Null | 开始日期 |
| endDate | DateTime | Not Null | 结束日期 |
| status | SubscriptionStatus | Default: ACTIVE | 状态 |
| paymentMethod | PaymentMethod | | 支付方式 |
| amount | Decimal(10,2) | | 支付金额 |
| createdAt | DateTime | Default: now() | 创建时间 |
| updatedAt | DateTime | Default: now() | 更新时间 |

**索引**：
- `idx_user_id`: userId
- `idx_status`: status
- `idx_end_date`: endDate（查询即将到期订阅）

### 2.3 枚举类型定义

```typescript
// 用户状态
enum UserStatus {
  ACTIVE        // 正常
  DISABLED      // 禁用
  DELETED       // 已删除
}

// 性别
enum Gender {
  MALE          // 男
  FEMALE        // 女
  UNKNOWN       // 未知
}

// 成员关系
enum MemberRelation {
  SELF          // 本人
  SPOUSE        // 配偶
  CHILD         // 子女
  PARENT        // 父母
  GRANDPARENT   // 祖父母
  OTHER         // 其他
}

// 报告类型
enum ReportType {
  BLOOD_TEST    // 血液检查
  URINE_TEST    // 尿液检查
  IMAGING       // 影像检查
  ECG           // 心电图
  ULTRASOUND    // 超声检查
  PATHOLOGY     // 病理检查
  OTHER         // 其他
}

// 报告状态
enum ReportStatus {
  PENDING       // 待识别
  RECOGNIZED    // 已识别
  CONFIRMED     // 已确认
  REJECTED      // 已拒绝
}

// 诊断状态
enum DiagnosisStatus {
  PENDING       // 待确认
  CONFIRMED     // 已确认
  REJECTED      // 已拒绝
}

// 用药状态
enum MedicationStatus {
  ACTIVE        // 使用中
  COMPLETED     // 已完成
  DISCONTINUED  // 已停用
}

// 订阅套餐类型
enum PlanType {
  FREE          // 免费版
  STANDARD      // 标准版
  PROFESSIONAL  // 专业版
  FAMILY        // 家庭版
}

// 计费周期
enum BillingCycle {
  MONTHLY       // 月付
  YEARLY        // 年付
}

// 订阅状态
enum SubscriptionStatus {
  ACTIVE        // 有效
  EXPIRED       // 已过期
  CANCELLED     // 已取消
  PENDING       // 待支付
}

// 支付方式
enum PaymentMethod {
  WECHAT_PAY    // 微信支付
  ALIPAY        // 支付宝
}
```

---

## 三、API接口设计

### 3.1 接口规范

**Base URL**: `https://api.kewei-health.com/v1`

**请求格式**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

**响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2026-09-26T10:00:00Z"
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "参数错误",
  "errors": [
    {
      "field": "phone",
      "message": "手机号格式不正确"
    }
  ],
  "timestamp": "2026-09-26T10:00:00Z"
}
```

### 3.2 认证模块 API

#### POST /auth/register
注册账号

**请求**:
```json
{
  "phone": "13800138000",
  "password": "password123",
  "smsCode": "123456"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "user": {
      "id": "uuid",
      "phone": "138****8000",
      "nickname": null
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /auth/login
登录

**请求**:
```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

#### POST /auth/login/wechat
微信登录

**请求**:
```json
{
  "code": "wechat_auth_code"
}
```

#### POST /auth/sms/send
发送短信验证码

**请求**:
```json
{
  "phone": "13800138000",
  "type": "REGISTER"  // REGISTER | LOGIN | RESET_PASSWORD
}
```

#### POST /auth/password/reset
重置密码

**请求**:
```json
{
  "phone": "13800138000",
  "smsCode": "123456",
  "newPassword": "newpassword123"
}
```

### 3.3 用户模块 API

#### GET /user/profile
获取个人信息

#### PUT /user/profile
更新个人信息

**请求**:
```json
{
  "nickname": "Jack",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "height": 175.5,
  "weight": 70.0,
  "allergyHistory": "青霉素过敏",
  "chronicHistory": "高血压"
}
```

#### PUT /user/avatar
更新头像

### 3.4 家庭成员模块 API

#### GET /family-members
获取家庭成员列表

#### POST /family-members
添加家庭成员

**请求**:
```json
{
  "name": "张三",
  "relation": "PARENT",
  "gender": "MALE",
  "birthday": "1965-05-15",
  "height": 170.0,
  "weight": 65.0
}
```

#### PUT /family-members/:id
更新家庭成员

#### DELETE /family-members/:id
删除家庭成员

### 3.5 报告模块 API

#### GET /reports
获取报告列表

**查询参数**:
```
?memberId=uuid&reportType=BLOOD_TEST&startDate=2026-01-01&endDate=2026-12-31&page=1&pageSize=20
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "reportType": "BLOOD_TEST",
        "hospital": "北京协和医院",
        "visitDate": "2026-09-20",
        "department": "内科",
        "doctor": "李医生",
        "status": "CONFIRMED",
        "images": [
          {
            "id": "uuid",
            "imageUrl": "https://oss.example.com/reports/xxx.jpg",
            "thumbnailUrl": "https://oss.example.com/reports/xxx_thumb.jpg"
          }
        ]
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

#### GET /reports/:id
获取报告详情

#### POST /reports
创建报告（含图片上传）

**请求** (multipart/form-data):
```
reportType: BLOOD_TEST
hospital: 北京协和医院
visitDate: 2026-09-20
department: 内科
doctor: 李医生
images: [file1, file2, file3]
```

#### PUT /reports/:id
更新报告

#### DELETE /reports/:id
删除报告（软删除）

#### GET /reports/:id/trend
获取指标趋势数据

**响应**:
```json
{
  "code": 200,
  "data": {
    "indicators": [
      {
        "name": "白细胞计数",
        "unit": "10^9/L",
        "referenceRange": "4.0-10.0",
        "dataPoints": [
          {
            "date": "2026-01-15",
            "value": 6.5,
            "status": "NORMAL"
          },
          {
            "date": "2026-06-20",
            "value": 11.2,
            "status": "HIGH"
          }
        ]
      }
    ]
  }
}
```

### 3.6 诊断模块 API

#### GET /diagnoses
获取诊断列表

#### GET /diagnoses/:id
获取诊断详情

#### POST /diagnoses
创建诊断记录

#### PUT /diagnoses/:id
更新诊断记录

#### DELETE /diagnoses/:id
删除诊断记录

### 3.7 用药模块 API

#### GET /medications
获取用药列表

**查询参数**:
```
?memberId=uuid&status=ACTIVE&page=1&pageSize=20
```

#### GET /medications/:id
获取用药详情

#### POST /medications
创建用药记录

#### PUT /medications/:id
更新用药记录

#### DELETE /medications/:id
删除用药记录

### 3.8 上传模块 API

#### POST /upload/image
上传图片

**请求** (multipart/form-data):
```
file: [binary]
type: REPORT | DIAGNOSIS | AVATAR
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "url": "https://oss.example.com/uploads/2026/09/26/xxx.jpg",
    "thumbnailUrl": "https://oss.example.com/uploads/2026/09/26/xxx_thumb.jpg",
    "size": 1024000
  }
}
```

### 3.9 AI模块 API

#### POST /ai/recognize-report
识别报告图片

**请求**:
```json
{
  "imageUrls": ["https://oss.example.com/xxx.jpg"],
  "reportType": "BLOOD_TEST"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "reportType": "BLOOD_TEST",
    "hospital": "北京协和医院",
    "visitDate": "2026-09-20",
    "department": "内科",
    "indicators": [
      {
        "name": "白细胞计数",
        "value": 6.5,
        "unit": "10^9/L",
        "referenceRange": "4.0-10.0",
        "status": "NORMAL",
        "confidence": 0.95
      }
    ],
    "diagnosis": "未见异常",
    "advice": "定期复查"
  }
}
```

#### POST /ai/recognize-diagnosis
识别诊断记录

#### POST /ai/recognize-medication
识别用药记录

### 3.10 会员订阅模块 API

#### GET /subscription/plan
获取套餐信息

**响应**:
```json
{
  "code": 200,
  "data": {
    "currentPlan": {
      "type": "FREE",
      "endDate": null,
      "quotas": {
        "monthlyRecognitions": 50,
        "usedRecognitions": 35,
        "remainingRecognitions": 15,
        "maxFamilyMembers": 1,
        "storageLimit": 1073741824
      }
    },
    "availablePlans": [
      {
        "type": "STANDARD",
        "monthlyPrice": 1200,
        "yearlyPrice": 10800,
        "features": ["200次/月识别", "5个家庭成员", "完整趋势图", "数据导出"]
      }
    ]
  }
}
```

#### POST /subscription/create
创建订阅

#### POST /subscription/cancel
取消订阅

#### POST /subscription/upgrade
升级套餐

#### GET /subscription/history
获取订阅历史

---

## 四、AI识别流程设计

### 4.1 整体流程

```
用户上传图片
     │
     ▼
┌─────────────────┐
│  图片预处理      │
│  • 压缩          │
│  • 旋转校正      │
│  • 增强对比度    │
└────────┬────────
         │
         ▼
┌─────────────────┐
│  OCR文字识别     │
│  (百度OCR)       │
│  • 免费额度5万次/月│
│  • 返回文字+位置  │
└────────┬────────┘
         │
         ▼
┌─────────────────
│  结构化提取      │
│  (前期：规则引擎) │
│  (后期：大模型)   │
│  • 指标名称      │
│  • 数值+单位     │
│  • 参考范围      │
│  • 异常标记      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  置信度评估      │
│  • 高置信度(>90%)│ → 自动确认
│  • 中置信度(70-90%)│ → 标记待确认
│  • 低置信度(<70%) │ → 标记需手动修正
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  用户确认/修正   │
│  • 展示识别结果  │
│  • 高亮低置信度项│
│  • 支持手动修改  │
────────┬────────┘
         │
         ▼
┌─────────────────┐
│  保存到数据库    │
│  • 报告记录      │
│  • 指标数据      │
│  • 图片关联      │
└─────────────────┘
```

### 4.2 规则引擎设计（前期）

```typescript
// 常见指标正则匹配规则
const indicatorPatterns = [
  {
    name: '白细胞计数',
    pattern: /白细胞(?:计数)?[：:]\s*([\d.]+)\s*(10\^?9\/L|×10\^9\/L)/i,
    unit: '10^9/L',
    referenceRange: [4.0, 10.0]
  },
  {
    name: '红细胞计数',
    pattern: /红细胞(?:计数)?[：:]\s*([\d.]+)\s*(10\^?12\/L|×10\^12\/L)/i,
    unit: '10^12/L',
    referenceRange: [4.0, 5.5]
  },
  {
    name: '血红蛋白',
    pattern: /血红蛋白[：:]\s*([\d.]+)\s*(g\/L|g\/l)/i,
    unit: 'g/L',
    referenceRange: [120, 160]
  },
  // ... 更多指标规则
];

// 异常状态判断
function determineStatus(value: number, range: [number, number]): 'LOW' | 'NORMAL' | 'HIGH' {
  if (value < range[0]) return 'LOW';
  if (value > range[1]) return 'HIGH';
  return 'NORMAL';
}
```

### 4.3 大模型提取设计（后期）

```typescript
// 通义千问 Prompt 设计
const reportExtractionPrompt = `
请从以下医疗检查报告文字中提取结构化数据。

报告内容：
{ocr_text}

请提取以下信息并以JSON格式返回：
1. 医院名称
2. 就诊日期
3. 科室
4. 检查项目列表，每个项目包含：
   - 项目名称
   - 检测值
   - 单位
   - 参考范围
   - 异常状态（偏低/正常/偏高）

JSON格式：
{
  "hospital": "医院名称",
  "visitDate": "YYYY-MM-DD",
  "department": "科室",
  "indicators": [
    {
      "name": "指标名称",
      "value": 数值,
      "unit": "单位",
      "referenceRange": "参考范围",
      "status": "LOW|NORMAL|HIGH"
    }
  ]
}
`;
```

---

## 五、会员权限系统设计

### 5.1 权限控制架构

```typescript
// 权限装饰器
@RequirePlan('STANDARD')  // 需要标准版及以上
@RequireQuota('monthlyRecognitions')  // 需要配额
async uploadReport(@Body() dto: UploadReportDto) {
  // 业务逻辑
}

// 配额检查拦截器
@Injectable()
export class QuotaCheckInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const user = context.switchToHttp().getRequest().user;
    const subscription = await this.subscriptionService.getActive(user.id);
    
    // 检查配额
    if (subscription.planType === 'FREE') {
      const usedCount = await this.reportService.getMonthlyCount(user.id);
      if (usedCount >= 50) {
        throw new QuotaExceededException('本月识别次数已达上限，请升级套餐');
      }
    }
    
    return next.handle();
  }
}
```

### 5.2 配额管理

| 功能 | 免费版 | 标准版 | 专业版 | 家庭版 |
|------|--------|--------|--------|--------|
| 每月AI识别次数 | 50次 | 200次 | 无限 | 无限 |
| 家庭成员数量 | 1人 | 5人 | 10人 | 10人 |
| 趋势图时间范围 | 近6个月 | 全部历史 | 全部历史 | 全部历史 |
| 数据导出 | ❌ | ✅ | ✅ | ✅ |
| AI深度解读 |  | ❌ | ✅ | ✅ |
| 健康预警推送 | ❌ | ❌ |  | ✅ |
| 报告分享链接 |  | ❌ | ❌ | ✅ |
| 存储空间 | 1GB | 3GB | 10GB | 10GB |

### 5.3 订阅状态机

```
┌─────────┐    支付成功    ─────────┐    到期    ┌─────────┐
│ PENDING │──────────────→│ ACTIVE  │──────────→│ EXPIRED │
─────────┘               └────┬────┘           └─────────┘
                               │
                          用户取消│
                               ▼
                          ┌─────────┐
                          │CANCELLED│
                          └─────────┘
```

---

## 六、安全设计

### 6.1 认证与授权

**JWT Token 结构**:
```json
{
  "sub": "user_uuid",
  "phone": "138****8000",
  "planType": "FREE",
  "iat": 1727337600,
  "exp": 1727942400  // 7天有效期
}
```

**Token 刷新策略**:
- Access Token: 7天有效期
- Refresh Token: 30天有效期
- 每次请求刷新 Refresh Token 过期时间

### 6.2 数据加密

**敏感字段加密**:
```typescript
// 使用 AES-256-GCM 加密健康数据
@Entity()
export class Report {
  @Column({ type: 'text', transformer: encryptionTransformer })
  diagnosis: string;  // 诊断结果（加密存储）
  
  @Column({ type: 'text', transformer: encryptionTransformer })
  advice: string;     // 医嘱建议（加密存储）
}
```

**加密字段清单**:
- 用户过敏史
- 用户慢性病史
- 报告诊断结果
- 报告医嘱建议
- 诊断记录内容

### 6.3 审计日志

```typescript
// 审计日志中间件
@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const log = {
      userId: req.user?.id,
      action: `${req.method} ${req.path}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      requestBody: this.sanitize(req.body)  // 脱敏处理
    };
    
    this.auditLogService.create(log);
    next();
  }
}
```

**审计日志记录范围**:
- 用户登录/登出
- 健康数据查看
- 健康数据修改/删除
- 订阅状态变更
- 密码修改

### 6.4 接口安全

| 安全措施 | 实现方式 |
|---------|---------|
| 限流 | @Throttle() 装饰器，每IP每分钟60次 |
| CORS | 仅允许指定域名访问 |
| XSS防护 | helmet中间件 + 输入过滤 |
| SQL注入防护 | Prisma参数化查询 |
| 文件上传限制 | 最大20MB，仅允许图片格式 |
| HTTPS | Nginx SSL终止 |

---

## 七、缓存策略设计

### 7.1 缓存层级

```typescript
// NestJS CacheModule 配置
CacheModule.register({
  ttl: 300,      // 5分钟默认过期
  max: 100,      // 最多缓存100条
})
```

### 7.2 缓存策略表

| 数据类型 | 缓存策略 | TTL | 说明 |
|---------|---------|-----|------|
| 用户信息 | Cache-Aside | 1小时 | 用户基本信息变更频率低 |
| 家庭成员列表 | Cache-Aside | 30分钟 | 成员列表变更频率低 |
| 报告列表 | Cache-Aside | 5分钟 | 分页查询频繁 |
| 指标趋势数据 | Cache-Aside | 10分钟 | 计算密集，适合缓存 |
| 套餐信息 | Cache-Aside | 1小时 | 几乎不变 |
| 配额计数 | Write-Through | 实时更新 | 必须准确 |

### 7.3 缓存失效策略

```typescript
// 报告更新时清除相关缓存
async updateReport(id: string, data: UpdateReportDto) {
  const report = await this.prisma.report.update({ where: { id }, data });
  
  // 清除相关缓存
  await this.cacheService.del(`report:${id}`);
  await this.cacheService.del(`reports:user:${report.userId}`);
  await this.cacheService.del(`trend:user:${report.userId}:member:${report.memberId}`);
  
  return report;
}
```

---

## 八、文件存储设计

### 8.1 存储路径规划

```
前期（本地存储）:
server/uploads/
├── reports/
│   ── {userId}/
│       └── {reportId}/
│           ├── original/
│           │   └── {timestamp}_{filename}.jpg
│           └── thumbnail/
│               └── {timestamp}_{filename}_thumb.jpg
├── diagnoses/
│   └── {userId}/
│       └── {diagnosisId}/
│           └── ...
└── avatars/
    └── {userId}/
        └── {timestamp}_{filename}.jpg

后期（OSS存储）:
oss://kewei-health/
├── reports/{userId}/{reportId}/original/
── reports/{userId}/{reportId}/thumbnail/
├── diagnoses/{userId}/{diagnosisId}/
└── avatars/{userId}/
```

### 8.2 图片处理流程

```typescript
// 图片上传处理
async uploadImage(file: Express.Multer.File, type: string): Promise<UploadResult> {
  // 1. 验证文件类型
  if (!['image/jpeg', 'image/png', 'image/heic'].includes(file.mimetype)) {
    throw new BadRequestException('仅支持JPG/PNG/HEIC格式');
  }
  
  // 2. 验证文件大小（20MB）
  if (file.size > 20 * 1024 * 1024) {
    throw new BadRequestException('文件大小不能超过20MB');
  }
  
  // 3. 生成唯一文件名
  const filename = `${Date.now()}_${randomUUID()}.jpg`;
  
  // 4. 压缩图片（保持质量80%）
  const compressed = await this.compressImage(file.buffer, 0.8);
  
  // 5. 生成缩略图（宽度300px）
  const thumbnail = await this.createThumbnail(compressed, 300);
  
  // 6. 保存文件
  const originalPath = await this.saveFile(compressed, `original/${filename}`);
  const thumbnailPath = await this.saveFile(thumbnail, `thumbnail/${filename}`);
  
  return {
    url: originalPath,
    thumbnailUrl: thumbnailPath,
    size: compressed.length
  };
}
```

### 8.3 存储容量管理

| 套餐 | 存储上限 | 单张图片限制 |
|------|---------|-------------|
| 免费版 | 1GB | 20MB |
| 标准版 | 3GB | 20MB |
| 专业版 | 10GB | 20MB |
| 家庭版 | 10GB | 20MB |

**容量检查**:
```typescript
async checkStorageQuota(userId: string, fileSize: number): Promise<boolean> {
  const subscription = await this.subscriptionService.getActive(userId);
  const usedStorage = await this.getUsedStorage(userId);
  const limit = this.getStorageLimit(subscription.planType);
  
  return (usedStorage + fileSize) <= limit;
}
```

---

## 九、部署架构设计

### 9.1 前期部署架构（单机）

```
┌─────────────────────────────────────────┐
│           阿里云 ECS (2核4G)             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Nginx (反向代理 + SSL)           │  │
│  │  • 前端静态资源                    │  │
│  │  • API反向代理                     │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │  Node.js (NestJS API)             │  │
│  │  • PM2 进程管理                    │  │
│  │  • 端口: 3000                      │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │  PostgreSQL (本地)                 │  │
│  │  • 端口: 5432                      │  │
│  │  • 每日备份到OSS                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  本地文件系统 (图片存储)            │  │
│  │  • /data/uploads                   │  │
│  │  • 每日备份到OSS                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 9.2 后期部署架构（分布式）

```
┌─────────────────────────────────────────────────────────┐
│                    阿里云                                 │
│                                                         │
│  ┌─────────────┐  ─────────────┐  ┌─────────────┐    │
│  │   ECS-1     │  │   ECS-2     │  │   ECS-N     │    │
│  │  (API节点)   │  │  (API节点)   │  │  (API节点)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────    │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │   SLB (负载均衡)       │                  │
│              └───────────┬───────────┘                  │
│                          │                              │
│  ┌───────────────────────▼───────────────────────┐     │
│  │  RDS PostgreSQL (高可用版)                      │     │
│  │  • 主从复制                                     │     │
│  │  • 自动备份                                     │     │
│  │  • 读写分离                                     │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  Redis (云数据库版)                             │     │
│  │  • 主从复制                                     │     │
│  │  • 持久化                                       │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  OSS (对象存储) + CDN                           │     │
│  │  • 图片存储                                     │     │
│  │  • CDN加速                                      │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 9.3 环境变量配置

```env
# 应用配置
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/kewei_health

# Redis配置（前期不使用）
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d

# 文件存储配置
STORAGE_TYPE=local  # local | oss
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=20971520  # 20MB

# OSS配置（后期启用）
OSS_REGION=cn-hangzhou
OSS_BUCKET=kewei-health
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret

# AI服务配置
BAIDU_OCR_API_KEY=your-baidu-ocr-api-key
BAIDU_OCR_SECRET_KEY=your-baidu-ocr-secret-key
DASHSCOPE_API_KEY=your-dashscope-api-key  # 通义千问

# 支付配置
WECHAT_PAY_MCH_ID=your-mch-id
WECHAT_PAY_API_KEY=your-api-key
ALIPAY_APP_ID=your-alipay-app-id

# 邮件/短信配置
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=your-sms-access-key-id
SMS_ACCESS_KEY_SECRET=your-sms-access-key-secret
```

---

## 附录

### A. 技术债务清单

| 项目 | 说明 | 优先级 |
|------|------|--------|
| 手写识别优化 | 前期使用免费OCR，后期需优化 | 低 |
| 离线功能 | 前期不支持，后期考虑 | 低 |
| 视频类检查 | 前期仅图片，后期扩展 | 低 |
| 医生端 | 前期不需要，后期考虑 | 低 |
| 多语言支持 | 前期仅中文，后期扩展 | 低 |

### B. 性能指标要求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API响应时间 | < 200ms | 95%请求 |
| 图片上传时间 | < 5秒 | 4G网络，单张 |
| AI识别时间 | < 10秒 | 单张图片 |
| 页面加载时间 | < 2秒 | 首屏 |
| 并发用户数 | 1000 | 前期目标 |

### C. 监控告警配置

| 监控项 | 告警阈值 | 告警方式 |
|--------|---------|---------|
| CPU使用率 | > 80% | 邮件+短信 |
| 内存使用率 | > 85% | 邮件+短信 |
| 磁盘使用率 | > 90% | 邮件+短信 |
| API错误率 | > 5% | 邮件 |
| 数据库连接数 | > 80% | 邮件 |
| 存储空间使用率 | > 80% | 邮件 |
