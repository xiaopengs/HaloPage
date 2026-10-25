# 小孩子作业记录网站（Homework Tracker）

面向家长的多孩子作业结构化记录工具：**拍照即记、AI 识别、按"每周→每天→学科"一屏掌握**。

> 本仓库只包含源码与文档；线上演示地址与访问凭据不公开。

## 功能（V1.0 MVP）

| 模块 | 说明 |
|------|------|
| 账号系统 | 邮箱/手机号 + 密码注册登录（bcrypt 加密），JWT 双 Token（access 2h + refresh 7d 轮换） |
| 多孩子档案 | 一个账号管理多个孩子，数据完全隔离，支持增删改与快速切换 |
| 作业记录 | 按"孩子 → 日期 → 学科 → 内容"录入，支持编辑、删除（二次确认） |
| 手动批量录入 | 大输入框每行一条，选择学科与日期后一次保存多条（新增 `POST /homeworks/batch`，事务提交）；输入实时计数、空行忽略、快捷短语 |
| 周视图看板 | 周一~周日 × 学科分组的周历看板，周切换、当天高亮、完成计数 |
| 拍照上传 | 手机浏览器调起相机（`input capture`），客户端 canvas 压缩（长边 ≤1600px / ≤1MB） |
| AI 识别 | 多模态大模型识别作业 → 结构化预填（学科/内容/置信度）→ **人工确认后才入库，绝不自动盲存** |
| 识别降级链 | Qwen-VL（主）→ OpenAI 兼容端点（备）→ 识别失败转手动录入（照片保留为附件，闭环不断点） |
| 完成状态标记 | 每条作业可标记已完成，看板划线置灰 + 计数实时更新 |
| 隐私政策 | 注册强制勾选协议；儿童个人信息保护专章；账号注销与数据删除通道 |
| 运营后台 | `/admin` 管理令牌登录：用户管理、数据统计、识别服务监控、反馈处理 |

## 快速开始

### 方式一：一体化运行（推荐，单端口）

```bash
# 1. 安装后端依赖
cd server && npm install

# 2. 配置环境变量
cp .env.example .env   # 至少修改 JWT_SECRET

# 3. 构建前端（已预构建到 server/public 可跳过）
cd ../client && npm install && npm run build
cp -r dist ../server/public

# 4. 启动（Node 22 内置 SQLite，无需外部数据库）
cd ../server
node src/index.js
# 访问 http://localhost:3000
```

### 方式二：前后端分离开发

```bash
# 后端（端口 3000）
cd server && node src/index.js

# 前端开发服务器（端口 5173，自动代理 /api 到 3000）
cd client && npm run dev
```

## 配置 AI 识别（可选）

未配置时系统自动降级为"拍照存档 + 手动录入"，功能完整可用。配置后启用 AI 预填：

```bash
# .env（server 目录）
# 主链路：阿里云百炼 Qwen-VL（DashScope，OpenAI 兼容端点）
LLM_PRIMARY_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_PRIMARY_API_KEY=sk-xxx
LLM_PRIMARY_MODEL=qwen-vl-max

# 备用链路：任意 OpenAI 兼容多模态端点（可选）
LLM_BACKUP_BASE_URL=https://api.openai.com/v1
LLM_BACKUP_API_KEY=sk-xxx
LLM_BACKUP_MODEL=gpt-4o
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `JWT_SECRET` | dev-only-insecure-secret-change-me | **生产必须修改** |
| `ACCESS_TOKEN_TTL` | 2h | access token 有效期 |
| `REFRESH_TOKEN_TTL_DAYS` | 7 | refresh token 有效期 |
| `DB_FILE` | server/data/homework.db | SQLite 数据库文件 |
| `UPLOAD_DIR` | server/uploads | 照片存储目录 |
| `ADMIN_TOKEN` | admin-dev-token | 运营后台管理令牌（**生产必须修改**） |
| `MAX_UPLOAD_BYTES` | 5242880 | 单张照片大小上限（5MB） |
| `LLM_*` | 见上 | AI 识别服务配置 |

## 技术栈

- **前端**：Vue 3 + Vite + Pinia + Vue Router（Hash 模式，移动端优先响应式）；**自有设计系统“作业夹”**（无 UI 框架，Element Plus 已移除），设计令牌见 `src/styles/tokens.css`
- **后端**：Node.js 22 + Express 5 + node:sqlite（DatabaseSync）+ JWT + bcryptjs + multer + zod
- **识别**：Provider 抽象（OpenAI 兼容多模态接口），三级降级链 + 审计流水（recognition_tasks）
- **安全**：bcrypt 密码哈希、JWT 双 Token、水平越权校验（所有查询强制 user_id 过滤）、照片按用户前缀隔离 + 登录态读取、MIME/魔数双重校验、限流（登录 10 次/分、全局 300 次/分）

## 目录结构

```
app/
├── server/                  # Node.js 后端（一体化托管前端）
│   ├── src/
│   │   ├── index.js         # 入口：中间件、路由装配、错误处理、备份任务
│   │   ├── db.js            # SQLite schema + 学科种子
│   │   ├── auth.js          # JWT 双 Token
│   │   ├── recognition.js   # 识别 Provider 抽象 + 降级链 + JSON 解析
│   │   ├── routes-*.js      # auth / children+subjects / homeworks / upload / admin
│   │   └── util.js          # 统一响应、ISO 周计算、限流
│   ├── public/              # 前端构建产物（vite build 输出）
│   ├── data/                # SQLite 数据（自动创建）
│   ├── uploads/             # 照片存储（按 user/日期分目录）
│   └── backups/             # 每日自动备份（保留 14 天）
└── client/                  # Vue 3 前端（作业夹设计系统）
    └── src/
        ├── views/           # Login WeekView Record Children Profile Policy Admin
        ├── components/      # BaseModal / ConfirmHost / ToastHost / BrandMark
        ├── composables/     # useToast / useConfirm
        ├── styles/          # tokens.css（设计令牌）+ app.css（布局与组件）
        ├── api/             # axios 封装（X-Auth-Token 三通道 + 自动刷新）
        ├── stores/          # Pinia auth / family（孩子与学科共享状态）
        └── utils/           # 图片压缩、ISO 周计算
