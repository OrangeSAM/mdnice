<template>
  <div class="preview-panel">
    <!-- 顶部阅读进度条 -->
    <div class="reading-progress" v-if="store.hasFile && readingProgress > 0">
      <div class="reading-progress-fill" :style="{ width: `${readingProgress * 100}%` }"></div>
    </div>
    <!-- 文内查找条 (⌘F) -->
    <div class="find-bar" v-if="showFind">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="find-icon">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      <input
        ref="findInputRef"
        v-model="findQuery"
        class="find-input"
        type="text"
        :placeholder="t('find.placeholder')"
        @keydown="onFindKeydown"
      />
      <span class="find-count" v-if="findQuery">{{ matchEls.length ? `${activeMatch + 1}/${matchEls.length}` : '0' }}</span>
      <button class="find-btn" @click="stepFind(-1)" :title="t('find.prev')" :disabled="!matchEls.length">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="find-btn" @click="stepFind(1)" :title="t('find.next')" :disabled="!matchEls.length">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="find-btn" @click="closeFind" :title="t('find.close')">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="preview-content" ref="previewContent">
      <div class="markdown-preview" ref="markdownPreview" v-html="renderedContent" @click="handlePreviewClick"></div>
    </div>
    <!-- 大纲侧边栏拖拽把手 -->
    <div
      v-if="store.hasFile && store.showToc && headings.length > 0"
      class="toc-resize-handle"
      @mousedown="startTocResize"
      @dblclick="resetTocWidth"
      title="Drag to resize outline, double click to reset"
    ></div>
    <!-- 阅读大纲实体侧边栏：真实占位，绝不遮挡正文 -->
    <TocPanel
      v-if="store.hasFile && store.showToc && headings.length > 0"
      :headings="headings"
      :active-id="activeHeadingId"
      :style="{ width: `${store.tocWidth}px` }"
      @select="scrollToHeading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'
import { renderMarkdown } from '../markdown-it'
import type { HeadingItem } from '../markdown-it-heading-anchor'
import { toggleTaskInSource } from '../markdown-it-task-checkboxes'
import { initShiki, setShikiTheme, shikiReady, langsLoadedTick } from '../composables/useShiki'
import { isDarkThemeValue } from '../composables/useTheme'
import { t } from '../i18n'
import TocPanel from './TocPanel.vue'

const store = useAppStore()
const renderedContent = ref('')
const previewContent = ref<HTMLElement>()
const markdownPreview = ref<HTMLElement>()
const findInputRef = ref<HTMLInputElement>()
const headings = ref<HeadingItem[]>([])
const activeHeadingId = ref<string>('')
// 当前文件的阅读进度 0~1(驱动顶部进度条 + 持久化到书架)
const readingProgress = ref(0)

// ==================== 文内查找 (⌘F) ====================
const showFind = ref(false)
const findQuery = ref('')
const activeMatch = ref(0)
let matchEls: HTMLElement[] = []

// 当前有效主题是否为深色形态(跟随设置 + 系统;深色系主题共享深色高亮),驱动 shiki/mermaid 主题选择
const isDarkTheme = computed(() => {
  const t = store.settings.theme
  if (t === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return isDarkThemeValue(t)
})

function renderContent(content: string): string {
  if (!content) {
    headings.value = []
    activeHeadingId.value = ''
    return ''
  }
  const result = renderMarkdown(content, store.currentFilePath || undefined)
  headings.value = result.headings
  return result.html
}

// 点击大纲项跳转到对应标题并短暂高亮反馈
function scrollToHeading(id: string) {
  if (!previewContent.value) return
  const target = previewContent.value.querySelector(`#${id}`) as HTMLElement | null
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeHeadingId.value = id
    target.classList.add('heading-focus-highlight')
    setTimeout(() => {
      target.classList.remove('heading-focus-highlight')
    }, 1200)
  }
}

// 阅读进度:滚动比例 0~1,持久化供书架进度条与继续阅读使用
function updateProgress() {
  if (!previewContent.value || !store.hasFile) return
  const el = previewContent.value
  const max = el.scrollHeight - el.clientHeight
  const p = max <= 4 ? 1 : Math.min(1, Math.max(0, el.scrollTop / max))
  readingProgress.value = p
  store.setReadingProgress(store.currentFilePath, p)
}

// ==================== 文内查找实现 ====================

