// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../stores/app'
import TabBar from '../components/TabBar.vue'
import { openMarkdownFile } from '../utils/openFile'

// mock tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd: string, args?: any) => {
    if (cmd === 'read_file') {
      return `# Content of ${args?.path}`
    }
    return []
  }),
}))

describe('Multi-tab Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('打开第一个文件时创建标签页并激活', () => {
    const store = useAppStore()
    expect(store.tabs.length).toBe(0)
    expect(store.hasFile).toBe(false)

    store.openFile('/path/to/a.md', 'a.md', '# Title A')

    expect(store.tabs.length).toBe(1)
    expect(store.activeTabId).toBe('/path/to/a.md')
    expect(store.currentFilePath).toBe('/path/to/a.md')
    expect(store.currentFileName).toBe('a.md')
    expect(store.fileContent).toBe('# Title A')
    expect(store.hasFile).toBe(true)
  })

  it('打开第二个文件时同时保留两个文件，不顶掉前面的文件', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# Title A')
    store.openFile('/path/to/b.md', 'b.md', '# Title B')

    expect(store.tabs.length).toBe(2)
    expect(store.tabs.map((t) => t.path)).toEqual(['/path/to/a.md', '/path/to/b.md'])
    expect(store.activeTabId).toBe('/path/to/b.md')
    expect(store.currentFileName).toBe('b.md')
    expect(store.fileContent).toBe('# Title B')

    // 验证第一个文件内容依然完好无损保存在 store 中
    const tabA = store.tabs.find((t) => t.path === '/path/to/a.md')
    expect(tabA?.content).toBe('# Title A')
  })

  it('打开已打开过的文件时激活已有标签页，不重复创建', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# Title A')
    store.openFile('/path/to/b.md', 'b.md', '# Title B')
    expect(store.tabs.length).toBe(2)

    // 再次打开 a.md
    store.openFile('/path/to/a.md', 'a.md', '# Title A')
    expect(store.tabs.length).toBe(2)
    expect(store.activeTabId).toBe('/path/to/a.md')
    expect(store.currentFileName).toBe('a.md')
    expect(store.fileContent).toBe('# Title A')
  })

  it('在标签页之间自由切换，并保留各自的独立阅读位置', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# Title A')
    store.updateActiveTabScroll(350, 0.4)

    store.openFile('/path/to/b.md', 'b.md', '# Title B')
    store.updateActiveTabScroll(120, 0.15)

    // 切回 a.md
    store.switchTab('/path/to/a.md')
    expect(store.activeTabId).toBe('/path/to/a.md')
    expect(store.pendingScrollRestore).toBe(350)

    // 切回 b.md
    store.switchTab('/path/to/b.md')
    expect(store.activeTabId).toBe('/path/to/b.md')
    expect(store.pendingScrollRestore).toBe(120)
  })

  it('每个标签页拥有独立的 isModified 修改状态', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# Title A')
    store.openFile('/path/to/b.md', 'b.md', '# Title B')

    // 修改当前激活的 b.md
    store.setContent('# Modified Title B')
    expect(store.isModified).toBe(true)

    // a.md 应不受影响，保持未修改
    const tabA = store.tabs.find((t) => t.path === '/path/to/a.md')
    expect(tabA?.isModified).toBe(false)

    // 切换到 a.md
    store.switchTab('/path/to/a.md')
    expect(store.isModified).toBe(false)

    // 切回 b.md
    store.switchTab('/path/to/b.md')
    expect(store.isModified).toBe(true)
    expect(store.fileContent).toBe('# Modified Title B')
  })

  it('关闭非激活标签页时，激活标签页保持不变', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# A')
    store.openFile('/path/to/b.md', 'b.md', '# B')
    store.openFile('/path/to/c.md', 'c.md', '# C')

    expect(store.activeTabId).toBe('/path/to/c.md')

    // 关闭 a.md
    store.closeTab('/path/to/a.md')
    expect(store.tabs.length).toBe(2)
    expect(store.activeTabId).toBe('/path/to/c.md')
    expect(store.tabs.map((t) => t.name)).toEqual(['b.md', 'c.md'])
  })

  it('关闭激活标签页时，自动激活相邻标签页', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# A')
    store.openFile('/path/to/b.md', 'b.md', '# B')
    store.openFile('/path/to/c.md', 'c.md', '# C')

    // 当前在 c.md (最后一个)，关闭 c.md 应激活 b.md
    store.closeTab('/path/to/c.md')
    expect(store.tabs.length).toBe(2)
    expect(store.activeTabId).toBe('/path/to/b.md')

    // 当前在 b.md，激活 a.md
    store.switchTab('/path/to/a.md')
    // 关闭 a.md，应激活相邻的 b.md
    store.closeTab('/path/to/a.md')
    expect(store.tabs.length).toBe(1)
    expect(store.activeTabId).toBe('/path/to/b.md')
  })

  it('关闭全部标签页后，状态重置为无文件欢迎页', () => {
    const store = useAppStore()
    store.openFile('/path/to/a.md', 'a.md', '# A')
    expect(store.hasFile).toBe(true)

    store.closeTab('/path/to/a.md')
    expect(store.tabs.length).toBe(0)
    expect(store.activeTabId).toBe('')
    expect(store.currentFilePath).toBe('')
    expect(store.hasFile).toBe(false)
  })

  it('批量操作: closeOtherTabs / closeTabsToRight / closeAllTabs', () => {
    const store = useAppStore()
    store.openFile('/path/1.md', '1.md', '1')
    store.openFile('/path/2.md', '2.md', '2')
    store.openFile('/path/3.md', '3.md', '3')
    store.openFile('/path/4.md', '4.md', '4')

    // 关闭 2 右侧的所有标签 (即 3, 4)
    store.closeTabsToRight('/path/2.md')
    expect(store.tabs.map((t) => t.name)).toEqual(['1.md', '2.md'])
    expect(store.activeTabId).toBe('/path/2.md')

    // 关闭其他，仅保留 1.md
    store.closeOtherTabs('/path/1.md')
    expect(store.tabs.length).toBe(1)
    expect(store.activeTabId).toBe('/path/1.md')

    // 关闭全部
    store.closeAllTabs()
    expect(store.tabs.length).toBe(0)
    expect(store.hasFile).toBe(false)
  })

  it('循环切换标签页: nextTab / prevTab', () => {
    const store = useAppStore()
    store.openFile('/path/1.md', '1.md', '1')
    store.openFile('/path/2.md', '2.md', '2')
    store.openFile('/path/3.md', '3.md', '3')

    expect(store.activeTabId).toBe('/path/3.md')
    store.nextTab() // 循环回到 1
    expect(store.activeTabId).toBe('/path/1.md')
    store.nextTab() // 2
    expect(store.activeTabId).toBe('/path/2.md')
    store.prevTab() // 1
    expect(store.activeTabId).toBe('/path/1.md')
    store.prevTab() // 3
    expect(store.activeTabId).toBe('/path/3.md')
  })

  it('拖拽排序: reorderTabs', () => {
    const store = useAppStore()
    store.openFile('/path/1.md', '1.md', '1')
    store.openFile('/path/2.md', '2.md', '2')
    store.openFile('/path/3.md', '3.md', '3')

    // 把下标 2 的 3.md 拖到最前面下标 0
    store.reorderTabs(2, 0)
    expect(store.tabs.map((t) => t.name)).toEqual(['3.md', '1.md', '2.md'])
  })

  it('openMarkdownFile 统一入口支持多标签页打开与切换', async () => {
    const store = useAppStore()
    await openMarkdownFile('/test/doc1.md', 'doc1.md')
    await openMarkdownFile('/test/doc2.md', 'doc2.md')

    expect(store.tabs.length).toBe(2)
    expect(store.activeTabId).toBe('/test/doc2.md')

    // 再次调用打开 doc1.md 应该切换过去
    await openMarkdownFile('/test/doc1.md', 'doc1.md')
    expect(store.tabs.length).toBe(2)
    expect(store.activeTabId).toBe('/test/doc1.md')
  })
})

