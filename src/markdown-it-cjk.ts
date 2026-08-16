import type MarkdownIt from 'markdown-it'

// 中文写作里 ** / ~~ 前后通常紧跟中文、中间没有空格,而 CommonMark 的 flanking
// 规则把「。、，：」这类全角标点当成标点,导致
//   **波动不是风险，风险是永久性损失的可能。**他的原话
// 这种写法里,闭合的 ** 被判成「右向不贴边」而失效,星号原样输出。
// 这里把全角 CJK 标点从标点判定里剔除,让 ** / ~~ 在中日韩文本里总是能正常开闭。

// 全角 CJK 标点(与 markdown-it 内部 isPunctChar 命中的 CJK 区段对齐)
function isCjkPunct(code: number): boolean {
  return (
    (code >= 0x3001 && code <= 0x3003) || // 、。〃
    (code >= 0x3008 && code <= 0x3011) || // 〈〉《》「」『』【】
    (code >= 0x3014 && code <= 0x301f) || // 〔〕…〟
    code === 0x3030 || code === 0x303d ||  // 〰〽
    code === 0x30a0 || code === 0x30fb ||  // ゠・
    (code >= 0xff01 && code <= 0xff0f) ||  // ！＂＃＄％＆＇（）＊＋，－．／
    (code >= 0xff1a && code <= 0xff20) ||  // ：；＜＝＞？＠
    (code >= 0xff3b && code <= 0xff40) ||  // ［＼］＾＿｀
    (code >= 0xff5b && code <= 0xff65)     // ｛｜｝～｟｠｡｢｣･､
  )
}

// 与 markdown-it 内置 scanDelims 逻辑一致,只是把 CJK 标点从标点判定里剔除。
// state 用 any:markdown-it 的类型标注不完整(@types 还停在 v12),深引内部类型不稳。
function cjkScanDelims(state: any, md: MarkdownIt, start: number, canSplitWord: boolean) {
  const max = state.posMax
  const marker = state.src.charCodeAt(start)
  const lastChar = start > 0 ? state.src.charCodeAt(start - 1) : 0x20
  let pos = start
  while (pos < max && state.src.charCodeAt(pos) === marker) pos++
  const count = pos - start
  const nextChar = pos < max ? state.src.charCodeAt(pos) : 0x20

  const isLastPunct =
    !isCjkPunct(lastChar) &&
    (md.utils.isMdAsciiPunct(lastChar) || md.utils.isPunctChar(String.fromCharCode(lastChar)))
  const isNextPunct =
    !isCjkPunct(nextChar) &&
    (md.utils.isMdAsciiPunct(nextChar) || md.utils.isPunctChar(String.fromCharCode(nextChar)))
  const isLastWS = md.utils.isWhiteSpace(lastChar)
  const isNextWS = md.utils.isWhiteSpace(nextChar)

  const leftFlanking = !isNextWS && (!isNextPunct || isLastWS || isLastPunct)
  const rightFlanking = !isLastWS && (!isLastPunct || isNextWS || isNextPunct)

  return {
    can_open: leftFlanking && (canSplitWord || !rightFlanking || isLastPunct),
    can_close: rightFlanking && (canSplitWord || !leftFlanking || isNextPunct),
    length: count,
  }
}

// 复刻 markdown-it 内置 emphasis tokenize,只是换用 cjkScanDelims 判 flanking
function emphasisTokenize(state: any, silent: boolean): boolean {
  const start = state.pos
  const marker = state.src.charCodeAt(start)
  if (silent) return false
  if (marker !== 0x5f /* _ */ && marker !== 0x2a /* * */) return false

  const scanned = cjkScanDelims(state, state.md, start, marker === 0x2a)

  for (let i = 0; i < scanned.length; i++) {
    const token = state.push('text', '', 0)
    token.content = String.fromCharCode(marker)
    state.delimiters.push({
      marker,
      length: scanned.length,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    })
  }
  state.pos += scanned.length
  return true
}

// 复刻 markdown-it 内置 strikethrough tokenize,同样换用 cjkScanDelims
function strikethroughTokenize(state: any, silent: boolean): boolean {
  const start = state.pos
  const marker = state.src.charCodeAt(start)
  if (silent) return false
  if (marker !== 0x7e /* ~ */) return false

  const scanned = cjkScanDelims(state, state.md, start, true)
  let len = scanned.length
  const ch = String.fromCharCode(marker)
  if (len < 2) return false

  let token
  if (len % 2) {
    token = state.push('text', '', 0)
    token.content = ch
    len--
  }
  for (let i = 0; i < len; i += 2) {
    token = state.push('text', '', 0)
    token.content = ch + ch
    state.delimiters.push({
      marker,
      length: 0, // 关闭「三连星」长度规则,只服务 strikethrough
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    })
  }
  state.pos += scanned.length
  return true
}

// 用 CJK 感知的 flanking 替换内置 emphasis / strikethrough 的 tokenize;
// postProcess(合并 ** 为 <strong> 等)仍走内置规则,保持行为不变。
export default function cjkEmphasisPlugin(md: MarkdownIt): void {
  md.inline.ruler.at('emphasis', emphasisTokenize)
  md.inline.ruler.at('strikethrough', strikethroughTokenize)
}
