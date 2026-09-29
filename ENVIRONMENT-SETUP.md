# 可为健康 — 开发环境安装清单

> 版本：v1.0
> 日期：2026-09-29
> 操作系统：Windows 24H2
> 用途：本地开发环境

---

## 一、已安装软件

### 1.1 版本控制

| 名称 | 版本 | 用途 | 安装路径 | 安装方式 |
|------|------|------|---------|---------|
| **Git** | 2.55.0 | 版本控制 | `C:\Program Files\Git\` | winget |
| **GitHub Desktop** | 3.6.6 | Git图形化客户端 | `C:\Users\<User>\AppData\Local\GitHubDesktop\` | winget |
| **GitHub CLI (gh)** | 2.101.0 | GitHub命令行工具 | `C:\Program Files\GitHub CLI\` | winget |

### 1.2 运行时环境

| 名称 | 版本 | 用途 | 安装路径 | 安装方式 |
|------|------|------|---------|---------|
| **Node.js** | 24.19.0 (LTS) | JavaScript运行时 | `C:\Program Files\nodejs\` | winget |
| **npm** | 11.17.0 | Node.js包管理器 | 随Node.js安装 | 自动 |

### 1.3 数据库

| 名称 | 版本 | 用途 | 安装路径 | 安装方式 |
|------|------|------|---------|---------|
| **PostgreSQL** | 16.15 | 主数据库 | `C:\Program Files\PostgreSQL\16\` | winget |
| **pgAdmin 4** | 随PostgreSQL | 数据库管理工具 | `C:\Program Files\PostgreSQL\16\pgAdmin 4\` | 自动 |

### 1.4 开发框架（npm包）

| 名称 | 版本 | 用途 | 安装位置 |
|------|------|------|---------|
| **NestJS** | 10.4.22 | 后端框架 | `node_modules/@nestjs/` |
| **Prisma** | 5.22.0 | ORM/数据库工具 | `node_modules/prisma/` |
| **@prisma/client** | 5.22.0 | Prisma客户端 | `node_modules/@prisma/client/` |
| **React** | 18.x | Web前端框架 | `node_modules/react/` |
| **Vite** | 5.x | 前端构建工具 | `node_modules/vite/` |
| **Ant Design** | 5.x | UI组件库 | `node_modules/antd/` |
| **Vue** | 3.4.x | 小程序前端框架 | `node_modules/vue/` |
| **uni-app** | 3.0.0 | 跨端开发框架 | `node_modules/@dcloudio/` |
| **Pinia** | 2.1.7 | Vue状态管理 | `node_modules/pinia/` |
| **TypeScript** | 5.3.3 | 类型系统 | `node_modules/typescript/` |

### 1.5 项目数据库

| 项目 | 值 |
|------|-----|
| 数据库名 | `kewei_health` |
| 主机 | `localhost` |
| 端口 | `5432` |
| 用户 | `postgres` |
| 密码 | `postgres` |
| 连接字符串 | `postgresql://postgres:postgres@localhost:5432/kewei_health?schema=public` |

---

## 二、待安装软件

### 2.1 部署相关（生产环境需要，开发阶段可选）

