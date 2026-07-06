# Tauri v2 macOS 标题栏主题同步 — 调查记录

## 问题

mdnice app 的深色/浅色模式无法同步到 macOS 原生窗口标题栏（红黄绿按钮那一行），标题栏始终是白色。

## 尝试过但失败的方案

### 1. JS API: `@tauri-apps/api/app` 的 `setTheme()`
Tauri v2 中这个 API 存在但对 macOS 标题栏无效。

### 2. JS API: `getCurrentWindow().setTheme()`
来自 `@tauri-apps/api/window`。调用成功无报错，但只改变 DevTools 的配色，不影响原生标题栏。

### 3. Rust 端 `window.set_theme(Some(tauri::Theme::Dark))`
编译通过但对标题栏无效。

### 4. Rust 端通过 `cocoa` crate 直接调用 `NSApplication.setAppearance`
添加了 `cocoa` 和 `objc` 依赖，用 Objective-C API 直接设置 `NSAppearance`。未验证效果（被跳过了）。

### 5. `tauri.conf.json` 设置 `"titleBarStyle": "Transparent"`
标题栏仍然是白色，无效果。

## 部分可行的方案

### 6. `"titleBarStyle": "Overlay"` + 顶部 titlebar div
原生标题栏消失，红黄绿按钮浮在 WebView 内容上。标题栏区域的颜色由 CSS `var(--bg-primary)` 控制，能跟随主题变化。**但仍有一丢丢白色边框残留**，来源不明，可能是 macOS 窗口圆角处的原生背景色。

## 参考项目 — cc-history-viewer

项目路径：`/Users/liuyibi/Desktop/claude-playground/claude-history-viewer/`

该项目能正确切换标题栏颜色。分析后发现：
- **没有任何代码**去调用 Tauri API 设置窗口主题
- `tauri.conf.json` 也没有 `titleBarStyle` 等特殊配置
- 但标题栏确实跟随深色/浅色切换
- 可能原因：该项目没有在 Rust `setup()` 里强制 `set_theme()`，macOS 可能自动跟随了系统主题

## 当前状态 (2026-05-16)

- 使用 `"titleBarStyle": "Overlay"` + `"hiddenTitle": true`
- 顶部有 28px 的 `.titlebar` div 作为拖拽区域
- 标题栏区域大部分跟随主题，但有白色边框残留
- **未解决**：白色边框来源不明

## 已解决 (2026-07-06)

**真正的根因和 Tauri / NSWindow / titleBarStyle 完全无关**——上面所有调查方向都在错的层面上找问题。

### 根因：body 默认 margin，不是原生窗口

项目里没有任何 CSS reset。WebKit 默认给 `<body>` 加 `8px` margin，而应用的主题背景色 `var(--bg-primary)` 只画在 `#app`（body 内的子 div）上，`<body>` 自身背景保持默认白色。

用像素级截图对比验证：1200×800 窗口截图实际是 2400×1600（2x 缩放），白边测出来精确是 **16px = 8px × 2**，和 body 默认 margin 严丝合缝对上。且白边只出现在 top/left/right，bottom 没有——因为 `.app` 定死 `height: 100vh` 把 body 撑到刚好视口高，多出来的那 8px margin 被挤到视口外看不见了。这个不对称分布也是排除"NSWindow 圆角背景色"假说的关键证据（那样的话四边应该对称）。

参考项目 `cc-history-viewer` 没有这个问题不是因为标题栏配置特殊，纯粹是巧合/布局差异掩盖了同样的 8px margin 效应。

### 修复

`src/styles/variables.css` 顶部加：

```css
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background: var(--bg-primary);
}
```

### 之前 Rust 端 set_theme / set_background_color 的改动 —— 已回退

在定位到真正病根之前，先按"标题栏该跟原生窗口主题同步"的假设把 `set_window_theme` 从空壳改成了真正调用 `window.set_theme()` + `window.set_background_color()`（同步 NSApp appearance 和 NSWindow 背景色），并在 `useTheme.ts` 里加了 `invoke('set_window_theme', ...)` 调用。

确认 CSS reset 是唯一真正需要的修复后，这段代码被判定为不必要的复杂度（基于错误假设加的、没解决实际问题，还多了一次每次切主题都要发的 IPC round-trip）——**已回退**：
- `src-tauri/src/commands/settings.rs`：`set_window_theme` 恢复成原来的空壳 `Ok(())`
- `src/composables/useTheme.ts`：去掉 `invoke`/`syncWindowTheme`，`applyTheme` 只做 `document.documentElement.setAttribute('data-theme', ...)`

### 教训

1. 下次遇到"应用背景色和窗口边缘不一致"类问题，**先用像素级截图对比排查是哪一层**（CSS body/html vs NSWindow vs WebView），别一上来就假设是原生窗口 API 没生效。8px 这个数字是经典的浏览器 UA 默认样式坑，肉眼在深色主题下很容易被误判成"原生标题栏没跟主题走"。
2. 找到真正根因后，要回头清掉之前基于错误假设加的代码，不要因为"看起来无害"就留着——多余的 IPC 调用和原生 API 依赖会增加维护面，且会误导下一个看代码的人以为原生窗口同步是必要的。

## 涉及的文件（最终状态）

- `src/styles/variables.css` — **唯一的修复点**：body/html margin reset
- `src-tauri/src/commands/settings.rs` — `set_window_theme` 是空壳（historic，未删除是因为前端调用点已清空，保留 command 签名不影响任何功能）
- `src/App.vue` — titlebar div（跟主题渲染有关，未涉及原生窗口 API）
- `src/composables/useTheme.ts` — 主题切换逻辑，仅操作 `data-theme` 属性，不再调用任何 Tauri 窗口 API
