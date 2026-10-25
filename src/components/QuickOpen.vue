<template>
  <Transition name="quickopen">
    <div class="quickopen-overlay" v-if="store.showQuickOpen" @mousedown.self="close">
      <div class="quickopen-panel">
        <div class="quickopen-input-wrap">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="quickopen-search-icon">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            class="quickopen-input"
            type="text"
            :placeholder="searchingFolder ? t('qo.searchInFolder') : t('qo.searchFiles')"
            @keydown="onKeydown"
          />
        </div>

        <div class="quickopen-results" ref="listRef">
          <!-- 文件名匹配 -->
          <template v-if="fileMatches.length">
            <div class="quickopen-group-label">{{ t('qo.files') }}</div>
            <div
              v-for="(m, i) in fileMatches"
              :key="m.file.path"
              class="quickopen-item"
              :class="{ active: i === activeIndex }"
              :data-index="i"
              @mousemove="activeIndex = i"
              @click="openItem(m.file)"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="item-icon">
                <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M10 2V4H12" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              <span class="item-name" v-html="highlight(m.file.name, m.match.indices)"></span>
              <span class="item-path">{{ relativePath(m.file.path) }}</span>
            </div>
          </template>

          <!-- 正文匹配 -->
          <template v-if="textMatches.length">
            <div class="quickopen-group-label">{{ t('qo.inText') }}</div>
            <div
              v-for="(m, i) in textMatches"
              :key="`${m.path}:${m.line_number}`"
              class="quickopen-item"
              :class="{ active: fileMatches.length + i === activeIndex }"
              :data-index="fileMatches.length + i"
              @mousemove="activeIndex = fileMatches.length + i"
              @click="openSearchMatch(m)"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="item-icon">
                <path d="M3 3.5H13M3 6.5H13M3 9.5H13M3 12.5H9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              <span class="item-match">
                <span class="item-name" v-html="highlightPlain(m.name)"></span>
                <span class="item-snippet" v-html="highlightPlain(m.snippet)"></span>
              </span>
              <span class="item-line">L{{ m.line_number }}</span>
            </div>
          </template>

          <div v-if="!fileMatches.length && !textMatches.length && query" class="quickopen-empty">
            {{ t('qo.noResults') }}
          </div>
          <div v-if="!query" class="quickopen-empty">
            {{ t('qo.emptyHint') }}
          </div>
        </div>

        <div class="quickopen-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {{ t('qo.navigate') }}</span>
          <span><kbd>↵</kbd> {{ t('qo.open') }}</span>
          <span><kbd>esc</kbd> {{ t('qo.close') }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAppStore, type FileEntry } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'lodash-es'
import { fuzzyMatch } from '../utils/fuzzy'
import { flattenMarkdownFiles } from '../utils/file'
import { openMarkdownFile } from '../utils/openFile'
import { t } from '../i18n'

interface SearchMatch {
  path: string
  name: string
  line_number: number
  snippet: string
}

const store = useAppStore()
const query = ref('')
const inputRef = ref<HTMLInputElement>()
const listRef = ref<HTMLElement>()
const textMatches = ref<SearchMatch[]>([])
const textSearching = ref(false)

const searchingFolder = computed(() => store.fileTree.length > 0)

const fileMatches = computed(() => {
  const q = query.value.trim()
  if (!q) return []
  const files = flattenMarkdownFiles(store.fileTree)
  return files
    .map((file) => ({ file, match: fuzzyMatch(q, file.name) }))
    .filter((x): x is { file: FileEntry; match: NonNullable<ReturnType<typeof fuzzyMatch>> } => x.match !== null)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 8)
})

const activeIndex = computed({
  get: () => activeIndexRef.value,
  set: (v: number) => { activeIndexRef.value = v },
})
const activeIndexRef = ref(0)

const totalResults = computed(() => fileMatches.value.length + textMatches.value.length)

watch(totalResults, () => {
  if (activeIndexRef.value >= totalResults.value) activeIndexRef.value = 0
})

// 正文搜索:文件夹打开且查询 >= 2 字符时,防抖走 Rust 全文搜索
const debouncedTextSearch = debounce(async (q: string) => {
  if (!q || q.trim().length < 2 || !store.lastFolderPath) {
    textMatches.value = []
    textSearching.value = false
    return
  }
  textSearching.value = true
  try {
    const results = await invoke<SearchMatch[]>('search_folder', {
      path: store.lastFolderPath,
      query: q.trim(),
      maxResults: 30,
    })
    // 结果返回时查询可能已变,丢弃过期结果
    if (query.value.trim() === q.trim()) {
      textMatches.value = results
    }
  } catch (e) {
    console.error('Folder search failed:', e)
    textMatches.value = []
  } finally {
    textSearching.value = false
  }
}, 250)

