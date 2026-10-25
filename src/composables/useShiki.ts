import { ref } from 'vue'
import type { Highlighter, BundledLanguage } from 'shiki'

// 预览代码块高亮。shiki 全量 bundle 按需动态加载语言语法,首次遇到某语言时
// 先退化为转义纯文本,加载完成后通过 langsLoadedTick 通知预览重渲染。
// shiki 本体也动态 import:主包不背体积,首次进入预览时才拉取。

let highlighter: Highlighter | null = null
let initPromise: Promise<void> | null = null
let currentTheme: 'github-light' | 'github-dark' = 'github-light'

const loadingLangs = new Set<string>()
const unsupportedLangs = new Set<string>()

/** highlighter 就绪且至少完成首次初始化 */
export const shikiReady = ref(false)
/** 有新语言加载完成后自增,订阅方据此重渲染 */
export const langsLoadedTick = ref(0)

export function setShikiTheme(isDark: boolean): void {
  currentTheme = isDark ? 'github-dark' : 'github-light'
}

export async function initShiki(): Promise<void> {
  if (!initPromise) {
    initPromise = import('shiki')
      .then(({ createHighlighter }) =>
        createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: [],
        })
      )
      .then((h) => {
        highlighter = h
        shikiReady.value = true
      })
  }
  return initPromise
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeLang(lang: string): string {
  const l = lang.trim().toLowerCase()
  return l || 'text'
}

export function isShikiLangSupported(lang: string): boolean {
  const l = normalizeLang(lang)
  return !unsupportedLangs.has(l)
}

/** markdown-it highlight 回调用。未就绪/不支持时退化为转义文本 */
export function highlightCode(code: string, lang: string): string {
  const l = normalizeLang(lang)
  if (!highlighter || unsupportedLangs.has(l)) {
    return escapeHtml(code)
  }

  try {
    if (!highlighter.getLoadedLanguages().includes(l)) {
      if (!loadingLangs.has(l)) {
        loadingLangs.add(l)
        highlighter
          .loadLanguage(l as BundledLanguage)
          .then(() => {
            langsLoadedTick.value++
          })
          .catch(() => {
            unsupportedLangs.add(l)
            langsLoadedTick.value++
          })
          .finally(() => {
            loadingLangs.delete(l)
          })
      }
      return escapeHtml(code)
    }
    return highlighter.codeToHtml(code, { lang: l, theme: currentTheme })
  } catch {
    unsupportedLangs.add(l)
    return escapeHtml(code)
  }
}