| 名称 | 推荐版本 | 用途 | 安装方式 | 优先级 |
|------|---------|------|---------|--------|
| **Docker Desktop** | 最新版 | 容器化部署 | [官网下载](https://www.docker.com/products/docker-desktop/) | 中（第4周） |
| **Nginx** | 1.26+ | 反向代理/静态资源 | winget或Docker | 中（第4周） |

### 2.2 开发工具（推荐安装）

| 名称 | 推荐版本 | 用途 | 安装方式 | 优先级 |
|------|---------|------|---------|--------|
| **VS Code** | 最新版 | 代码编辑器 | [官网下载](https://code.visualstudio.com/) | 高 |
| **Postman** | 最新版 | API调试工具 | [官网下载](https://www.postman.com/) | 高 |
| **微信开发者工具** | 最新版 | 小程序开发调试 | [官网下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) | 高（第10周） |
| **HBuilderX** | 最新版 | uni-app开发工具（可选） | [官网下载](https://www.dcloud.io/hbuilderx.html) | 低 |

### 2.3 可选工具

| 名称 | 用途 | 安装方式 |
|------|------|---------|
| **Redis** | 缓存（前期用内存缓存替代） | winget或Docker |
| **DBeaver** | 通用数据库管理工具 | [官网下载](https://dbeaver.io/) |
| **TablePlus** | 数据库管理工具（付费） | [官网下载](https://tableplus.com/) |

---

## 三、环境变量配置

### 3.1 系统PATH（已配置）

```
C:\Program Files\Git\cmd
C:\Program Files\nodejs\
C:\Program Files\PostgreSQL\16\bin
C:\Program Files\GitHub CLI\
```

### 3.2 项目环境变量（.env）

```env
# 数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kewei_health?schema=public"

# JWT密钥
JWT_SECRET="kewei-health-jwt-secret-2026"

# AI API配置（前期使用百度OCR免费额度）
AI_API_KEY=""
AI_API_ENDPOINT="https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic"

# 服务端口
PORT=3000

# 文件存储（前期本地存储）
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=20971520

# 百度OCR配置（免费额度：50,000次/月）
BAIDU_OCR_API_KEY=待配置
BAIDU_OCR_SECRET_KEY=待配置
```

---

## 四、服务端口

| 服务 | 端口 | 状态 |
|------|------|------|
| NestJS API | 3000 | ✅ 运行中 |
| PostgreSQL | 5432 | ✅ 运行中 |
| Swagger文档 | 3000/api/docs | ✅ 可访问 |
| Redis | 6379 | ⏳ 前期不需要 |
| Nginx | 80/443 |  待安装 |

---

## 五、项目结构

```
e:\可为（kewei）\
├── server/                    # 后端（NestJS）
│   ├── src/                   # 源代码
│   ├── prisma/                # 数据库Schema
│   ├── .env                   # 环境变量
│   └── package.json
├── web/                       # Web前端（React）
│   ├── src/
│   └── package.json
├── miniprogram/               # 微信小程序（uni-app）
│   ├── pages/
│   └── package.json
── assets/                    # 静态资源
│   └── logo-kewei-health.png  # LOGO文件
├── .gitignore
├── package.json               # 根package.json（workspaces）
── [文档目录]
    ├── PRD-个人健康档案管理平台.md
    ├── SYSTEM-DESIGN.md
    ├── PROJECT-PLAN-SOLO.md
    ├── PROGRESS-TRACKER.md
    ├── FEASIBILITY-REPORT.md
    ├── COMPETITIVE-ANALYSIS.md
    ├── COMPLIANCE-ANALYSIS.md
    ├── Dockerfile
    ├── docker-compose.yml
    └── nginx.conf
```

---

## 六、常用命令

### 6.1 后端开发

```powershell
# 进入后端目录
cd e:\可为（kewei）\server

# 启动开发服务器（热重载）
npm run dev

# 构建生产版本
npm run build

# 运行数据库迁移
npx prisma migrate dev

# 打开数据库管理界面
npx prisma studio

# 生成Prisma客户端
npx prisma generate
```

### 6.2 前端开发

```powershell
# Web前端
cd e:\可为（kewei）\web
npm run dev

# 小程序
cd e:\可为（kewei）\miniprogram
npm run dev:mp-weixin
```

### 6.3 Git操作

```powershell
cd e:\可为（kewei）

# 查看状态
git status

# 提交更改
git add -A
git commit -m "描述"

# 推送到GitHub
git push
```

---

## 七、安装验证

| 软件 | 验证命令 | 预期输出 |
|------|---------|---------|
| Git | `git --version` | git version 2.55.0.windows.3 |
| Node.js | `node --version` | v24.19.0 |
| npm | `npm --version` | 11.17.0 |
| PostgreSQL | `psql --version` | psql (PostgreSQL) 16.15 |
| GitHub CLI | `gh --version` | gh version 2.101.0 |
| Prisma | `npx prisma --version` | prisma 5.22.0 |
| 后端服务 | 访问 http://localhost:3000 | NestJS运行中 |
| Swagger | 访问 http://localhost:3000/api/docs | API文档页面 |

---

## 八、注意事项

### 8.1 PowerShell执行策略

安装Node.js后，需要设置PowerShell执行策略才能使用npm：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

### 8.2 环境变量刷新

安装新软件后，需要刷新PowerShell的PATH变量：

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 8.3 PostgreSQL服务

PostgreSQL安装后会自动注册为Windows服务，开机自启动：

```powershell
# 查看服务状态
Get-Service -Name "postgresql*"

# 启动/停止服务
Start-Service postgresql-x64-16
Stop-Service postgresql-x64-16
```

### 8.4 依赖安装

项目使用npm workspaces管理多包，安装依赖时需要使用 `--legacy-peer-deps`：

```powershell
cd e:\可为（kewei）
npm install --legacy-peer-deps
```

---

## 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2026-09-29 | 创建环境安装清单，记录已安装的Git/Node.js/PostgreSQL等 |
