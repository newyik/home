# 小家控 · 给 AI 助手的说明

Claude 和 Codex 都会在这个仓库里工作，开始前请先读完本文件。用户习惯用中文交流。

这个项目以前在 `Documents/claude/project(1)/home`，已经搬到这里。以后只在这个目录开发，不要再改旧目录。

## 这是什么

两个人（一家人）共用的小网站，有两个功能：

- **一起买**：共享采购清单
- **旅行打卡**：在日本地图上标记去过和计划去的地方

| 部分 | 位置 | 说明 |
| --- | --- | --- |
| 网页 | `src/`、`index.html`、`public/` | React 19 + TypeScript + Vite，PWA。数据在 Supabase，部署在 GitHub Pages：https://newyik.github.io/home/ |
| Mac 外壳 | `macOS/` | Swift 写的原生窗口，内嵌 WKWebView，加载上面的线上网页，另外提供菜单、工具栏和快捷键。不带网页代码。 |
| iPhone 外壳 | `iOS/` | UIKit + WKWebView，同样加载线上网页，另外提供原生触感震动、下拉刷新和分享。 |

两个外壳加载的都是线上网页，所以网页改动发布后，外壳不用重新构建就能看到。只有改了 Swift 代码、Info.plist 或图标时，才需要重新构建外壳。

## 开发、测试、构建（网页）

Node 版本以 `.nvmrc` 为准（22）。这台 Mac 默认的 Node 是 26，Node 22 由 Homebrew 的 `node@22` 提供，运行命令前先切换：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
```

```bash
npm install        # 安装依赖
npm run dev        # 本地开发 http://localhost:5173 ；没有 .env 时进入本地演示模式，数据只存在浏览器里
npm run typecheck  # TypeScript 检查
npm test           # vitest 单元测试
npm run build      # 类型检查 + 生产构建，输出到 dist/（已被 git 忽略）
```

改完代码后，至少跑通 `npm run typecheck`、`npm test` 和 `npm run build` 再交给用户。

注意：用 Node 22 自带的 npm 运行 `npm install`，可能会删掉 `package-lock.json` 里的 `libc` 字段。没有改依赖时，把 `package-lock.json` 恢复原样，不要提交这类改动。

## 发布

- **推送到 `main` 会自动发布网站**（`.github/workflows/deploy.yml`：先 `npm ci`、`npm test`，再构建并部署到 GitHub Pages）。
- 家人每天在用这个网站，里面是真实数据。**每次 `git push` 之前都必须先问用户，得到明确同意后才能推送。** 用户同意提交，不等于同意推送。
- Supabase 的地址和 anon key 存在 GitHub 仓库的 Secrets 里，本地放在 `.env`。不要提交 `.env`，也不要在任何地方使用 `service_role` key。

## 外壳怎么构建、安装

都在仓库根目录运行，需要 Xcode 命令行工具。

**Mac**（Apple 芯片，macOS 13+）

```bash
./macOS/build.sh
open 'macOS/build/小家控.app'
```

脚本会做临时签名（ad-hoc）。要安装的话，把 `小家控.app` 拖进「应用程序」文件夹，替换旧版本。

**iPhone**（iOS 16+）

```bash
./iOS/build.sh
```

脚本会生成未签名的 `iOS/小家控-iPhone-待签名.ipa`，签名之后才能装到手机上。签名和安装由用户自己完成。

`build/` 目录和生成的 `.ipa` 都是构建产物，不要提交。

## Supabase：务必小心

- **这个 Supabase 项目和另一个应用「日和账本」共用。** 只能改小家控自己的表，绝对不能改、删日和账本的表、函数、策略或数据。
- 小家控的对象都定义在 `supabase/schema.sql` 里：表 `profiles`、`households`、`household_members`、`items`、`roadtrip_places`，以及里面的函数、触发器、RLS 策略和 Realtime 配置。不确定某个对象属于哪个应用时，先问用户。
- **数据库变更只能追加新的迁移**：在 `supabase/` 下新建迁移文件，写法参考 `avatar-migration.sql`（例如 `add column if not exists`，可以重复运行）。不要改已经执行过的迁移，不要 `drop` 表或字段，不要写会清空、重写已有数据的语句。迁移由用户自己在 Supabase SQL Editor 里执行，执行前要先让用户看过。
- 同时把改动合并进 `schema.sql`，让新建的项目一次就能建出完整结构。
- 改 SQL 时，在 `supabase/tests/` 里补一个验证脚本，写法参考已有文件：包在事务里，最后回滚，不留任何数据。

### 新增字段时：旧版页面也要安全

家人的设备上可能还开着旧版页面（PWA 缓存、主屏幕 App、两个外壳里没刷新的窗口），新旧版本会同时读写同一份数据。新增字段时必须确认：

1. **旧版保存时不会把新字段冲掉。** 更新只发送改了的字段（参考 `src/lib/backend.ts` 里的 `updateItem` 和 `updateProfile`），不要整行写回，也不要用 `upsert` 写整行。注意 `updatePlace` 会写回所有已知字段，但只要新字段不在它发送的内容里，旧版就不会动到新字段。
2. **新字段可以为空，或者有默认值**，这样旧版插入新行时不会报错。
3. **新版页面要能处理新字段为空的旧数据**，迁移还没执行时也不能崩溃。
4. 交付时说明：你检查了哪几条写入路径，以及为什么旧版页面不会冲掉新字段。
