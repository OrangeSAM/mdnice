# mdnice

一个基于 Tauri v2 + Vue 3 的本地 Markdown 编辑器,内置主题排版与实时预览。

## 在 macOS 上运行

```bash
pnpm tauri dev
```

这一条命令会自动启动 Vite 前端开发服务器并打开应用窗口(支持热重载)。

> 首次运行前需先完成准备:
> - `pnpm install` 安装前端依赖
> - 安装 [Rust](https://rustup.rs) 工具链(`rustup` 一键安装)
>
> 首次 `pnpm tauri dev` 需要编译 Rust 后端,耗时较长,后续启动会快很多。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm tauri dev` | 开发模式:启动前端 + 打开应用窗口(热重载) |
| `pnpm tauri build` | 构建生产版本(生成 `.app` 及更新签名产物) |
| `pnpm dev` | 仅启动前端 Vite 开发服务器(浏览器预览,无 Tauri 外壳) |
| `pnpm build` | 仅构建前端到 `dist/`(`vue-tsc` 类型检查 + Vite 打包) |

构建产物位于 `src-tauri/target/release/bundle/`,可直接 `open` 其中的 `.app`。

## 故障排查

### macOS 打开应用提示「已损坏,无法打开」

应用未经 Apple 签名/公证,macOS 会给它打上 `com.apple.quarantine` 隔离标记,双击时便报「已损坏」。清掉该属性即可正常打开:

```bash
xattr -cr "/Applications/mdnice.app"
```

本地构建产物同理:

```bash
xattr -cr "src-tauri/target/release/bundle/macos/mdnice.app"
```

> 权限不足时在命令前加 `sudo`;重新安装或重新下载后需再次执行。

## 技术栈

- **Tauri v2** — 跨平台桌面外壳(Rust 后端),含自动更新插件
- **Vue 3 + TypeScript** — 前端框架
- **Vite** — 开发与构建工具链
- **CodeMirror** — 代码编辑器
- **pnpm** — 包管理器

## 项目结构

```
.
├── src/            # Vue 前端源码
├── src-tauri/      # Tauri (Rust) 后端 + 图标 + 构建配置
│   ├── icons/      # 应用图标(含 Android / iOS 全套)
│   └── tauri.conf.json
├── index.html
└── vite.config.ts
```

## 相关文档

- [`TITLEBAR_THEME_INVESTIGATION.md`](./TITLEBAR_THEME_INVESTIGATION.md) — 窗口边缘白边问题的排查记录
- [`docs/notes/product-evolution-2026-07-07.md`](./docs/notes/product-evolution-2026-07-07.md) — 产品演化评估与路线图(v0.2.0, 2026-07-07)

## 许可

MIT