watch(query, (q) => {
  activeIndexRef.value = 0
  debouncedTextSearch(q)
})

watch(
  () => store.showQuickOpen,
  (open) => {
    if (open) {
      query.value = ''
      textMatches.value = []
      activeIndexRef.value = 0
      nextTick(() => inputRef.value?.focus())
    } else {
      debouncedTextSearch.cancel()
    }
  }
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (totalResults.value) activeIndexRef.value = (activeIndexRef.value + 1) % totalResults.value
    scrollToActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (totalResults.value) activeIndexRef.value = (activeIndexRef.value - 1 + totalResults.value) % totalResults.value
    scrollToActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const i = activeIndexRef.value
    if (i < fileMatches.value.length) {
      const m = fileMatches.value[i]
      if (m) openItem(m.file)
    } else {
      const m = textMatches.value[i - fileMatches.value.length]
      if (m) openSearchMatch(m)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

function scrollToActive() {
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-index="${activeIndexRef.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

async function openItem(file: FileEntry) {
  close()
  await openMarkdownFile(file.path, file.name)
}

async function openSearchMatch(m: SearchMatch) {
  close()
  await openMarkdownFile(m.path, m.name)
}

function close() {
  store.showQuickOpen = false
}

function relativePath(path: string): string {
  if (store.lastFolderPath && path.startsWith(store.lastFolderPath)) {
    return path.slice(store.lastFolderPath.length + 1)
  }
  const parts = path.split('/')
  return parts.slice(-2).join('/')
}

// 文件名高亮:按模糊匹配下标包 <mark>
function highlight(text: string, indices: number[]): string {
  if (!indices.length) return escapeHtml(text)
  const set = new Set(indices)
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = escapeHtml(text[i])
    out += set.has(i) ? `<mark>${ch}</mark>` : ch
  }
  return out
}

// 正文片段高亮:大小写不敏感地包住查询词
function highlightPlain(text: string): string {
  const q = query.value.trim()
  if (!q) return escapeHtml(text)
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  let out = ''
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(ql, i)
    if (at === -1) {
      out += escapeHtml(text.slice(i))
      break
    }
    out += escapeHtml(text.slice(i, at)) + `<mark>${escapeHtml(text.slice(at, at + q.length))}</mark>`
    i = at + q.length
  }
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<style scoped>
.quickopen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  z-index: 900;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}

.quickopen-panel {
  width: 560px;
  max-width: calc(100vw - 48px);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.quickopen-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.quickopen-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.quickopen-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
}

.quickopen-input::placeholder {
  color: var(--text-muted);
}

.quickopen-results {
  max-height: 46vh;
  overflow-y: auto;
  padding: 6px;
}

.quickopen-results::-webkit-scrollbar {
  width: 4px;
}

.quickopen-results::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.quickopen-group-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 6px 10px 3px;
}

.quickopen-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
}

.quickopen-item.active {
  background: var(--accent-light);
  color: var(--text-primary);
}

.item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.quickopen-item.active .item-icon {
  color: var(--accent);
}

.item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name :deep(mark) {
  background: transparent;
  color: var(--accent);
  font-weight: 600;
  padding: 0;
}

.item-path {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 45%;
  flex-shrink: 0;
}

.item-match {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-snippet {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-snippet :deep(mark) {
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 2px;
  padding: 0 1px;
}

.item-line {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  flex-shrink: 0;
}

.quickopen-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.quickopen-footer {
  display: flex;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 10px;
}

.quickopen-footer kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 15px;
  margin-right: 3px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 3px;
  font-family: var(--font-mono);
  font-size: 9px;
}

/* 过渡动画 */
.quickopen-enter-active,
.quickopen-leave-active {
  transition: opacity 0.15s ease;
}

.quickopen-enter-active .quickopen-panel,
.quickopen-leave-active .quickopen-panel {
  transition: transform 0.15s ease;
}

.quickopen-enter-from,
.quickopen-leave-to {
  opacity: 0;
}

.quickopen-enter-from .quickopen-panel,
.quickopen-leave-to .quickopen-panel {
  transform: translateY(-8px) scale(0.98);
}
</style>