```

## 与《技术研发方案》的落地差异说明

| 方案原文 | 沙盒 MVP 落地 | 原因 |
|----------|--------------|------|
| MySQL 8 + Prisma | node:sqlite（SQLite） | 沙盒环境免安装外部数据库；schema 与 API 契约保持一致，上云可平移 MySQL |
| 阿里云 OSS + STS 直传 | 本地 uploads 目录 + 服务端代理上传 | 沙盒无云账号；上传/读取接口契约一致（photo_key 概念保留） |
| TypeScript strict | JavaScript | 加快首版交付；工程化可在 V1.1 升级 |
| 百度 OCR 降级 | 主+备 LLM 两级 + 手动兜底 | 百度 OCR 需额外资质对接，MVP 以手动录入为最终兜底，闭环不断点 |

## 鉴权 Token 传输通道（重要）

公网边缘代理会**覆盖标准的 `Authorization` 请求头**（平台网关行为，非本应用缺陷）。为保证 JWT 在任何网络路径下都能完整送达，服务端 `extractToken()` 按以下优先级提取 Token，前端已同步适配：

| 优先级 | 通道 | 用途 |
|--------|------|------|
| 1 | `X-Auth-Token` 自定义请求头 | 主力通道——边缘代理不拦截自定义头，穿透率 100% |
| 2 | `?token=<jwt>` 查询参数 | 供 `<img src>` 等无法自定义请求头的场景（如作业照片预览） |
| 3 | `Authorization: Bearer <jwt>` | 本地/内网直连（无边缘代理）时的标准通道 |

> 实现位置：`server/src/auth.js` 的 `extractToken(req)`，被 `authRequired` 中间件、`/auth/me`、照片读取路由共用。
> 注意：查询参数通道仅用于照片读取等只读场景，Token 有效期 2 小时，且照片接口仍有归属校验（`homework/{uid}/` 前缀），越权访问返回 403。

## 已知限制（V1.1 规划）

- 短信验证码登录未接入（V1.1，需短信服务商资质）
- 学科自定义 UI 未做（API 已支持，前端入口 V1.1）
- 微信小程序 / App（V1.1 视数据触发）
- 字体走 Google Fonts，弱网或内网环境回退系统字体（不影响功能）；主要页面已按路由拆包
- 管理后台的 `x-admin-token` 头在部分边缘代理下可能被拦截（C 端功能不受影响；本地/内网直连正常）

## 测试

- 后端 API：注册/登录/建档/录入/周视图/完成标记/编辑/删除/越权防护/限流/降级链全链路通过
- 前端 UI（重构后·作业夹设计系统）：Chromium 390×844 移动视口全流程通过——注册 → 建档 → 手动三行批量录入 → 看板 3 条 → 完成勾选 → 编辑回写 → 照片识别降级 → 删除确认；**JS 错误 0**
- **公网链接实测**（真实浏览器 + curl）：注册→主界面→建档→手动录入→周看板显示条目全流程通过，JS 错误 0；照片上传 / `<img>` 查询参数读取 / 无 Token 401 越权拦截 / 无 Key 识别降级（status=3 手动录入兜底）均验证通过
