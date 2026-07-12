<template>
  <div class="preview-panel">
    <div class="preview-content" ref="previewContent">
      <div class="markdown-preview" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'
import MarkdownIt from 'markdown-it'

const store = useAppStore()
const renderedContent = ref('')
const previewContent = ref<HTMLElement>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

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
  if (pendingFileSwitch) {
    pendingFileSwitch = false
    nextTick(() => {
      if (previewContent.value) previewContent.value.scrollTop = 0
    })
  }
}, 100)

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
