<template>
  <div class="toc-wrapper" :class="{ 'is-collapsed': !store.showToc }">
    <!-- 折叠状态下的浮动迷你按钮 -->
    <button
      v-if="!store.showToc"
      class="toc-mini-trigger"
      @click="store.toggleToc()"
      title="Show outline (⌘⇧O)"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- 展开状态下的大纲卡片 -->
    <aside v-else class="toc-card" ref="cardRef">
      <div class="toc-header">
        <div class="toc-title">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>Outline</span>
        </div>
        <div class="toc-header-actions">
          <button class="toc-icon-btn" @click="store.toggleToc()" title="Hide outline (⌘⇧O)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
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
  </div>
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
const cardRef = ref<HTMLElement>()

// 计算文档中最小标题 level，以此为基准缩进
const minLevel = computed(() => {
  if (!props.headings.length) return 1
  return Math.min(...props.headings.map((h) => h.level))
})

function getItemIndent(level: number): string {
  const depth = Math.max(0, level - minLevel.value)
  return `${depth * 10 + 12}px`
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

      // 仅当 active 项超出可见区域时滚动
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
/* 容器：绝对定位在 preview-panel 右侧，pointer-events: none 保证其余空白区域完全穿透，绝不影响正文操作和居中 */
.toc-wrapper {
  position: absolute;
  top: 16px;
  right: 20px;
  bottom: 24px;
  width: 250px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toc-wrapper.is-collapsed {
  bottom: auto;
  width: auto;
}

/* 折叠后的迷你悬浮按钮 */
.toc-mini-trigger {
  pointer-events: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.16s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  opacity: 0.75;
}

.toc-mini-trigger:hover {
  opacity: 1;
  color: var(--text-primary);
  background: var(--bg-secondary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* 展开后的大纲浮动卡片 */
.toc-card {
  pointer-events: auto;
  width: 250px;
  height: 100%;
  max-height: calc(100% - 10px);
  display: flex;
  flex-direction: column;
  background: rgba(248, 247, 244, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] .toc-card {
  background: rgba(22, 24, 34, 0.88);
}

/* 头部 */
.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.toc-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toc-icon-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
}

.toc-icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* 大纲主体列表 */
.toc-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
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

/* 每一项大纲按钮 */
.toc-item {
  position: relative;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding-top: 6px;
  padding-bottom: 6px;
  padding-right: 10px;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.12s ease;
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

/* 激活态（阅读所在位置） */
.toc-item.active {
  color: var(--accent);
  font-weight: 600;
  background: var(--accent-light);
}

.toc-item.active::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 5px;
  bottom: 5px;
  width: 3px;
  background: var(--accent);
  border-radius: 2px;
}

/* 空状态 */
.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.empty-icon {
  opacity: 0.4;
}
</style>
