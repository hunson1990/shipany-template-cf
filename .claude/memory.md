# ShipAny / SoulFuse 项目记忆

> 最后更新: 2026-03-30

## 1. 项目基本信息

- **项目名称**: SoulFuse (ShipAny Template)
- **版本**: 1.8.2
- **定位**: AI SaaS 启动模板/框架，主打 AI 视频生成（图生视频）
- **仓库**: https://github.com/soulfuse/soul-fuse
- **主页**: https://soulfuse.ai
- **当前工作目录**: `/Users/guo/Documents/Tools/shipany/shipany-template-cf`

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15.5.7 (App Router) |
| 语言 | TypeScript 5.x |
| 样式 | Tailwind CSS v4 + tw-animate-css |
| UI 组件 | Radix UI + shadcn/ui + 自定义组件 |
| 动画 | Framer Motion / motion |
| 国际化 | next-intl 4.3.4 |
| 认证 | better-auth 1.3.7 |
| 数据库 | Drizzle ORM 0.44.2 |
| 数据库支持 | PostgreSQL / MySQL / SQLite (Turso) |
| MDX 文档 | fumadocs-mdx / fumadocs-core / fumadocs-ui |
| AI SDK | ai 5.0.39 + @ai-sdk/react + @ai-sdk/replicate |
| 包管理 | pnpm |
| 部署 | Cloudflare Workers (opennextjs-cloudflare) / Vercel / Docker |

## 3. 项目结构

```
shipany-template-cf/
├── src/
│   ├── app/[locale]/              # Next.js App Router 路由
│   │   ├── (landing)/             # 落地页路由组
│   │   ├── (admin)/admin/         # 后台管理路由组
│   │   ├── (auth)/                # 认证路由组 (sign-in, sign-up)
│   │   ├── (chat)/chat/           # AI 聊天路由组
│   │   ├── (docs)/docs/           # 文档路由组
│   │   └── layout.tsx             # 根布局 (ThemeProvider, i18n)
│   ├── config/                    # 全局配置
│   │   ├── db/                    # 数据库 schema + migrations
│   │   ├── locale/                # i18n 消息文件 (JSON)
│   │   ├── style/                 # 全局 CSS / 主题 CSS
│   │   ├── index.ts               # envConfigs 统一入口
│   │   └── theme/index.ts         # 主题配置
│   ├── core/                      # 核心基础设施
│   │   ├── auth/                  # better-auth 封装
│   │   ├── db/                    # 数据库连接 (pg/mysql/sqlite)
│   │   ├── docs/                  # fumadocs 源配置
│   │   ├── i18n/                  # next-intl 配置
│   │   ├── rbac/                  # 权限控制
│   │   └── theme/                 # 主题 Provider + 加载器
│   ├── extensions/                # 第三方扩展 Provider 管理器
│   │   ├── ai/                    # AI Provider (Replicate, Fal, Gemini, Kie, Pollo)
│   │   ├── payment/               # 支付 Provider (Stripe, Creem, PayPal)
│   │   ├── email/                 # 邮件 Provider (Resend)
│   │   ├── storage/               # 存储 Provider (S3, R2)
│   │   ├── analytics/             # 分析 (GA, Clarity, Plausible, OpenPanel, Vercel)
│   │   ├── ads/                   # 广告 (AdSense)
│   │   ├── affiliate/             # 联盟营销 (Affonso, PromoteKit)
│   │   └── customer-service/      # 客服 (Crisp, Tawk)
│   ├── shared/                    # 共享业务代码
│   │   ├── blocks/                # 页面区块组件
│   │   ├── components/            # 通用组件 (ui, magicui, ai-elements)
│   │   ├── contexts/              # React Context
│   │   ├── hooks/                 # 自定义 Hooks
│   │   ├── lib/                   # 工具函数
│   │   ├── models/                # 数据模型/ORM 操作
│   │   ├── services/              # 业务服务 (AI, Payment, Settings...)
│   │   └── types/                 # TypeScript 类型定义
│   ├── themes/default/            # 默认主题
│   │   ├── blocks/                # 主题区块 (hero, features, pricing, faq...)
│   │   ├── layouts/               # 主题布局 (landing)
│   │   └── pages/                 # 主题页面 (dynamic-page, static-page)
│   └── middleware.ts              # Next.js 中间件 (i18n + 认证拦截)
├── content/                       # MDX 内容
│   ├── docs/                      # 文档
│   ├── pages/                     # 静态页面 (隐私政策、服务条款)
│   ├── posts/                     # 博客文章
│   └── logs/                      # 更新日志
├── public/                        # 静态资源
├── scripts/                       # 脚本 (初始化 DB、RBAC、导入 SQL)
├── .claude/skills/                # Claude Skills
│   ├── shipany-quick-start/       # 新项目初始化技能
│   └── shipany-page-builder/      # 动态页面创建技能
└── 配置文件 (next.config.mjs, wrangler.toml, source.config.ts...)
```

## 4. 路由结构

