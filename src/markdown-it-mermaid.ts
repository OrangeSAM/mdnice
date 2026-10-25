import type MarkdownIt from 'markdown-it'

// Mermaid 图表:```mermaid 围栏渲染为占位块,源码放 data-code(encodeURIComponent 编码),
// 由 PreviewPanel 在渲染后异步 import('mermaid') 替换为 SVG。
// 动态 import 让 mermaid(体积很大)单独成 chunk,只有真正用到时才加载。

export default function mermaidPlugin(md: MarkdownIt): void {
  const defaultFence =
    md.renderer.rules.fence?.bind(md.renderer.rules) ||
    ((tokens: any[], idx: number, options: any, env: any, self: any) =>
      self.renderToken(tokens, idx, options))

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = (token.info || '').trim().split(/\s+/)[0]?.toLowerCase()
    if (info !== 'mermaid') {
      return defaultFence(tokens, idx, options, env, self)
    }
    const encoded = encodeURIComponent(token.content)
    return (
      `<div class="mermaid-block" data-code="${encoded}">` +
      `<pre class="mermaid-source">${md.utils.escapeHtml(token.content)}</pre>` +
      `</div>`
    )
  }
}
