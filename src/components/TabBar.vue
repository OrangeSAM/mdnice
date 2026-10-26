<template>
  <div class="tab-bar-container" v-if="store.tabs.length > 0">
    <div class="tab-list" ref="scrollContainer" @wheel="handleWheel">
      <div
        v-for="(tab, index) in store.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{
          active: tab.id === store.activeTabId,
          modified: tab.isModified,
          dragging: dragIndex === index,
          'drag-over': dropIndex === index && dragIndex !== index,
        }"
        :title="tab.path"
        draggable="true"
        @click="handleSelect(tab.id)"
        @mouseup.middle.stop.prevent="handleClose(tab.id)"
        @contextmenu.prevent="openContextMenu($event, tab)"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver(index)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <span class="tab-icon">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
            <path d="M10 2V4H12" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </span>
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-status" v-if="tab.isModified" :title="t('app.save')"></span>
        <button
          class="tab-close"
          @click.stop="handleClose(tab.id)"
          :title="t('tab.close')"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 新增 / 打开文件快捷按钮 -->
    <div class="tab-actions">
      <button class="tab-action-btn" @click="emit('open-file')" :title="t('tab.newFile')">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- 右键上下文菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tab-context-menu"
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        @click.stop
      >
        <button class="menu-item" @click="menuAction('close')">
          {{ t('tab.close') }}
        </button>
        <button
          class="menu-item"
          @click="menuAction('closeOthers')"
          :disabled="store.tabs.length <= 1"
        >
          {{ t('tab.closeOthers') }}
        </button>
        <button
          class="menu-item"
          @click="menuAction('closeRight')"
          :disabled="isLastTab(contextMenu.tabId)"
        >
          {{ t('tab.closeRight') }}
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" @click="menuAction('copyPath')">
          {{ t('tab.copyPath') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import { guardCloseTab } from '../composables/useUnsavedGuard'
import { t } from '../i18n'

const store = useAppStore()
const scrollContainer = ref<HTMLElement>()

const emit = defineEmits<{
  (e: 'open-file'): void
}>()

// ==================== 标签切换与关闭 ====================

function handleSelect(tabId: string) {
  store.switchTab(tabId)
}

async function handleClose(tabId: string) {
  const allowed = await guardCloseTab(tabId)
  if (allowed) {
    store.closeTab(tabId)
  }
}

// 滚轮横向滚动
function handleWheel(e: WheelEvent) {
  if (!scrollContainer.value) return
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    scrollContainer.value.scrollLeft += e.deltaY
    e.preventDefault()
  }
}

// ==================== 拖拽排序 ====================

const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number) {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    dropIndex.value = index
  }
}

function onDrop(index: number) {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    store.reorderTabs(dragIndex.value, index)
  }
  onDragEnd()
}

function onDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

// ==================== 右键上下文菜单 ====================

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string
  path: string
}

const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  tabId: '',
  path: '',
})

function isLastTab(tabId: string): boolean {
  if (!store.tabs.length) return true
  return store.tabs[store.tabs.length - 1].id === tabId
}

function openContextMenu(e: MouseEvent, tab: { id: string; path: string }) {
  contextMenu.value = {
    visible: true,
    x: Math.min(e.clientX, window.innerWidth - 180),
    y: Math.min(e.clientY, window.innerHeight - 160),
    tabId: tab.id,
    path: tab.path,
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

async function menuAction(type: 'close' | 'closeOthers' | 'closeRight' | 'copyPath') {
  const tabId = contextMenu.value.tabId
  const path = contextMenu.value.path
  closeContextMenu()

  if (type === 'close') {
    await handleClose(tabId)
  } else if (type === 'closeOthers') {
    // 检查其他标签是否有未保存
    const otherModified = store.tabs.some((t) => t.id !== tabId && t.isModified)
    if (otherModified && !store.settings.auto_save) {
      // 若关闭自动保存且有修改，逐个关闭以走确认流程
      for (const t of [...store.tabs]) {
        if (t.id !== tabId) {
          const ok = await guardCloseTab(t.id)
          if (ok) store.closeTab(t.id)
        }
      }
    } else {
      store.closeOtherTabs(tabId)
    }
  } else if (type === 'closeRight') {
    const idx = store.tabs.findIndex((t) => t.id === tabId)
    if (idx !== -1) {
      const rightTabs = store.tabs.slice(idx + 1)
      const rightModified = rightTabs.some((t) => t.isModified)
      if (rightModified && !store.settings.auto_save) {
        for (const t of rightTabs) {
          const ok = await guardCloseTab(t.id)
          if (ok) store.closeTab(t.id)
        }
      } else {
        store.closeTabsToRight(tabId)
      }
    }
  } else if (type === 'copyPath') {
    try {
      await navigator.clipboard.writeText(path)
    } catch {
      // 忽略复制失败
    }
  }
}

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
})

defineExpose({
  scrollActiveIntoView: () => {
    nextTick(() => {
      const el = scrollContainer.value?.querySelector('.tab-item.active') as HTMLElement | null
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    })
  },
})
</script>

<style scoped>
.tab-bar-container {
  height: 34px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
  padding: 0 4px 0 6px;
  gap: 4px;
}

.tab-list {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  scrollbar-width: none; /* Firefox */
}

.tab-list::-webkit-scrollbar {
  display: none; /* Chrome / Safari */
}

.tab-item {
  position: relative;
  height: 28px;
  min-width: 90px;
  max-width: 200px;
  padding: 0 8px 0 10px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 450;
  border: 1px solid transparent;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.tab-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.tab-item.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-weight: 500;
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}

.tab-item.dragging {
  opacity: 0.35;
}

.tab-item.drag-over {
  border-left: 2px solid var(--accent);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.tab-item.active .tab-icon {
  color: var(--accent);
}

.tab-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.tab-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  flex-shrink: 0;
  transition: all 0.12s ease;
  margin-left: auto;
}

.tab-close:hover {
  opacity: 1;
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tab-item.active .tab-close {
  opacity: 0.75;
}

.tab-item.active .tab-close:hover {
  opacity: 1;
  background: var(--bg-secondary);
}

.tab-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding-left: 2px;
}

.tab-action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.tab-action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 右键上下文菜单 */
.tab-context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 150px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  width: 100%;
  padding: 6px 10px;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}

.menu-item:hover:not(:disabled) {
  background: var(--accent-light);
  color: var(--accent);
}

.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-divider {
  height: 1px;
  background: var(--border);
  margin: 3px 0;
}
</style>
