<template>
  <div class="preview-panel">
    <div class="preview-content markdown-preview" ref="previewContent" v-html="renderedContent"></div>
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
