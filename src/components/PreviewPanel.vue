<template>
  <div class="preview-panel">
    <div class="preview-content" ref="previewContent">
      <div class="markdown-preview" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'
import MarkdownIt from 'markdown-it'
import cjkEmphasisPlugin from '../markdown-it-cjk'

const store = useAppStore()
const renderedContent = ref('')
const previewContent = ref<HTMLElement>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
}).use(cjkEmphasisPlugin)

function renderMarkdown(content: string): string {
  if (!content) return ''
  try {
    return md.render(content)
  } catch (e) {
    console.error('Markdown render error:', e)
    return `<p style="color: var(--error);">Render error</p>`
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
  })
}, 100)

// 滚动时记录位置;节流由 useSession 的 debounce 负责,停止滚动 500ms 后才持久化
function handleScroll() {
  if (previewContent.value) {
    store.lastScrollTop = previewContent.value.scrollTop
  }
}

onMounted(() => {
  previewContent.value?.addEventListener('scroll', handleScroll, { passive: true })
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
}
</script>

<style scoped>
.preview-panel {
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
