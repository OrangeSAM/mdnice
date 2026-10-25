import type MarkdownIt from 'markdown-it'

// 交互式任务列表:把 - [ ] / - [x] 渲染成可点击的 checkbox。
// 点击行为由 PreviewPanel 处理:按 data-task-index(文档序)找到源码中
// 第 n 个任务标记并翻转 [ ]/[x],随后自动保存 + 重渲染。

// 匹配列表项开头的任务标记:"- [ ] " / "* [x] " / "1. [X] "(用于源码行)
export const TASK_MARKER_RE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/

// inline token 的 content 不含列表符号,直接以 [ ]/[x] 开头
const TASK_INLINE_RE = /^\[([ xX])\]\s+/

export function toggleTaskInSource(content: string, index: number): string {
  const lineRe = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/gm
  let i = 0
  return content.replace(lineRe, (whole, pre: string, mark: string, post: string) => {
    if (i++ === index) {
      return `${pre}${mark === ' ' ? 'x' : ' '}${post}`
    }
    return whole
  })
}

export default function taskCheckboxPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'task-checkboxes', (state) => {
    const tokens = state.tokens
    let taskIndex = 0

    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') continue
      if (tokens[i - 1].type !== 'paragraph_open') continue
      // 任务项结构:list_item_open > paragraph_open > inline
      if (i < 2 || tokens[i - 2].type !== 'list_item_open') continue

      const inline = tokens[i]
      const m = TASK_INLINE_RE.exec(inline.content)
      if (!m) continue
      const checked = m[1].toLowerCase() === 'x'

      tokens[i - 2].attrJoin('class', 'task-list-item')

      // 去掉 inline 内容里的 [ ]/[x] 前缀(首个 text 子节点开头)
      const first = inline.children?.[0]
      if (first && first.type === 'text') {
        const mm = TASK_INLINE_RE.exec(first.content)
        if (mm) {
          first.content = first.content.slice(mm[0].length)
        }
      }

      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.content =
        `<input type="checkbox" class="task-checkbox" data-task-index="${taskIndex}"` +
        (checked ? ' checked' : '') +
        '>'
      inline.children?.unshift(checkbox)
      taskIndex++
    }
  })
}
