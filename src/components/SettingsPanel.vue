<template>
  <Transition name="slide">
    <div class="settings-overlay" v-if="store.showSettings" @click.self="store.showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>Settings</h3>
          <button class="close-btn" @click="store.showSettings = false">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-body">
          <div class="settings-group">
            <label class="settings-label">Appearance</label>
            <div class="theme-grid">
              <button
                v-for="t in themes"
                :key="t.value"
                class="theme-card"
                :class="{ active: store.settings.theme === t.value }"
                @click="handleThemeChange(t.value)"
              >
                <div class="theme-preview" :class="`preview-${t.value}`">
                  <div class="preview-bar"></div>
                  <div class="preview-lines">
                    <div class="preview-line w80"></div>
                    <div class="preview-line w60"></div>
                    <div class="preview-line w90"></div>
                  </div>
                </div>
                <span class="theme-name">{{ t.label }}</span>
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">Typography</label>
            <div class="control-row">
              <span class="control-name">Preview size</span>
              <input type="range" :min="12" :max="24" :step="1" v-model.number="store.settings.font_size" class="range-input" />
              <span class="control-value">{{ store.settings.font_size }}px</span>
            </div>
            <div class="control-row">
              <span class="control-name">Editor size</span>
              <input type="range" :min="10" :max="20" :step="1" v-model.number="store.settings.editor_font_size" class="range-input" />
              <span class="control-value">{{ store.settings.editor_font_size }}px</span>
            </div>
            <div class="control-row">
              <span class="control-name">Line height</span>
              <input type="range" :min="1.2" :max="2.5" :step="0.05" v-model.number="store.settings.line_height" class="range-input" />
              <span class="control-value">{{ store.settings.line_height }}</span>
            </div>
            <div class="control-row">
              <span class="control-name">Font</span>
              <select v-model="store.settings.font_family" class="select-input">
                <option value="system-ui">System</option>
                <option value="Source Sans 3">Source Sans</option>
                <option value="Georgia">Georgia</option>
                <option value="Merriweather">Merriweather</option>
                <option value="Noto Serif SC">Noto Serif SC</option>
              </select>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">Layout</label>
            <div class="control-row">
              <span class="control-name">Editor width</span>
              <input type="range" :min="20" :max="80" :step="5" v-model.number="store.settings.editor_width" class="range-input" />
              <span class="control-value">{{ store.settings.editor_width }}%</span>
            </div>
            <div class="control-row">
              <span class="control-name">Preview width</span>
              <input type="range" :min="600" :max="1200" :step="50" v-model.number="store.settings.preview_max_width" class="range-input" />
              <span class="control-value">{{ store.settings.preview_max_width }}px</span>
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
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 300px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.settings-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-group {
  margin-bottom: 24px;
}

.settings-group:last-child {
  margin-bottom: 0;
}

.settings-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* Theme cards */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.12s ease;
}

.theme-card.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.theme-card:hover:not(.active) {
  border-color: var(--text-muted);
}

.theme-preview {
  width: 100%;
  height: 36px;
  border-radius: 4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-light {
  background: #ffffff;
  border: 1px solid #e5e5e5;
}

.preview-dark {
  background: #1a1814;
  border: 1px solid #2e2b27;
}

.preview-system {
  background: linear-gradient(135deg, #ffffff 50%, #1a1814 50%);
  border: 1px solid #e5e5e5;
}

.preview-bar {
  width: 40%;
  height: 3px;
  border-radius: 1px;
}

.preview-light .preview-bar { background: #d4d4d4; }
.preview-dark .preview-bar { background: #3a3733; }
.preview-system .preview-bar { background: linear-gradient(90deg, #d4d4d4 50%, #3a3733 50%); }

.preview-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-line {
  height: 2px;
  border-radius: 1px;
}

.preview-light .preview-line { background: #e5e5e5; }
.preview-dark .preview-line { background: #2e2b27; }
.preview-system .preview-line { background: linear-gradient(90deg, #e5e5e5 50%, #2e2b27 50%); }

.w80 { width: 80%; }
.w60 { width: 60%; }
.w90 { width: 90%; }

.theme-name {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.theme-card.active .theme-name {
  color: var(--accent);
}

/* Controls */
.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.control-row:last-child {
  margin-bottom: 0;
}

.control-name {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.range-input {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.control-value {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
}

.select-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.select-input:focus {
  border-color: var(--border-focus);
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.15s ease;
}

.slide-enter-active .settings-panel,
.slide-leave-active .settings-panel {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .settings-panel,
.slide-leave-to .settings-panel {
  transform: translateX(100%);
}
</style>
