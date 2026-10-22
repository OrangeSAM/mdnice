import type MarkdownIt from 'markdown-it'

export interface HeadingItem {
  id: string
  level: number
  text: string
}

export interface MarkdownEnv {
  headings?: HeadingItem[]
  _headingCount?: number
  [key: string]: any
}

function extractText(token: any): string {
  if (!token) return ''
  if (token.children && token.children.length > 0) {
    return token.children
      .map((child: any) => {
        if (child.type === 'text' || child.type === 'code_inline') {
          return child.content
        }
        if (child.children) {
          return extractText(child)
        }
        return ''
      })
      .join('')
      .trim()
  }
  return (token.content || '').trim()
}

export default function headingAnchorPlugin(md: MarkdownIt) {
  const originalHeadingOpen =
    md.renderer.rules.heading_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.heading_open = function (tokens, idx, options, env: MarkdownEnv, self) {
    const token = tokens[idx]
    const level = parseInt(token.tag.slice(1), 10) || 1
    const nextToken = tokens[idx + 1]
    const text = extractText(nextToken)

    if (env._headingCount === undefined) {
      env._headingCount = 0
    }
    const id = `heading-${env._headingCount++}`

    token.attrSet('id', id)
    token.attrJoin('class', 'preview-heading')

    if (env.headings) {
      env.headings.push({
        id,
        level,
        text: text || `Heading ${env._headingCount}`,
      })
    }

    return originalHeadingOpen(tokens, idx, options, env, self)
  }
}
