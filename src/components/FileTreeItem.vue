<template>
  <div class="tree-node">
    <div
      class="tree-item"
      :class="{
        'is-dir': item.is_dir,
        'is-active': isCurrentFile,
        'is-disabled': isNonMarkdownFile,
      }"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      :title="isNonMarkdownFile ? t('sidebar.nonMarkdownHint') : item.name"
      @click="handleClick"
      @contextmenu.prevent.stop="handleContextMenu"
    >
      <!-- 文件夹箭头与图标 -->
      <template v-if="item.is_dir">
        <span class="tree-icon tree-icon--arrow">
          <svg v-if="isOpen" width="9" height="9" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="9" height="9" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="tree-icon tree-icon--folder">
          <svg v-if="isOpen" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4.5C2 3.94772 2.44772 3.5 3 3.5H6L7.5 5.5H13C13.5523 5.5 14 5.94772 14 6.5V7.5M2 8H14L12.5 13H3.5L2 8Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
          </svg>
        </span>
      </template>

      <!-- 文件类型图标 -->
      <template v-else>
        <!-- Markdown 文件图标 -->
        <span class="tree-icon tree-icon--md" v-if="isMarkdown">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M4.5 10.5V6L6.5 8L8.5 6V10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M11.5 7V10M10 8.5L11.5 10L13 8.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <!-- 图片类型图标 -->
        <span class="tree-icon tree-icon--img" v-else-if="isImage">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="5.5" cy="5.5" r="1.2" fill="currentColor"/>
            <path d="M14 10.5L10.5 7L5 12.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <!-- 其他文件通用弱化图标 -->
        <span class="tree-icon tree-icon--file" v-else>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 2H9.5L12.5 5V14H3.5V2Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M9.5 2V5H12.5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
          </svg>
        </span>
      </template>

      <span class="tree-name">{{ item.name }}</span>
    </div>

    <!-- 递归子节点 -->
    <div v-if="item.is_dir && isOpen && item.children">
      <FileTreeItem
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { useAppStore, type FileEntry } from '../stores/app'
import { openMarkdownFile } from '../utils/openFile'
import { isMarkdownFile, isImageFile } from '../utils/file'
import { t } from '../i18n'
import { FILE_TREE_CONTEXT_KEY, type FileTreeContext } from './fileTreeTypes'

const props = defineProps<{
  item: FileEntry
  depth: number
}>()

const store = useAppStore()
const isOpen = ref(false)

const fileTreeContext = inject<FileTreeContext | null>(FILE_TREE_CONTEXT_KEY, null)

const isMarkdown = computed(() => !props.item.is_dir && isMarkdownFile(props.item.name))
const isImage = computed(() => !props.item.is_dir && isImageFile(props.item.name))
const isNonMarkdownFile = computed(() => !props.item.is_dir && !isMarkdown.value)
const isCurrentFile = computed(() => !props.item.is_dir && store.currentFilePath === props.item.path)

// 自动展开祖先目录：如果当前打开的文件在当前目录下，自动展开
watch(
  () => store.currentFilePath,
  (currentPath) => {
    if (props.item.is_dir && currentPath) {
      const dirPrefix = props.item.path.endsWith('/') || props.item.path.endsWith('\\')
        ? props.item.path
        : props.item.path + '/'
      const dirPrefixBackslash = props.item.path + '\\'
      if (currentPath.startsWith(dirPrefix) || currentPath.startsWith(dirPrefixBackslash)) {
        isOpen.value = true
      }
    }
  },
  { immediate: true }
)

// 全部折叠信号监听
if (fileTreeContext) {
  watch(fileTreeContext.collapseSignal, () => {
    if (props.item.is_dir) {
      isOpen.value = false
    }
  })
}

async function handleClick() {
  if (props.item.is_dir) {
    isOpen.value = !isOpen.value
    return
  }

  // 非 Markdown 文件不可点击打开
  if (!isMarkdown.value) return

  await openMarkdownFile(props.item.path, props.item.name)
}

function handleContextMenu(e: MouseEvent) {
  fileTreeContext?.openContextMenu(e, props.item)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
  -webkit-user-select: none;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: background-color 0.08s ease, color 0.08s ease;
  white-space: nowrap;
  overflow: hidden;
  border-radius: var(--radius-md);
  margin: 1px 6px;
}

.tree-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tree-item.is-active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
}

.tree-item.is-dir {
  color: var(--text-primary);
  font-weight: 500;
}

/* 非 Markdown 文件置灰弱化 */
.tree-item.is-disabled {
  opacity: 0.52;
  cursor: default;
  color: var(--text-muted);
}

.tree-item.is-disabled:hover {
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.tree-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tree-icon--arrow {
  width: 12px;
  height: 12px;
  color: var(--text-muted);
  transition: transform 0.1s ease;
}

.tree-icon--folder {
  color: var(--text-secondary);
}

.tree-icon--md {
  color: var(--accent);
  opacity: 0.9;
}

.tree-item:not(.is-active) .tree-icon--md {
  color: var(--text-secondary);
}

.tree-icon--img {
  color: var(--text-muted);
}

.tree-icon--file {
  color: var(--text-muted);
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
</style>