const debouncedFind = debounce(() => runFind(), 150)

watch(findQuery, () => {
  if (showFind.value) debouncedFind()
})

function openFind() {
  showFind.value = true
  nextTick(() => {
    findInputRef.value?.focus()
    findInputRef.value?.select()
    if (findQuery.value.trim()) runFind()
  })
}

function closeFind() {
  showFind.value = false
  clearFindHighlights()
}

// 把 v-html 里已包上的查找 <mark> 还原为纯文本
function clearFindHighlights() {
  if (!markdownPreview.value) return
  const marks = markdownPreview.value.querySelectorAll('mark.preview-find')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize()
  })
  matchEls = []
}

// 遍历预览 DOM 的文本节点,把匹配段包进 <mark class="preview-find">
function runFind() {
  clearFindHighlights()
  const root = markdownPreview.value
  const q = findQuery.value.trim().toLowerCase()
  if (!root || !q) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || !node.nodeValue) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  for (const node of nodes) {
    const text = node.nodeValue || ''
    const lower = text.toLowerCase()
    if (!lower.includes(q)) continue
    const frag = document.createDocumentFragment()
    let pos = 0
    for (;;) {
      const at = lower.indexOf(q, pos)
      if (at === -1) {
        if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)))
        break
      }
      if (at > pos) frag.appendChild(document.createTextNode(text.slice(pos, at)))
      const markEl = document.createElement('mark')
      markEl.className = 'preview-find'
      markEl.textContent = text.slice(at, at + q.length)
      frag.appendChild(markEl)
      matchEls.push(markEl)
      pos = at + q.length
    }
    node.parentNode?.replaceChild(frag, node)
  }

  if (matchEls.length) {
    activeMatch.value = 0
    highlightActiveMatch()
  }
}

function highlightActiveMatch() {
  matchEls.forEach((el) => el.classList.remove('active'))
  const el = matchEls[activeMatch.value]
  if (el) {
    el.classList.add('active')
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

function stepFind(delta: number) {
  if (!matchEls.length) return
  activeMatch.value = (activeMatch.value + delta + matchEls.length) % matchEls.length
  highlightActiveMatch()
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    stepFind(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    closeFind()
  }
}

defineExpose({ openFind })

// ScrollSpy: 滚动时根据视口位置更新当前阅读章节
function updateActiveHeading() {
  if (!previewContent.value || headings.value.length === 0) return
  const container = previewContent.value
  const containerRect = container.getBoundingClientRect()
  const triggerTop = containerRect.top + 80

  let currentId = ''
  for (let i = 0; i < headings.value.length; i++) {
    const h = headings.value[i]
    const el = container.querySelector(`#${h.id}`) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= triggerTop) {
        currentId = h.id
      } else {
        break
      }
    }
  }

  if (!currentId && headings.value.length > 0) {
    currentId = headings.value[0].id
  }

  if (activeHeadingId.value !== currentId) {
    activeHeadingId.value = currentId
  }
}

