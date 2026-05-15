<template>
  <div>
    <div
      class="tree-item"
      :class="{ 'is-dir': item.is_dir, 'is-active': isCurrentFile }"
      :style="{ paddingLeft: `${10 + depth * 14}px` }"
      @click="handleClick"
    >
      <span class="tree-icon" v-if="item.is_dir">
        <svg v-if="isOpen" width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="tree-icon tree-icon--file" v-else>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M10 2V4H12" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </span>
      <span class="tree-name">{{ item.name }}</span>
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
import { ref, computed } from 'vue'
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

const isCurrentFile = computed(() => store.currentFilePath === props.item.path)

async function handleClick() {
  if (props.item.is_dir) {
    isOpen.value = !isOpen.value
    return
  }

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
.tree-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.08s ease;
  white-space: nowrap;
  overflow: hidden;
  border-radius: var(--radius-sm);
  margin: 0 4px;
}

.tree-item:hover {
  background: var(--bg-tertiary);
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

.tree-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.tree-item.is-dir .tree-icon {
  color: var(--text-secondary);
}

.tree-icon--file {
  color: var(--text-muted);
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
