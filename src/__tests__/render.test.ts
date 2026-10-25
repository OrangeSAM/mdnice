import { describe, it, expect, beforeAll } from 'vitest'
import { renderMarkdown } from '../markdown-it'
import { resolveLocalPath, setHomeDir } from '../markdown-it-local-images'
import { toggleTaskInSource } from '../markdown-it-task-checkboxes'
import { fuzzyMatch } from '../utils/fuzzy'

// 渲染管线快照测试:markdown-it 配置是最容易悄悄坏掉的地方,
// CJK 强调、图片路径、任务列表、提示块等行为在这里固化。

describe('renderMarkdown: 基础渲染', () => {
  it('标题带稳定锚点 id,并收集 TOC', () => {
    const { html, headings } = renderMarkdown('# Hello\n\n## World\n')
    expect(html).toContain('id="heading-0"')
    expect(html).toContain('id="heading-1"')
    expect(headings).toEqual([
      { id: 'heading-0', level: 1, text: 'Hello' },
      { id: 'heading-1', level: 2, text: 'World' },
    ])
  })

  it('中文加粗后紧跟文字时 ** 正常闭合(CJK flanking 修复)', () => {
    const { html } = renderMarkdown('**波动不是风险，风险是永久性损失的可能。**他的原话')
    expect(html).toContain('<strong>波动不是风险，风险是永久性损失的可能。</strong>')
    expect(html).not.toContain('**')
  })

  it('==高亮== 语法输出 <mark>', () => {
    const { html } = renderMarkdown('这是==重点内容==没错')
    expect(html).toContain('<mark>重点内容</mark>')
  })

  it('奇数个 = 优雅降级,不吞内容', () => {
    const { html } = renderMarkdown('a == b 是判断')
    expect(html).toContain('a == b 是判断')
    expect(html).not.toContain('<mark>')
  })

  it('链接自动识别(linkify)', () => {
    const { html } = renderMarkdown('see https://example.com here')
    expect(html).toContain('<a href="https://example.com">')
  })

  it('空内容返回空', () => {
    const { html, headings } = renderMarkdown('')
    expect(html).toBe('')
    expect(headings).toEqual([])
  })
})

describe('renderMarkdown: 本地图片路径', () => {
  it('相对路径改写为 asset 协议地址', () => {
    const { html } = renderMarkdown('![img](./assets/pic.png)', '/Users/sam/notes/a.md')
    expect(html).toContain(`src="asset://localhost/${encodeURIComponent('/Users/sam/notes/assets/pic.png')}"`)
  })

  it('~ 开头路径先展开 home 再改写', () => {
    setHomeDir('/Users/sam')
    const { html } = renderMarkdown('![img](~/notes/pic.png)', '/Users/sam/other/a.md')
    expect(html).toContain(`src="asset://localhost/${encodeURIComponent('/Users/sam/notes/pic.png')}"`)
  })

  it('网络图片与锚点不改写', () => {
    const { html } = renderMarkdown(
      '![a](https://example.com/pic.png) ![b](#anchor)',
      '/Users/sam/notes/a.md'
    )
    expect(html).toContain('src="https://example.com/pic.png"')
    expect(html).toContain('src="#anchor"')
  })

  it('resolveLocalPath 归一化 ./ 与 ../ 并统一分隔符', () => {
    expect(resolveLocalPath('./img/pic.png', '/Users/sam/notes/a.md')).toBe(
      '/Users/sam/notes/img/pic.png'
    )
    expect(resolveLocalPath('../img/pic.png', '/Users/sam/notes/sub/a.md')).toBe(
      '/Users/sam/notes/img/pic.png'
    )
    expect(resolveLocalPath('img/pic.png', 'C:\\Users\\sam\\notes\\a.md')).toBe(
      'C:/Users/sam/notes/img/pic.png'
    )
  })
})

describe('renderMarkdown: 任务列表', () => {
  it('渲染可交互 checkbox 并标注序号', () => {
    const { html } = renderMarkdown('- [ ] 未完成\n- [x] 已完成\n')
    expect(html).toContain('class="task-checkbox" data-task-index="0"')
    expect(html).toContain('class="task-checkbox" data-task-index="1" checked')
    expect(html).not.toContain('[ ]')
  })

  it('toggleTaskInSource 翻转第 n 个任务标记', () => {
    const src = '- [ ] a\n- [x] b\n- [ ] c\n'
    expect(toggleTaskInSource(src, 0)).toContain('- [x] a')
    expect(toggleTaskInSource(src, 1)).toContain('- [ ] b')
    expect(toggleTaskInSource(src, 2)).toContain('- [x] c')
    // 越界不动
    expect(toggleTaskInSource(src, 9)).toBe(src)
  })
})

describe('renderMarkdown: 扩展语法', () => {
  it('GitHub 提示块', () => {
    const { html } = renderMarkdown('> [!NOTE]\n> watch out\n')
    expect(html).toContain('markdown-alert-note')
    expect(html).toContain('Note')
  })

  it('脚注', () => {
    const { html } = renderMarkdown('word[^1]\n\n[^1]: the note\n')
    expect(html).toContain('footnote')
    expect(html).toContain('the note')
  })

  it('KaTeX 行内公式', () => {
    const { html } = renderMarkdown('energy $E=mc^2$ done')
    expect(html).toContain('katex')
  })

  it('mermaid 围栏输出占位块(由前端异步替换 SVG)', () => {
    const { html } = renderMarkdown('```mermaid\ngraph TD\nA-->B\n```\n')
    expect(html).toContain('class="mermaid-block"')
    expect(html).toContain(encodeURIComponent('graph TD\nA-->B\n'))
  })

  it('普通代码围栏在无 highlighter 时退化为转义文本', () => {
    const { html } = renderMarkdown('```js\nconst a = "<b>"\n```\n')
    expect(html).toContain('<pre>')
    expect(html).toContain('&quot;')
    expect(html).not.toContain('const a = "<b>"')
  })
})

describe('fuzzyMatch', () => {
  it('子序列命中并给出下标', () => {
    const m = fuzzyMatch('qd', 'quick-open.md')
    expect(m).not.toBeNull()
    expect(m!.indices).toEqual([0, 12])
  })

  it('不命中返回 null', () => {
    expect(fuzzyMatch('zzz', 'readme.md')).toBeNull()
  })

  it('词首命中的得分高于中部命中', () => {
    const start = fuzzyMatch('r', 'readme.md')
    const middle = fuzzyMatch('d', 'readme.md')
    expect(start!.score).toBeGreaterThan(middle!.score)
  })
})
