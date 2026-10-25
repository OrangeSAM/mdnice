import { useAppStore } from '../stores/app'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { renderMarkdown } from '../markdown-it'
import variablesCss from '../styles/variables.css?raw'
import previewCss from '../styles/preview.css?raw'

// 导出能力:复制富文本 / 导出独立 HTML / 打印(PDF)。
// 排版承诺的低频高光时刻,复用预览的渲染管线与主题变量。

const EXPORT_CSS = variablesCss + '\n' + previewCss

function stripMdExt(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd)$/i, '') || 'document'
}

function buildStandaloneHtml(title: string, bodyHtml: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    '<style>',
    'html, body { margin: 0; padding: 0; background: var(--bg-primary); }',
    EXPORT_CSS,
    '</style>',
    '</head>',
    '<body>',
    `<article class="markdown-preview">${bodyHtml}</article>`,
    '</body>',
    '</html>',
  ].join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 复制为富文本:优先取预览成品 DOM(shiki/mermaid/KaTeX 已是最终形态) */
export async function copyRichText(): Promise<boolean> {
  const store = useAppStore()
  if (!store.hasFile) return false

  const live = document.querySelector('.markdown-preview')
  const fragment = live
    ? live.innerHTML
    : renderMarkdown(store.fileContent, store.currentFilePath || undefined).html

  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  container.setAttribute('aria-hidden', 'true')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;'
  container.innerHTML = `<style>${EXPORT_CSS}</style><article class="markdown-preview">${fragment}</article>`
  document.body.appendChild(container)

  try {
    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    const ok = document.execCommand('copy')
    selection?.removeAllRanges()
    return ok
  } catch (e) {
    console.error('Copy rich text failed:', e)
    return false
  } finally {
    container.remove()
  }
}

/** 导出独立 HTML 文件(内嵌当前主题排版) */
export async function exportHtmlFile(): Promise<boolean> {
  const store = useAppStore()
  if (!store.hasFile) return false

  const { html } = renderMarkdown(store.fileContent, store.currentFilePath || undefined)
  const doc = buildStandaloneHtml(store.currentFileName || 'document', html)

  const path = await save({
    title: 'Export HTML',
    defaultPath: stripMdExt(store.currentFileName || 'document') + '.html',
    filters: [{ name: 'HTML', extensions: ['html'] }],
  })
  if (!path) return false

  await writeTextFile(path, doc)
  return true
}

/** 打印 / 存为 PDF:走系统打印对话框,配合 preview.css 的 @media print 样式只输出正文 */
export function printPreview(): boolean {
  if (!document.querySelector('.markdown-preview')) return false
  invoke('print_window').catch((e) => console.error('Print failed:', e))
  return true
}
