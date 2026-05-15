<template>
  <Transition name="slide">
    <div class="settings-overlay" v-if="store.showSettings" @click.self="store.showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>Settings</h3>
          <button class="settings-close" @click="store.showSettings = false">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-body">
          <!-- Theme -->
          <div class="settings-group">
            <label class="settings-label">Theme</label>
            <div class="settings-row">
              <button
                v-for="t in themes"
                :key="t.value"
                class="theme-btn"
                :class="{ active: store.settings.theme === t.value }"
                @click="handleThemeChange(t.value)"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Font Size -->
          <div class="settings-group">
            <label class="settings-label">Preview Font Size</label>
            <div class="settings-row">
              <input
                type="range"
                :min="12"
                :max="24"
                :step="1"
                v-model.number="store.settings.font_size"
                class="settings-range"
              />
              <span class="settings-value">{{ store.settings.font_size }}px</span>
            </div>
          </div>

          <!-- Editor Font Size -->
          <div class="settings-group">
            <label class="settings-label">Editor Font Size</label>
            <div class="settings-row">
              <input
                type="range"
                :min="10"
                :max="20"
                :step="1"
                v-model.number="store.settings.editor_font_size"
                class="settings-range"
              />
              <span class="settings-value">{{ store.settings.editor_font_size }}px</span>
            </div>
          </div>

          <!-- Line Height -->
          <div class="settings-group">
            <label class="settings-label">Line Height</label>
            <div class="settings-row">
              <input
                type="range"
                :min="1.2"
                :max="2.5"
                :step="0.05"
                v-model.number="store.settings.line_height"
                class="settings-range"
              />
              <span class="settings-value">{{ store.settings.line_height }}</span>
            </div>
          </div>

          <!-- Preview Max Width -->
          <div class="settings-group">
            <label class="settings-label">Preview Max Width</label>
            <div class="settings-row">
              <input
                type="range"
                :min="600"
                :max="1200"
                :step="50"
                v-model.number="store.settings.preview_max_width"
                class="settings-range"
              />
              <span class="settings-value">{{ store.settings.preview_max_width }}px</span>
            </div>
          </div>

          <!-- Font Family -->
          <div class="settings-group">
            <label class="settings-label">Font Family</label>
            <div class="settings-row">
              <select v-model="store.settings.font_family" class="settings-select">
                <option value="system-ui">System Default</option>
                <option value="Inter">Inter</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Merriweather">Merriweather (Serif)</option>
                <option value="Noto Serif SC">Noto Serif SC</option>
              </select>
            </div>
          </div>

          <!-- Editor Width -->
          <div class="settings-group">
            <label class="settings-label">Editor Width</label>
            <div class="settings-row">
              <input
                type="range"
                :min="20"
                :max="80"
                :step="5"
                v-model.number="store.settings.editor_width"
                class="settings-range"
              />
              <span class="settings-value">{{ store.settings.editor_width }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { useTheme } from '../composables/useTheme'

const store = useAppStore()
const { setTheme } = useTheme()

const themes = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

function handleThemeChange(value: string) {
  setTheme(value as 'light' | 'dark' | 'system')
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 320px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.settings-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-group {
  margin-bottom: 20px;
}

.settings-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-range {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
}

.settings-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.settings-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.settings-value {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.settings-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.settings-select:focus {
  border-color: var(--border-focus);
}

.theme-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
}

.theme-btn:hover:not(.active) {
  border-color: var(--text-muted);
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease;
}

.slide-enter-active .settings-panel,
.slide-leave-active .settings-panel {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .settings-panel {
  transform: translateX(100%);
}

.slide-leave-to .settings-panel {
  transform: translateX(100%);
}
</style>