describe('TabBar Component UI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('根据 store.tabs 渲染标签项并标记 active 与 modified', async () => {
    const store = useAppStore()
    store.openFile('/path/a.md', 'a.md', '# A')
    store.openFile('/path/b.md', 'b.md', '# B')
    store.setContent('# B Modified')

    const wrapper = mount(TabBar)

    const items = wrapper.findAll('.tab-item')
    expect(items.length).toBe(2)

    // 第一个未激活
    expect(items[0].classes()).not.toContain('active')
    expect(items[0].classes()).not.toContain('modified')
    expect(items[0].text()).toContain('a.md')

    // 第二个激活且修改
    expect(items[1].classes()).toContain('active')
    expect(items[1].classes()).toContain('modified')
    expect(items[1].text()).toContain('b.md')
    expect(items[1].find('.tab-status').exists()).toBe(true)
  })

  it('点击标签项切换激活标签', async () => {
    const store = useAppStore()
    store.openFile('/path/a.md', 'a.md', '# A')
    store.openFile('/path/b.md', 'b.md', '# B')
    expect(store.activeTabId).toBe('/path/b.md')

    const wrapper = mount(TabBar)
    const items = wrapper.findAll('.tab-item')
    await items[0].trigger('click')

    expect(store.activeTabId).toBe('/path/a.md')
  })

  it('点击关闭按钮关闭该标签页', async () => {
    const store = useAppStore()
    store.openFile('/path/a.md', 'a.md', '# A')
    store.openFile('/path/b.md', 'b.md', '# B')

    const wrapper = mount(TabBar)
    const closeBtns = wrapper.findAll('.tab-close')
    await closeBtns[0].trigger('click')

    expect(store.tabs.length).toBe(1)
    expect(store.tabs[0].name).toBe('b.md')
  })

  it('点击加号按钮 emit open-file 事件', async () => {
    const store = useAppStore()
    store.openFile('/path/a.md', 'a.md', '# A')

    const wrapper = mount(TabBar)
    const addBtn = wrapper.find('.tab-action-btn')
    await addBtn.trigger('click')

    expect(wrapper.emitted('open-file')).toBeTruthy()
  })
})
