<template>
  <div class="sidebar" @contextmenu.prevent>
    <div class="sidebar-header" @contextmenu.prevent.stop="openHeaderContextMenu">
      <span class="sidebar-title" :title="store.lastFolderPath || 'Files'">{{ folderTitle }}</span>
      <div class="sidebar-actions">
        <!-- 快速过滤开关: 仅 Markdown vs 全部文件 -->
        <button
          v-if="store.fileTree.length"
          class="sidebar-action"
          :class="{ 'is-active': store.sidebarFilterMdOnly }"
          @click="store.toggleSidebarFilter()"
          :title="store.sidebarFilterMdOnly ? t('sidebar.filterMdOnly') : t('sidebar.filterAll')"
        >
          <!-- 漏斗/筛选图标 -->
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 3.5H13.5L9.5 8.5V13L6.5 11.5V8.5L2.5 3.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- 全部折叠 -->
        <button
          v-if="store.fileTree.length"
          class="sidebar-action"
          @click="store.collapseAllFolders()"
          :title="t('sidebar.collapseAll')"
        >
          <!-- 全部折叠图标 (上下合拢) -->
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 2L12 6M4 10L8 14L12 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- 刷新目录 -->
        <button
          v-if="store.fileTree.length"
          class="sidebar-action"
          @click="handleRefreshFolder"
          :title="t('sidebar.refresh')"
        >
          <!-- 刷新图标 -->
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C10.15 2.5 12.02 3.73 12.95 5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M13.5 2.5V5.5H10.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 树形内容区 -->
    <div class="sidebar-content" v-if="displayTree.length">
      <FileTreeItem
        v-for="item in displayTree"
        :key="item.path"
        :item="item"
        :depth="0"
      />
    </div>

    <!-- 过滤后为空但实际目录非空 -->
    <div class="sidebar-empty" v-else-if="store.fileTree.length">
      <svg width="28" height="28" viewBox="0 0 16 16" fill="none" class="empty-icon">
        <path d="M2.5 3.5H13.5L9.5 8.5V13L6.5 11.5V8.5L2.5 3.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="empty-hint">{{ t('sidebar.noMdFiles') }}</span>
      <button class="empty-filter-btn" @click="store.toggleSidebarFilter()">
        {{ t('sidebar.showAllHint') }}
      </button>
    </div>

    <!-- 未打开任何文件夹 -->
    <div class="sidebar-empty" v-else>
      <svg width="28" height="28" viewBox="0 0 16 16" fill="none" class="empty-icon">
        <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
        <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      <span class="empty-hint">{{ t('sidebar.noFolder') }}</span>
      <button class="empty-filter-btn" @click="handleOpenFolder">
        {{ t('app.openFolder') }}
      </button>
    </div>

    <!-- 自定义右键上下文菜单 -->
    <div
      v-if="contextMenu.visible && contextMenu.item"
      class="tree-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <div class="menu-header">
        <span class="menu-filename" :title="contextMenu.item.name">{{ contextMenu.item.name }}</span>
      </div>
      <div class="menu-divider"></div>

      <!-- Markdown 文件操作 -->
      <template v-if="!contextMenu.item.is_dir && isMdFile(contextMenu.item.name)">
        <button class="menu-item" @click="handleMenuAction('open')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 2H10L13 5V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
            <path d="M10 2V5H13" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.openInNewTab') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyRelative')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyRelativePath') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyPath')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyPath') }}
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" @click="handleMenuAction('reveal')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.revealInFinder') }}
        </button>
      </template>

      <!-- 非 Markdown 文件操作 (图片、文档、代码等) -->
      <template v-else-if="!contextMenu.item.is_dir">
        <button class="menu-item" @click="handleMenuAction('openDefault')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M10 3H13V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 9L13 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M11 9.5V12C11 12.5523 10.5523 13 10 13H4C3.44772 13 3 12.5523 3 12V6C3 5.44772 3.44772 5 4 5H6.5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.openInDefaultApp') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyRelative')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyRelativePath') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyPath')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyPath') }}
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" @click="handleMenuAction('reveal')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.revealInFinder') }}
        </button>
      </template>

      <!-- 文件夹操作 -->
      <template v-else>
        <button class="menu-item" @click="handleMenuAction('reveal')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.revealInFinder') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyRelative')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyRelativePath') }}
        </button>
        <button class="menu-item" @click="handleMenuAction('copyPath')">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          {{ t('sidebar.copyPath') }}
        </button>
        <template v-if="contextMenu.item.path === store.lastFolderPath">
          <div class="menu-divider"></div>
          <button class="menu-item menu-item--danger" @click="handleMenuAction('closeFolder')">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ t('sidebar.closeFolder') }}
          </button>
        </template>
      </template>
    </div>

    <!-- 复制路径等轻量反馈 Toast -->
    <div v-if="toastText" class="sidebar-toast">
      {{ toastText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useAppStore, type FileEntry } from '../stores/app'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { guardUnsavedChanges } from '../composables/useUnsavedGuard'
import { t } from '../i18n'
import { findFirstMarkdownFile, filterMarkdownTree, isMarkdownFile, getRelativePath } from '../utils/file'
import { openMarkdownFile } from '../utils/openFile'
import { FILE_TREE_CONTEXT_KEY, type FileTreeContext } from './fileTreeTypes'
import FileTreeItem from './FileTreeItem.vue'

const store = useAppStore()

const folderTitle = computed(() => {
  if (!store.lastFolderPath) return t('sidebar.files')
  const name = store.lastFolderPath.split('/').pop() || store.lastFolderPath.split('\\').pop()
  return name || t('sidebar.files')
})

// 根据过滤开关计算展示的树形数据
const displayTree = computed(() => {
  if (store.sidebarFilterMdOnly) {
    return filterMarkdownTree(store.fileTree)
  }
  return store.fileTree
})

function isMdFile(name: string): boolean {
  return isMarkdownFile(name)
}

// 刷新当前文件夹
async function handleRefreshFolder() {
  if (!store.lastFolderPath) return
  try {
    const entries = await invoke<FileEntry[]>('read_folder', { path: store.lastFolderPath })
    store.fileTree = entries
  } catch (e) {
    console.error('Refresh folder failed:', e)
  }
}

async function handleOpenFolder() {
  if (!(await guardUnsavedChanges('guard.action.openFolder'))) return
  try {
    const selected = await open({ directory: true, multiple: false })
    if (selected) {
      const entries = await invoke<FileEntry[]>('read_folder', { path: selected as string })
      store.openFolder(selected as string, entries)
      if (!store.hasFile) {
        const firstFile = findFirstMarkdownFile(entries)
        if (firstFile) {
          await openMarkdownFile(firstFile.path, firstFile.name)
        }
      }
    }
  } catch (e) {
    console.error('Open folder failed:', e)
  }
}

async function handleCloseFolder() {
  if (!(await guardUnsavedChanges('guard.action.closeFolder'))) return
  store.closeFolder()
}

// ==================== 上下文右键菜单 ====================

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  item: FileEntry | null
}

