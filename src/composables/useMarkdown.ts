import MarkdownIt from 'markdown-it'
import { ref, onMounted } from 'vue'

let md: MarkdownIt | null = null
const isReady = ref(false)

export function useMarkdown() {
  const init = async () => {
    if (md) return

    md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
          } catch (__) {}
        }
        return `<pre class="hljs"><code>${md!.utils.escapeHtml(str)}</code></pre>`
      },
    })

    isReady.value = true
  }

  const render = (content: string): string => {
    if (!md) return ''
    return md.render(content)
  }

  onMounted(() => {
    init()
  })

  return { render, isReady, init }
}

// Simple highlight.js-like syntax highlighting
const hljs = {
  getLanguage(lang: string): boolean {
    const langs = ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'html', 'css', 'json', 'bash', 'shell', 'sql', 'yaml', 'toml', 'markdown', 'c', 'cpp', 'ruby', 'php', 'swift', 'kotlin']
    return langs.includes(lang)
  },
  highlight(code: string, { language }: { language: string }): { value: string } {
    return { value: escapeHtml(code) }
  },
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