// 拖拽调整大纲侧边栏宽度
function startTocResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = store.tocWidth

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMouseMove(e: MouseEvent) {
    // 大纲栏位于右侧，向左拖动（clientX 变小）应增加宽度
    const delta = startX - e.clientX
    store.setTocWidth(startWidth + delta)
  }

  function onMouseUp() {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function resetTocWidth() {
  store.setTocWidth(240)
}

// 切换文件时,预览滚动回到顶部
let pendingFileSwitch = false
watch(() => store.currentFilePath, () => {
  pendingFileSwitch = true
})

const debouncedRender = debounce((content: string) => {
  renderedContent.value = renderContent(content)
  nextTick(() => {
    if (!previewContent.value) return
    if (store.pendingScrollRestore !== null) {
      previewContent.value.scrollTop = store.pendingScrollRestore
      store.pendingScrollRestore = null
      pendingFileSwitch = false
    } else if (store.pendingProgressRestore !== null) {
      // 按进度比例恢复:渲染完成后按可视高度换算 scrollTop
      const el = previewContent.value
      const max = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.max(0, max * store.pendingProgressRestore)
      store.pendingProgressRestore = null
      pendingFileSwitch = false
    } else if (pendingFileSwitch) {
      pendingFileSwitch = false
      previewContent.value.scrollTop = 0
    }
    updateActiveHeading()
    updateProgress()
    renderMermaidBlocks()
    // 内容重渲染(编辑/外部刷新)后若查找条开着,重新高亮
    if (showFind.value && findQuery.value.trim()) runFind()
  })
}, 100)

// ==================== Mermaid 异步渲染 ====================

let mermaidModule: typeof import('mermaid') | null = null

async function renderMermaidBlocks() {
  const root = markdownPreview.value
  if (!root) return
  const blocks = root.querySelectorAll<HTMLElement>('.mermaid-block:not([data-rendered])')
  if (!blocks.length) return
  try {
    if (!mermaidModule) mermaidModule = await import('mermaid')
    const mermaid = mermaidModule.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDarkTheme.value ? 'dark' : 'default',
    })
    for (const [i, block] of Array.from(blocks).entries()) {
      const code = decodeURIComponent(block.dataset.code || '')
      if (!code.trim()) continue
      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}-${i}`, code)
        block.innerHTML = svg
        block.setAttribute('data-rendered', '1')
      } catch (err) {
        console.error('Mermaid render error:', err)
        // 保留源码展示,标错样式
        block.setAttribute('data-rendered', 'error')
      }
    }
  } catch (e) {
    console.error('Failed to load mermaid:', e)
  }
}

// ==================== 任务列表勾选 ====================

function handlePreviewClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target instanceof HTMLInputElement && target.classList.contains('task-checkbox')) {
    const idx = Number(target.dataset.taskIndex)
    if (Number.isInteger(idx)) {
      const updated = toggleTaskInSource(store.fileContent, idx)
      if (updated !== store.fileContent) {
        store.setContent(updated)
      }
    }
  }
}

let scrollTicking = false
function handleScroll() {
  if (previewContent.value) {
    const st = previewContent.value.scrollTop
    store.lastScrollTop = st
    store.updateActiveTabScroll(st, readingProgress.value)
  }

  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateActiveHeading()
      updateProgress()
      scrollTicking = false
    })
    scrollTicking = true
  }
}

onMounted(() => {
  previewContent.value?.addEventListener('scroll', handleScroll, { passive: true })
  nextTick(() => {
    updateActiveHeading()
  })

  // shiki 异步初始化;就绪后与每次新语言加载完成时重渲染代码块
  setShikiTheme(isDarkTheme.value)
  initShiki().then(() => {
    debouncedRender(store.fileContent)
  })
  watch(shikiReady, () => debouncedRender(store.fileContent))
  watch(langsLoadedTick, () => debouncedRender(store.fileContent))
  watch(isDarkTheme, (dark) => {
    setShikiTheme(dark)
    debouncedRender(store.fileContent)
  })
})

onUnmounted(() => {
  previewContent.value?.removeEventListener('scroll', handleScroll)
})

watch(
  () => store.fileContent,
  (newContent) => {
    debouncedRender(newContent)
  },
  { immediate: true }
)
</script>

<style scoped>
.preview-panel {
  position: relative;
  height: 100%;
  display: flex;
  overflow: hidden;
  background: var(--bg-primary);
}

/* 顶部阅读进度条 */
.reading-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 20;
  pointer-events: none;
}

.reading-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 0 1px 1px 0;
  transition: width 0.08s linear;
}

/* 文内查找条 */
.find-bar {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.find-icon {
  color: var(--text-muted);
  margin-right: 2px;
}

.find-input {
  width: 180px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  font-family: var(--font-sans);
}

.find-input::placeholder {
  color: var(--text-muted);
}

.find-count {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: center;
}

.find-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.find-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.find-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* 查找命中高亮(v-html 内容,需穿透 scoped) */
.preview-content :deep(mark.preview-find) {
  background: rgba(255, 200, 0, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0;
}

.preview-content :deep(mark.preview-find.active) {
  background: var(--warning);
  color: #1a1a1a;
}

.preview-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

.preview-content::-webkit-scrollbar {
  width: 6px;
}

.preview-content::-webkit-scrollbar-track {
  background: transparent;
}

.preview-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.toc-resize-handle {
  width: 1px;
  cursor: col-resize;
  background: var(--border);
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  transition: background 0.12s ease, width 0.12s ease;
}

.toc-resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
  cursor: col-resize;
}

.toc-resize-handle:hover,
.toc-resize-handle:active {
  width: 3px;
  background: var(--accent);
}
</style>
