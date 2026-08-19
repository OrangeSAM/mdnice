<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Files</span>
      <div class="sidebar-actions">
        <button class="sidebar-action" @click="handleOpenFolder" title="Open Folder">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
            <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
        <button class="sidebar-action" v-if="store.fileTree.length" @click="handleCloseFolder" title="Close Folder">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="sidebar-action" @click="store.toggleSidebar()" title="Hide sidebar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
            <path d="M6 2V14" stroke="currentColor" stroke-width="1.2"/>
            <path d="M10 6L8 8L10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="sidebar-content" v-if="store.fileTree.length">
      <FileTreeItem
        v-for="item in store.fileTree"
        :key="item.path"
        :item="item"
        :depth="0"
      />
    </div>
    <div class="sidebar-empty" v-else>
      <svg width="28" height="28" viewBox="0 0 16 16" fill="none" class="empty-icon">
        <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
        <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      <span class="empty-hint">No folder open</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import FileTreeItem from './FileTreeItem.vue'

const store = useAppStore()

async function handleOpenFolder() {
  try {
    const selected = await open({ directory: true, multiple: false })
    if (selected) {
      const entries = await invoke<any[]>('read_folder', { path: selected as string })
      store.openFolder(selected as string, entries)
    }
  } catch (e) {
    console.error('Open folder failed:', e)
  }
}

function handleCloseFolder() {
  store.closeFolder()
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sidebar-action {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.sidebar-action:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.empty-icon {
  color: var(--border);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