### 4.1 落地页 (landing)
- `/[locale]/` - 首页
- `/[locale]/pricing` - 定价页
- `/[locale]/blog` - 博客列表
- `/[locale]/blog/[slug]` - 博客详情
- `/[locale]/blog/category/[slug]` - 博客分类
- `/[locale]/updates` - 更新日志
- `/[locale]/showcases` - 案例展示
- `/[locale]/hero-demo` - Hero 演示
- `/[locale]/[...slug]` - **动态页面** (支持 MDX 静态页 + JSON 动态页)
- `/[locale]/activity/*` - 用户活动中心 (AI tasks, chats, feedbacks)

### 4.2 AI 功能
- `/[locale]/ai-image-generator`
- `/[locale]/ai-music-generator`
- `/[locale]/ai-video-generator`
- `/[locale]/chat` - AI 聊天
- `/[locale]/chat/[id]` - 聊天会话

### 4.3 用户设置
- `/[locale]/settings/profile`
- `/[locale]/settings/security`
- `/[locale]/settings/billing`
- `/[locale]/settings/payments`
- `/[locale]/settings/credits`
- `/[locale]/settings/apikeys`

### 4.4 认证
- `/[locale]/sign-in`
- `/[locale]/sign-up`
- `/[locale]/verify-email`

### 4.5 管理后台
- `/[locale]/admin` - 仪表盘
- `/[locale]/admin/users` - 用户管理
- `/[locale]/admin/roles` - 角色管理
- `/[locale]/admin/permissions` - 权限管理
- `/[locale]/admin/posts` - 文章管理
- `/[locale]/admin/categories` - 分类管理
- `/[locale]/admin/payments` - 支付管理
- `/[locale]/admin/subscriptions` - 订阅管理
- `/[locale]/admin/credits` - 积分管理
- `/[locale]/admin/ai-tasks` - AI 任务管理
- `/[locale]/admin/chats` - 聊天管理
- `/[locale]/admin/settings/[tab]` - 系统设置 (general, auth, payment, email, storage, ai, analytics, ads, affiliate, customer_service)
- `/[locale]/admin/apikeys` - API Key 管理

### 4.6 文档
- `/[locale]/docs/[[...slug]]` - fumadocs 文档

## 5. 数据库结构 (PostgreSQL 为主)

使用 Drizzle ORM，schema 文件: `src/config/db/schema.postgres.ts`

### 5.1 认证表 (better-auth)
- `user` - 用户 (含 UTM 追踪字段)
- `session` - 会话
- `account` - 第三方账号绑定
- `verification` - 验证码

### 5.2 内容表
- `post` - 文章/页面 (支持 type, slug, status)
- `taxonomy` - 分类/标签

### 5.3 商业表
- `order` - 订单 (支持一次性付款 + 订阅)
- `subscription` - 订阅记录
- `credit` - 积分/余额记录 (FIFO 消费队列设计)
- `apikey` - 用户 API Key

### 5.4 权限表 (RBAC)
- `role` - 角色
- `permission` - 权限
- `role_permission` - 角色权限关联
- `user_role` - 用户角色关联

### 5.5 AI 表
- `ai_task` - AI 生成任务 (图/音乐/视频)
- `chat` - 聊天会话
- `chat_message` - 聊天消息

### 5.6 配置表
- `config` - 键值对系统配置 (name, value)

## 6. 扩展系统 (Extensions)

项目采用 **Manager + Provider** 插件化架构。

### 6.1 AI 扩展 (`src/extensions/ai/`)
- `AIManager` - 统一管理 AI Provider
- 已集成: **Replicate**, **Fal**, **Gemini**, **Kie**, **Pollo**
- 支持自定义存储 (custom_storage) 将生成结果转存到 R2/S3
- 媒体类型: image, music, video, chat

### 6.2 支付扩展 (`src/extensions/payment/`)
- `PaymentManager` - 统一管理支付 Provider
- 已集成: **Stripe**, **Creem**, **PayPal**
- 支持一次性支付 + 订阅 + 自动续费 + Webhook 处理
- 支付成功后会自动发放 credits

### 6.3 邮件扩展 (`src/extensions/email/`)
- `EmailManager`
- 已集成: **Resend**

### 6.4 存储扩展 (`src/extensions/storage/`)
- `StorageManager`
- 已集成: **S3**, **Cloudflare R2**

### 6.5 分析扩展
- Google Analytics, Microsoft Clarity, Plausible, OpenPanel, Vercel Analytics

### 6.6 广告/联盟/客服
- AdSense, Affonso, PromoteKit, Crisp, Tawk

## 7. 主题系统

- 主题目录: `src/themes/{themeName}/`
- 当前仅 `default` 主题
- 主题加载器: `src/core/theme/index.ts`
  - `getThemePage(pageName)` - 加载页面组件
  - `getThemeLayout(layoutName)` - 加载布局组件
  - `getThemeBlock(blockName)` - 加载区块组件
- 默认主题区块包括:
  - `hero`, `features`, `features-list`, `features-accordion`, `features-step`, `features-flow`, `features-media`
  - `pricing`, `faq`, `cta`, `subscribe`, `stats`, `testimonials`, `logos`
  - `showcases`, `showcases-flow`
  - `blog`, `blog-detail`, `page-detail`
  - `header`, `footer`

