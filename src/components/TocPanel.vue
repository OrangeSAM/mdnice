<template>
  <aside class="toc-sidebar">
    <div class="toc-header">
      <div class="toc-title">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span>Outline</span>
      </div>
      <div class="toc-actions">
        <button class="toc-action" @click="store.toggleToc()" title="Hide outline (⌘⇧O)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="toc-body" ref="bodyRef">
      <div v-if="headings.length === 0" class="toc-empty">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" class="empty-icon">
          <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span>No headings</span>
      </div>
      <nav v-else class="toc-list">
        <button
          v-for="item in headings"
          :key="item.id"
          :data-id="item.id"
          class="toc-item"
          :class="{ active: item.id === activeId }"
          :style="{ paddingLeft: getItemIndent(item.level) }"
          @click="emit('select', item.id)"
          :title="item.text"
        >
          <span class="toc-item-text">{{ item.text }}</span>
        </button>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/app'
import type { HeadingItem } from '../markdown-it-heading-anchor'

const props = defineProps<{
  headings: HeadingItem[]
  activeId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const store = useAppStore()
const bodyRef = ref<HTMLElement>()

// 计算文档中最小标题 level，以此为基准缩进
const minLevel = computed(() => {
  if (!props.headings.length) return 1
  return Math.min(...props.headings.map((h) => h.level))
})

function getItemIndent(level: number): string {
  const depth = Math.max(0, level - minLevel.value)
  return `${depth * 10 + 10}px`
}

// 当正文滚动改变 activeId 时，确保大纲内对应项在视野中可见
watch(
  () => props.activeId,
  (newId) => {
    if (!newId || !store.showToc || !bodyRef.value) return
    const activeEl = bodyRef.value.querySelector(`[data-id="${newId}"]`) as HTMLElement | null
    if (activeEl) {
      const bodyEl = bodyRef.value
      const itemTop = activeEl.offsetTop
      const itemHeight = activeEl.offsetHeight
      const bodyScrollTop = bodyEl.scrollTop
      const bodyHeight = bodyEl.clientHeight

      // 仅当 active 项超出可见区域时平滑滚动
      if (itemTop < bodyScrollTop || itemTop + itemHeight > bodyScrollTop + bodyHeight) {
        bodyEl.scrollTo({
          top: itemTop - bodyHeight / 2 + itemHeight / 2,
          behavior: 'smooth',
        })
      }
    }
  }
)
</script>

<style scoped>
.toc-sidebar {
  width: var(--toc-width, 240px);
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  height: 100%;
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  user-select: none;
}

.toc-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toc-action {
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

.toc-action:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.toc-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 4px;
}

.toc-body::-webkit-scrollbar {
  width: 4px;
}

.toc-body::-webkit-scrollbar-track {
  background: transparent;
}

.toc-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-item {
  position: relative;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-right: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.1s ease;
}

.toc-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.toc-item:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.toc-item.active {
  color: var(--accent);
  font-weight: 500;
  background: var(--accent-light);
}

.toc-item.active::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  bottom: 4px;
  width: 2.5px;
  background: var(--accent);
  border-radius: 1.5px;
}

.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 10px;
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

.empty-icon {
  opacity: 0.35;
}
</style>
