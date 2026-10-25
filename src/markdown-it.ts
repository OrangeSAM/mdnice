import MarkdownIt from 'markdown-it'
import footnotePlugin from 'markdown-it-footnote'
import githubAlertsPlugin from 'markdown-it-github-alerts'
import { katex as katexPlugin } from '@mdit/plugin-katex'
import cjkEmphasisPlugin from './markdown-it-cjk'
import headingAnchorPlugin, { type HeadingItem, type MarkdownEnv } from './markdown-it-heading-anchor'
import localImagesPlugin from './markdown-it-local-images'
import taskCheckboxPlugin from './markdown-it-task-checkboxes'
import mermaidPlugin from './markdown-it-mermaid'
import markPlugin from './markdown-it-mark'
import { highlightCode } from './composables/useShiki'

// 单一渲染管线:预览、导出、测试共用这一个 markdown-it 实例配置,
// 保证「所见即所得导出」不会出现两套渲染行为。

export interface RenderResult {
  html: string
  headings: HeadingItem[]
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (code, lang) => highlightCode(code, lang),
})
  .use(cjkEmphasisPlugin)
  .use(markPlugin)
  .use(headingAnchorPlugin)
  .use(localImagesPlugin)
  .use(taskCheckboxPlugin)
  .use(mermaidPlugin)
  .use(footnotePlugin)
  .use(githubAlertsPlugin)
  .use(katexPlugin)

export function renderMarkdown(content: string, filePath?: string): RenderResult {
  if (!content) {
    return { html: '', headings: [] }
  }
  try {
    const env: MarkdownEnv = {
      headings: [],
      _headingCount: 0,
      filePath,
    }
    const html = md.render(content, env)
    return { html, headings: env.headings || [] }
  } catch (e) {
    console.error('Markdown render error:', e)
    return { html: `<p style="color: var(--error);">Render error</p>`, headings: [] }
  }
}
