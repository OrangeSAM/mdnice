import type { FileEntry } from '../stores/app'

export const MARKDOWN_EXTENSIONS_REGEX = /\.(md|markdown|mdown|mkd)$/i
export const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i

export function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS_REGEX.test(name)
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS_REGEX.test(name)
}

/**
 * 递归检查目录项是否包含 Markdown 文件
 */
export function hasMarkdownDescendant(entry: FileEntry): boolean {
  if (!entry.is_dir) {
    return isMarkdownFile(entry.name)
  }
  if (!entry.children || entry.children.length === 0) {
    return false
  }
  return entry.children.some(hasMarkdownDescendant)
}

/**
 * 过滤文件树：仅保留 Markdown 文件，以及包含 Markdown 文件的目录
 */
export function filterMarkdownTree(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = []
  for (const item of entries) {
    if (item.is_dir) {
      const filteredChildren = item.children ? filterMarkdownTree(item.children) : []
      if (filteredChildren.length > 0) {
        result.push({
          ...item,
          children: filteredChildren,
        })
      }
    } else if (isMarkdownFile(item.name)) {
      result.push(item)
    }
  }
  return result
}

/**
 * 计算相对于根目录的相对路径 (如 ./assets/icon.png)
 */
export function getRelativePath(fullPath: string, rootPath: string): string {
  if (!rootPath) return fullPath
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '')
  const normalizedFull = fullPath.replace(/\\/g, '/')
  if (normalizedFull.startsWith(normalizedRoot)) {
    const rel = normalizedFull.slice(normalizedRoot.length).replace(/^\//, '')
    return './' + rel
  }
  return fullPath
}

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
    (e) => !e.is_dir && isMarkdownFile(e.name)
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
      } else if (isMarkdownFile(item.name)) {
        out.push(item)
      }
    }
  }
  walk(entries)
  return out
}
