import { describe, it, expect } from 'vitest'
import {
  isMarkdownFile,
  isImageFile,
  filterMarkdownTree,
  getRelativePath,
} from '../utils/file'
import type { FileEntry } from '../stores/app'

describe('file utils', () => {
  it('identifies markdown files correctly', () => {
    expect(isMarkdownFile('README.md')).toBe(true)
    expect(isMarkdownFile('notes.markdown')).toBe(true)
    expect(isMarkdownFile('doc.mkd')).toBe(true)
    expect(isMarkdownFile('photo.png')).toBe(false)
    expect(isMarkdownFile('script.ts')).toBe(false)
    expect(isMarkdownFile('data.json')).toBe(false)
  })

  it('identifies image files correctly', () => {
    expect(isImageFile('logo.png')).toBe(true)
    expect(isImageFile('banner.jpg')).toBe(true)
    expect(isImageFile('photo.jpeg')).toBe(true)
    expect(isImageFile('icon.svg')).toBe(true)
    expect(isImageFile('doc.md')).toBe(false)
  })

  it('calculates relative path accurately', () => {
    const root = '/Users/test/project'
    expect(getRelativePath('/Users/test/project/images/pic.png', root)).toBe('./images/pic.png')
    expect(getRelativePath('/Users/test/project/doc.md', root)).toBe('./doc.md')
    expect(getRelativePath('/Other/path/doc.md', root)).toBe('/Other/path/doc.md')
  })

  it('filters tree to only markdown files and directories with markdown descendants', () => {
    const tree: FileEntry[] = [
      {
        name: 'assets',
        path: '/project/assets',
        is_dir: true,
        children: [
          { name: 'logo.png', path: '/project/assets/logo.png', is_dir: false },
          { name: 'data.json', path: '/project/assets/data.json', is_dir: false },
        ],
      },
      {
        name: 'docs',
        path: '/project/docs',
        is_dir: true,
        children: [
          { name: 'intro.md', path: '/project/docs/intro.md', is_dir: false },
          { name: 'diagram.png', path: '/project/docs/diagram.png', is_dir: false },
        ],
      },
      {
        name: 'empty-dir',
        path: '/project/empty-dir',
        is_dir: true,
        children: [],
      },
      {
        name: 'package.json',
        path: '/project/package.json',
        is_dir: false,
      },
      {
        name: 'README.md',
        path: '/project/README.md',
        is_dir: false,
      },
    ]

    const filtered = filterMarkdownTree(tree)

    // assets 目录没有 md 文件，应被过滤
    expect(filtered.find((item) => item.name === 'assets')).toBeUndefined()
    // empty-dir 应被过滤
    expect(filtered.find((item) => item.name === 'empty-dir')).toBeUndefined()
    // package.json 应被过滤
    expect(filtered.find((item) => item.name === 'package.json')).toBeUndefined()

    // README.md 应保留
    expect(filtered.find((item) => item.name === 'README.md')).toBeDefined()

    // docs 应保留，且其子项只有 intro.md，diagram.png 被过滤
    const docs = filtered.find((item) => item.name === 'docs')
    expect(docs).toBeDefined()
    expect(docs?.children?.length).toBe(1)
    expect(docs?.children?.[0].name).toBe('intro.md')
  })
})
