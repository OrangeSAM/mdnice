<template>
  <div class="preview-panel">
    <div class="preview-content" ref="previewContent">
      <div class="markdown-preview" v-html="renderedContent"></div>
    </div>
    <!-- 阅读大纲浮动面板：绝对定位在右侧，完全脱离正文流，不影响正文物理居中 -->
    <TocPanel
      v-if="store.hasFile && headings.length > 0"
      :headings="headings"
      :active-id="activeHeadingId"
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
    // 添加平滑淡出高亮反馈
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
  // 视口上方缓冲区 (80px)
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

  // 若还没滚到第一个标题且在页面顶端，默认激活第一个标题
  if (!currentId && headings.value.length > 0) {
    currentId = headings.value[0].id
  }

  if (activeHeadingId.value !== currentId) {
    activeHeadingId.value = currentId
  }
}

// 切换文件时,预览滚动回到顶部(render 完成后再重置,避免被 v-html 更新保留的旧 scrollTop 覆盖)
let pendingFileSwitch = false
watch(() => store.currentFilePath, () => {
  pendingFileSwitch = true
})

const debouncedRender = debounce((content: string) => {
  renderedContent.value = renderMarkdown(content)
  // render 完成后再处理滚动,避免被 v-html 更新保留的旧 scrollTop 覆盖
  nextTick(() => {
    if (!previewContent.value) return
    if (store.pendingScrollRestore !== null) {
      // 启动恢复:回到上次阅读位置(优先于切文件回顶)
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
// 滚动时记录位置并执行 ScrollSpy 追踪当前章节
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
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* 滚动容器:必须是纯视口(height:100% + overflow,自身无 padding)。
   之前把 .preview-content 和 .markdown-preview 合并在同一元素上,content-box
   下 height:100% + padding 会让 padding-box 超出父级视口,底部内容落入父级
   overflow:hidden 的裁切区,导致最后一行滚不到。内容 padding 移到内层
   .markdown-preview(见 styles/preview.css),自然包含在滚动流里。 */
.preview-content {
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
</style>
