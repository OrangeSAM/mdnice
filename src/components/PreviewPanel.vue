<template>
  <div class="preview-panel">
    <div class="preview-content" ref="previewContent">
      <div class="markdown-preview" v-html="renderedContent"></div>
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
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'
import MarkdownIt from 'markdown-it'
import cjkEmphasisPlugin from '../markdown-it-cjk'
import headingAnchorPlugin, { type HeadingItem, type MarkdownEnv } from '../markdown-it-heading-anchor'
import TocPanel from './TocPanel.vue'

const store = useAppStore()
const renderedContent = ref('')
const previewContent = ref<HTMLElement>()
const headings = ref<HeadingItem[]>([])
const activeHeadingId = ref<string>('')

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})
  .use(cjkEmphasisPlugin)
  .use(headingAnchorPlugin)

function renderMarkdown(content: string): string {
  if (!content) {
    headings.value = []
    activeHeadingId.value = ''
    return ''
  }
  try {
    const env: MarkdownEnv = {
      headings: [],
      _headingCount: 0,
    }
    const html = md.render(content, env)
    headings.value = env.headings || []
    return html
  } catch (e) {
    console.error('Markdown render error:', e)
    headings.value = []
    activeHeadingId.value = ''
    return `<p style="color: var(--error);">Render error</p>`
  }
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
  renderedContent.value = renderMarkdown(content)
  nextTick(() => {
    if (!previewContent.value) return
    if (store.pendingScrollRestore !== null) {
      previewContent.value.scrollTop = store.pendingScrollRestore
      store.pendingScrollRestore = null
      pendingFileSwitch = false
    } else if (pendingFileSwitch) {
      pendingFileSwitch = false
      previewContent.value.scrollTop = 0
    }
    updateActiveHeading()
  })
}, 100)

let scrollTicking = false
function handleScroll() {
  if (previewContent.value) {
    store.lastScrollTop = previewContent.value.scrollTop
  }

  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateActiveHeading()
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

if (store.fileContent) {
  renderedContent.value = renderMarkdown(store.fileContent)
  nextTick(() => {
    updateActiveHeading()
  })
}
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  overflow: hidden;
  background: var(--bg-primary);
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
