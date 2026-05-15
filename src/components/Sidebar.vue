<template>
  <div class="sidebar" v-if="store.showSidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Files</span>
      <button class="sidebar-btn" @click="handleOpenFolder" title="打开文件夹">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
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
      <p>No folder opened</p>
      <button class="sidebar-open-btn" @click="handleOpenFolder">Open Folder</button>
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
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected) {
      const entries = await invoke<any[]>('read_folder', { path: selected as string })
      store.fileTree = entries
    }
  } catch (e) {
    console.error('Open folder failed:', e)
  }
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
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.sidebar-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sidebar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.sidebar-open-btn {
  padding: 6px 16px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-open-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
