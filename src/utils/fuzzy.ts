// 轻量模糊匹配:pattern 是 text 的子序列即命中,越紧凑、越靠前、命中词首得分越高。
// 用于 ⌘P 快速打开的文件名过滤,不追求搜索引擎级相关度。

export interface FuzzyMatch {
  /** 越大越好 */
  score: number
  /** 命中字符在 text 中的下标,用于高亮 */
  indices: number[]
}

const WORD_BOUNDARY_BONUS = 15
const CONSECUTIVE_BONUS = 8
const START_PENALTY_PER_CHAR = 1
const GAP_PENALTY_PER_CHAR = 2

export function fuzzyMatch(pattern: string, text: string): FuzzyMatch | null {
  const p = pattern.toLowerCase()
  const t = text.toLowerCase()
  if (!p) return { score: 0, indices: [] }

  const indices: number[] = []
  let score = 0
  let ti = 0
  let prevMatch = -2

  for (let pi = 0; pi < p.length; pi++) {
    const ch = p[pi]
    let found = -1
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti
        break
      }
      ti++
    }
    if (found === -1) return null

    // 词首加分:首字符、或前面是分隔符(空格/-/_/./数字)
    const boundary =
      found === 0 || /[\s\-_./\\(\[{]/.test(t[found - 1] || '')
    if (boundary) score += WORD_BOUNDARY_BONUS
    if (found === prevMatch + 1) score += CONSECUTIVE_BONUS
    score -= found * START_PENALTY_PER_CHAR
    if (prevMatch >= 0 && found > prevMatch + 1) {
      score -= (found - prevMatch - 1) * GAP_PENALTY_PER_CHAR
    }

    indices.push(found)
    prevMatch = found
    ti = found + 1
  }

  return { score, indices }
}
