import type { FileEntry } from '../stores/app'

/**
 * 递归查找目录树中的第一个 Markdown 文件 (优先匹配 README.md)
 */
export function findFirstMarkdownFile(entries: FileEntry[]): FileEntry | null {
  // 1. 优先匹配当前层级的 README.md
  const readme = entries.find(
    (e) => !e.is_dir && /^readme\.(md|markdown|mdown|mkd)$/i.test(e.name)
  )
  if (readme) return readme

  // 2. 匹配当前层级的第一个 Markdown 文件
  const firstMd = entries.find(
    (e) => !e.is_dir && /\.(md|markdown|mdown|mkd)$/i.test(e.name)
  )
  if (firstMd) return firstMd

  // 3. 递归查找子目录中的 Markdown 文件
  for (const entry of entries) {
    if (entry.is_dir && entry.children && entry.children.length > 0) {
      const found = findFirstMarkdownFile(entry.children)
      if (found) return found
    }
  }

  return null
}

/** 深度优先把目录树拍平成文件列表(仅 Markdown 文件),供快速打开使用 */
export function flattenMarkdownFiles(entries: FileEntry[]): FileEntry[] {
  const out: FileEntry[] = []
  const walk = (items: FileEntry[]) => {
    for (const item of items) {
      if (item.is_dir) {
        if (item.children) walk(item.children)
      } else if (/\.(md|markdown|mdown|mkd)$/i.test(item.name)) {
        out.push(item)
      }
    }
  }
  walk(entries)
  return out
}