const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  item: null,
})

const toastText = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(text: string) {
  toastText.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastText.value = ''
  }, 1600)
}

function openContextMenu(e: MouseEvent, item: FileEntry) {
  const menuWidth = 190
  const menuHeight = 180
  const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8)
  const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8)

  contextMenu.value = {
    visible: true,
    x: Math.max(8, x),
    y: Math.max(8, y),
    item,
  }
}

function openHeaderContextMenu(e: MouseEvent) {
  if (!store.lastFolderPath) return
  openContextMenu(e, {
    name: folderTitle.value,
    path: store.lastFolderPath,
    is_dir: true,
  })
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

async function handleMenuAction(action: 'open' | 'copyRelative' | 'copyPath' | 'reveal' | 'openDefault' | 'closeFolder') {
  const item = contextMenu.value.item
  closeContextMenu()
  if (!item) return

  if (action === 'open') {
    await openMarkdownFile(item.path, item.name)
  } else if (action === 'copyRelative') {
    const rel = getRelativePath(item.path, store.lastFolderPath)
    try {
      await navigator.clipboard.writeText(rel)
      showToast(t('sidebar.copied'))
    } catch {
      // 忽略剪贴板错误
    }
  } else if (action === 'copyPath') {
    try {
      await navigator.clipboard.writeText(item.path)
      showToast(t('sidebar.copied'))
    } catch {
      // 忽略剪贴板错误
    }
  } else if (action === 'reveal') {
    try {
      await invoke('reveal_in_folder', { path: item.path })
    } catch (e) {
      console.error('Reveal in folder failed:', e)
    }
  } else if (action === 'openDefault') {
    try {
      await invoke('open_in_default_app', { path: item.path })
    } catch (e) {
      console.error('Open with default app failed:', e)
    }
  } else if (action === 'closeFolder') {
    await handleCloseFolder()
  }
}

// 依赖注入给子项使用
provide<FileTreeContext>(FILE_TREE_CONTEXT_KEY, {
  openContextMenu,
  collapseSignal: computed(() => store.treeCollapseSignal),
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && contextMenu.value.visible) {
    closeContextMenu()
  }
}

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('keydown', onKeydown)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.sidebar {
  position: relative;
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  margin-right: 6px;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sidebar-action {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.sidebar-action:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-action.is-active {
  background: var(--accent-light);
  color: var(--accent);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  text-align: center;
  gap: 10px;
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.4;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.empty-filter-btn {
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.12s ease;
}

.empty-filter-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 右键上下文菜单 */
.tree-context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 175px;
  max-width: 260px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.menu-header {
  padding: 4px 8px 3px;
}

.menu-filename {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item {
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.1s ease, color 0.1s ease;
}

.menu-item svg {
  flex-shrink: 0;
  color: var(--text-muted);
}

.menu-item:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.menu-item:hover svg {
  color: var(--accent);
}

.menu-item.menu-item--danger:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.menu-item.menu-item--danger:hover svg {
  color: #ef4444;
}

.menu-divider {
  height: 1px;
  background: var(--border);
  margin: 3px 0;
}

.sidebar-toast {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 5px 12px;
  font-size: 11px;
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
