<template>
  <div class="preview-panel">
    <div class="preview-toolbar">
      <span class="preview-label">Preview</span>
    </div>
    <div class="preview-content markdown-preview" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
    return `<p style="color: red;">Render error</p>`
  }
}

const debouncedRender = debounce((content: string) => {
  renderedContent.value = renderMarkdown(content)
}, 150)

watch(
  () => store.fileContent,
  (newContent) => {
    debouncedRender(newContent)
  },
  { immediate: true }
)

// Initial render
if (store.fileContent) {
  renderedContent.value = renderMarkdown(store.fileContent)
}
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.preview-toolbar {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.preview-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.preview-content::-webkit-scrollbar {
  width: 6px;
}

.preview-content::-webkit-scrollbar-track {
  background: transparent;
}

.preview-content::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
