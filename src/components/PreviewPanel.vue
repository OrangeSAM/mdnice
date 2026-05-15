<template>
  <div class="preview-panel">
    <div class="preview-content markdown-preview" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'
import MarkdownIt from 'markdown-it'

const store = useAppStore()
const renderedContent = ref('')

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

const debouncedRender = debounce((content: string) => {
  renderedContent.value = renderMarkdown(content)
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
