<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="titlebar-drag-region" data-tauri-drag-region>
      <div class="titlebar-title" data-tauri-drag-region>
        <span class="titlebar-icon">M</span>
        <span class="titlebar-text" data-tauri-drag-region>Markdown Nice</span>
        <span v-if="store.isModified" class="titlebar-modified">●</span>
      </div>
    </div>
    <div class="titlebar-actions">
      <button class="titlebar-btn" @click="handleOpen" title="打开文件">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
      <button class="titlebar-btn" @click="handleOpenFolder" title="打开文件夹">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
      <button class="titlebar-btn" @click="handleSave" title="保存" :disabled="!store.isModified">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 2H10L13 5V13C13 13.5523 12.5523 14 12 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5 2V6H9V2" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5 9H10" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5 11H8" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
      <div class="titlebar-divider"></div>
      <button class="titlebar-btn" @click="store.showSettings = !store.showSettings" title="设置">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M13.5 8C13.5 7.6 13.3 7.2 13 6.9L13.6 5.4L12.1 4.5L10.8 5.5C10.5 5.3 10.1 5.2 9.7 5.1L9.4 3.7H7.4L7.1 5.1C6.7 5.2 6.3 5.3 6 5.5L4.7 4.5L3.2 5.4L3.8 6.9C3.6 7.2 3.5 7.6 3.5 8C3.5 8.4 3.6 8.8 3.8 9.1L3.2 10.6L4.7 11.5L6 10.5C6.3 10.7 6.7 10.8 7.1 10.9L7.4 12.3H9.4L9.7 10.9C10.1 10.8 10.5 10.7 10.8 10.5L12.1 11.5L13.6 10.6L13 9.1C13.3 8.8 13.5 8.4 13.5 8Z" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

const store = useAppStore()

async function handleOpen() {
  try {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'All', extensions: ['*'] },
      ],
    })
    if (selected) {
      const path = selected as string
      const content = await readTextFile(path)
      const name = path.split('/').pop() || path
      store.openFile(path, name, content)
    }
  } catch (e) {
    console.error('Open file failed:', e)
  }
}

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

async function handleSave() {
  if (!store.currentFilePath || !store.isModified) return
  try {
    await invoke('write_file', {
      path: store.currentFilePath,
      content: store.fileContent,
    })
    store.isModified = false
  } catch (e) {
    console.error('Save failed:', e)
  }
}
</script>

<style scoped>
.titlebar {
  height: var(--titlebar-height);
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  -webkit-user-select: none;
}

.titlebar-drag-region {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 16px;
}

.titlebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-icon {
  width: 20px;
  height: 20px;
  background: var(--accent);
  color: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.titlebar-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.titlebar-modified {
  color: var(--accent);
  font-size: 16px;
  line-height: 1;
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
}

.titlebar-btn {
  width: 30px;
  height: 26px;
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

.titlebar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.titlebar-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.titlebar-btn:disabled:hover {
  background: transparent;
  color: var(--text-muted);
}

.titlebar-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
}
</style>