## 8. 国际化 (i18n)

- 库: `next-intl`
- 支持语言: **en**, **zh**
- 默认语言从 `envConfigs.locale` 读取
- 语言文件位置: `src/config/locale/messages/{locale}/**
- 路由前缀策略: `as-needed`
- 语言检测: `localeDetection = false`
- 页面内容通过 `getTranslations()` 从 JSON 读取，支持嵌套 namespace (如 `pages.index`, `landing`, `ai.video`)

## 9. 配置系统

### 9.1 环境变量 (`src/config/index.ts` -> `envConfigs`)
关键变量:
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_THEME` (默认: default)
- `NEXT_PUBLIC_APPEARANCE` (system / dark / light)
- `DATABASE_URL` / `DATABASE_PROVIDER` (postgresql / mysql / sqlite / turso)
- `AUTH_SECRET`
- `DB_SCHEMA`, `DB_MIGRATIONS_TABLE`, `DB_MIGRATIONS_SCHEMA`

### 9.2 数据库配置 (`config` 表)
- 通过 `src/shared/models/config.ts` 的 `getAllConfigs()` 读取
- 后台设置页面 (`/admin/settings/[tab]`) 可动态修改
- 配置项覆盖: 通用设置、认证、支付、邮件、存储、AI、分析、广告、联盟、客服

## 10. 动态页面机制

### 10.1 动态路由: `/[locale]/[...slug]/page.tsx`
解析优先级:
1. **静态页面** (MDX): `content/pages/{slug}.mdx` 或 `content/pages/{slug}.{locale}.mdx`
2. **动态页面** (JSON): `src/config/locale/messages/{locale}/pages/{slug}.json`
   - 通过 `pages.{slug}.page` 命名空间读取
   - 渲染 `src/themes/default/pages/dynamic-page.tsx`
   - 页面 section 映射到主题 block

### 10.2 创建动态页面
- 使用 skill `shipany-page-builder`
- 脚本: `.claude/skills/shipany-page-builder/scripts/create_dynamic_page.py`
- 需在 `src/config/locale/index.ts` 的 `localeMessagesPaths` 中注册 `pages/<slug>`

## 11. 关键脚本

```bash
# 开发
pnpm dev                    # Turbopack 开发模式
pnpm build                  # 生产构建

# 数据库
pnpm db:generate            # Drizzle 生成 migration
pnpm db:migrate             # 执行 migration
pnpm db:push                # 推送 schema
pnpm db:studio              # Drizzle Studio

# 认证/RBAC
pnpm auth:generate          # better-auth 生成 schema
pnpm rbac:init              # 初始化 RBAC
pnpm rbac:assign            # 分配角色

# Cloudflare
pnpm cf:preview             # Cloudflare 本地预览
pnpm cf:deploy              # Cloudflare 部署
pnpm cf:typegen             # Wrangler 类型生成
```

## 12. 部署配置

### 12.1 Cloudflare Workers (主要)
- `wrangler.toml` 配置
- `open-next.config.ts` 配置
- 使用 `@opennextjs/cloudflare` 构建
- `serverExternalPackages` 包含 `@libsql/client`

### 12.2 Vercel
- `vercel.json` 已配置
- `next.config.mjs` 中 `output` 在 Vercel 环境下为 `undefined`

### 12.3 Docker
- `Dockerfile` 存在
- 输出 `standalone` 模式

## 13. 中间件行为 (`src/middleware.ts`)

- 先执行 `next-intl` 国际化中间件
- **认证拦截**: `/admin/*`, `/settings/*`, `/activity/*` 需要登录，否则重定向到 `/sign-in`
- **缓存控制**: 公开页面删除 Set-Cookie 并设置 `s-maxage=3600, stale-while-revalidate=14400`

## 14. 技能文件 (Claude Skills)

### 14.1 shipany-quick-start
- 用途: 新项目首次初始化
- 修改范围: env、SEO、落地页文案、主题样式、Logo/Favicon、Sitemap、法律页面
- 参考: `.claude/skills/shipany-quick-start/references/`

### 14.2 shipany-page-builder
- 用途: 创建新的动态页面
- 修改范围: 仅新增 `src/config/locale/messages/{locale}/pages/**` + 注册 `localeMessagesPaths`
- 脚本: `scripts/create_dynamic_page.py`

## 15. 开发注意事项

- **React StrictMode 已关闭** (`reactStrictMode: false`)
- **React Compiler 已启用** (`reactCompiler: true`)
- **Turbopack 开发缓存** 已开启 (`turbopackFileSystemCacheForDev: true`)
- **MDX**: Vercel 部署时禁用 `mdxRs` (兼容 fumadocs-mdx)
- **图片**: 允许所有远程域名 (`hostname: '*'`)
- **缓存**: `/imgs/*` 长期缓存 1 年
- 修改后若出现静态资源不更新，需手动 `rm -rf .next`
