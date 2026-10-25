import type MarkdownIt from 'markdown-it'
import { convertFileSrc } from '@tauri-apps/api/core'

// 预览渲染在 webview 里,相对路径图片默认会解析到应用自身 origin 而不是文件系统,
// 导致笔记里的 ![](./img.png) 全部裂图。这里把本地路径改写为 Tauri asset 协议地址。
// 需要配合 tauri.conf.json 的 app.security.assetProtocol 开关。

const PROTOCOL_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

let homeDirCache = ''

/** convertFileSrc 依赖 Tauri 注入的 internals;纯浏览器 dev (pnpm dev) 下兜底拼等价格式 */
function convertToAssetUrl(path: string): string {
  try {
    return convertFileSrc(path)
  } catch {
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')) {
      return `http://asset.localhost/${encodeURIComponent(path)}`
    }
    return `asset://localhost/${encodeURIComponent(path)}`
  }
}

/** 启动时由 App.vue 调用一次,用于支持 ~ 开头的图片路径 */
export function setHomeDir(dir: string): void {
  homeDirCache = dir.replace(/[\\/]+$/, '')
}

/** 把 markdown 里的图片 src 解析成本地绝对路径;非本地路径(网络/锚点/data:)返回 null */
export function resolveLocalPath(src: string, filePath?: string): string | null {
  if (!src) return null
  if (PROTOCOL_RE.test(src) || src.startsWith('//') || src.startsWith('#')) return null

  let absolute: string
  if (src.startsWith('~')) {
    if (!homeDirCache) return null
    absolute = homeDirCache + src.slice(1)
  } else if (src.startsWith('/')) {
    absolute = src
  } else {
    // 相对路径:以当前文件所在目录为基准
    if (!filePath) return null
    const sepIdx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    if (sepIdx <= 0) return null
    absolute = filePath.slice(0, sepIdx) + '/' + src
  }

  // 归一化 ./ 和 ../(混合分隔符也一并统一为 /)
  const leading = absolute.startsWith('/') ? '/' : ''
  const stack: string[] = []
  for (const part of absolute.split(/[\\/]/)) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return leading + stack.join('/')
}

export default function localImagesPlugin(md: MarkdownIt): void {
  const defaultImage =
    md.renderer.rules.image ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = token.attrGet('src') || ''
    const resolved = resolveLocalPath(src, env?.filePath)
    if (resolved) {
      token.attrSet('src', convertToAssetUrl(resolved))
    }
    return defaultImage(tokens, idx, options, env, self)
  }
}
