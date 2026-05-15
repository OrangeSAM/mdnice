<template>
  <div>
    <div
      class="file-item"
      :class="{ 'is-dir': item.is_dir, 'is-active': isActive }"
      :style="{ paddingLeft: `${12 + depth * 16}px` }"
      @click="handleClick"
    >
      <span class="file-icon" v-if="item.is_dir">
        <svg v-if="isOpen" width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="file-icon file-icon--file" v-else>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M10 2V4H12" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </span>
      <span class="file-name">{{ item.name }}</span>
    </div>
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
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import { readTextFile } from '@tauri-apps/plugin-fs'

interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  children?: FileEntry[]
}

const props = defineProps<{
  item: FileEntry
  depth: number
}>()

const store = useAppStore()
const isOpen = ref(false)

const isActive = ref(false)

async function handleClick() {
  if (props.item.is_dir) {
    isOpen.value = !isOpen.value
    return
  }

  // Only open markdown files
  if (!props.item.name.match(/\.(md|markdown|mdown|mkd)$/i)) return

  try {
    const content = await readTextFile(props.item.path)
    store.openFile(props.item.path, props.item.name, content)
  } catch (e) {
    console.error('Failed to open file:', e)
  }
}
</script>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.1s ease;
  white-space: nowrap;
  overflow: hidden;
}

.file-item:hover {
  background: var(--bg-tertiary);
}

.file-item.is-active {
  background: var(--accent-light);
  color: var(--accent);
}

.file-item.is-dir {
  font-weight: 500;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.file-icon--file {
  color: var(--text-muted);
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
