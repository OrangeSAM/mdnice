import type MarkdownIt from 'markdown-it'

// ==高亮== 语法(markdown-it-mark 的实现,内置进来避免额外依赖)。
// 走 markdown-it 的 delimiters 机制:tokenize 收集 == 分隔符,ruler2 阶段
// 配对改写为 mark_open / mark_close token,由默认 renderer 输出 <mark>。

const MARKER = 0x3d // '='

function markTokenize(state: any, silent: boolean): boolean {
  const start = state.pos
  if (silent) return false
  if (state.src.charCodeAt(start) !== MARKER) return false

  const scanned = state.scanDelims(state.pos, true)
  if (scanned.length < 2) return false

  let len = scanned.length
  if (len % 2) {
    // 奇数个 = 先落一个普通字符,剩下的按对处理
    const token = state.push('text', '', 0)
    token.content = '='
    len--
  }

  for (let i = 0; i < len; i += 2) {
    const token = state.push('text', '', 0)
    token.content = '=='
    state.delimiters.push({
      marker: MARKER,
      // 关闭「三连星」长度规则,只服务 mark 配对
      length: 0,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    })
  }

  state.pos += scanned.length
  return true
}

// ruler2 阶段签名是 (state),分隔符缓存从 state.delimiters 取
function markPostProcess(state: any): boolean {
  const delimiters = state.delimiters || []
  const loneMarkers: number[] = []

  for (let i = 0; i < delimiters.length; i++) {
    const startDelim = delimiters[i]
    if (startDelim.marker !== MARKER || startDelim.end === -1) continue
    const endDelim = delimiters[startDelim.end]

    const openToken = state.tokens[startDelim.token]
    openToken.type = 'mark_open'
    openToken.tag = 'mark'
    openToken.nesting = 1
    openToken.markup = '=='
    openToken.content = ''

    const closeToken = state.tokens[endDelim.token]
    closeToken.type = 'mark_close'
    closeToken.tag = 'mark'
    closeToken.nesting = -1
    closeToken.markup = '=='
    closeToken.content = ''

    // 落单的 = 可能被误拆进相邻 token,记录待修正
    const prev = state.tokens[endDelim.token - 1]
    if (prev && prev.type === 'text' && prev.content === '=') {
      loneMarkers.push(endDelim.token - 1)
    }
  }

  // 奇数长度的 == 序列拆分方向修正(官方插件的 lone marker 处理)
  while (loneMarkers.length) {
    const i = loneMarkers.pop()!
    let j = i + 1
    if (j < state.tokens.length && state.tokens[j].type === 'mark_close') {
      j++
    }
    if (
      i + 1 < state.tokens.length &&
      j < state.tokens.length &&
      state.tokens[i + 1].type === 'mark_open' &&
      state.tokens[j].type === 'text' &&
      state.tokens[i + 1].markup === '==' &&
      state.tokens[j].content.charCodeAt(0) === MARKER
    ) {
      state.tokens[j].content = '=' + state.tokens[j].content
      state.tokens[i + 1].content = state.tokens[i + 1].content.slice(2)
    }
  }

  return true
}

export default function markPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('emphasis', 'mark', markTokenize)
  md.inline.ruler2.before('emphasis', 'mark', markPostProcess)
}
