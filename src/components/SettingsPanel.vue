<template>
  <Transition name="settings-modal">
    <div class="settings-overlay" v-if="store.showSettings" @mousedown.self="store.showSettings = false">
      <div class="settings-modal">
        <div class="settings-header">
          <h3>{{ t('settings.title') }}</h3>
          <button class="close-btn" @click="store.showSettings = false" :title="t('qo.close')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-body">
          <div class="settings-group">
            <label class="settings-label">{{ t('settings.language') }}</label>
            <div class="segmented">
              <button
                v-for="opt in languageOptions"
                :key="opt.value"
                class="segment-btn"
                :class="{ active: store.settings.language === opt.value }"
                @click="handleLanguageChange(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.appearance') }}</label>
            <div class="theme-grid">
              <button
                v-for="th in themes"
                :key="th.value"
                class="theme-card"
                :class="{ active: store.settings.theme === th.value }"
                @click="handleThemeChange(th.value)"
              >
                <div class="theme-preview" :class="`preview-${th.value}`">
                  <div class="preview-bar"></div>
                  <div class="preview-lines">
                    <div class="preview-line w80"></div>
                    <div class="preview-line w60"></div>
                    <div class="preview-line w90"></div>
                  </div>
                </div>
                <span class="theme-name">{{ th.label }}</span>
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.readingPresets') }}</label>
            <div class="preset-grid">
              <button
                v-for="p in presets"
                :key="p.label"
                class="preset-card"
                :class="{ active: isPresetActive(p) }"
                @click="applyPreset(p)"
              >
                <span class="preset-name">{{ p.label }}</span>
                <span class="preset-desc">{{ p.desc }}</span>
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.typography') }}</label>
            <div class="control-row">
              <span class="control-name">{{ t('settings.previewSize') }}</span>
              <input type="range" :min="12" :max="24" :step="1" v-model.number="store.settings.font_size" class="range-input" />
              <span class="control-value">{{ store.settings.font_size }}px</span>
            </div>
            <div class="control-row">
              <span class="control-name">{{ t('settings.editorSize') }}</span>
              <input type="range" :min="10" :max="20" :step="1" v-model.number="store.settings.editor_font_size" class="range-input" />
              <span class="control-value">{{ store.settings.editor_font_size }}px</span>
            </div>
            <div class="control-row">
              <span class="control-name">{{ t('settings.lineHeight') }}</span>
              <input type="range" :min="1.2" :max="2.5" :step="0.05" v-model.number="store.settings.line_height" class="range-input" />
              <span class="control-value">{{ store.settings.line_height }}</span>
            </div>
            <div class="control-row">
              <span class="control-name">{{ t('settings.font') }}</span>
              <select v-model="store.settings.font_family" class="select-input">
                <option value="system-ui">{{ t('settings.fontSystem') }}</option>
                <option value="Source Sans 3">{{ t('settings.fontSourceSans') }}</option>
                <option value="Georgia">Georgia</option>
                <option value="Merriweather">Merriweather</option>
                <option value="Noto Serif SC">{{ t('settings.fontNotoSerif') }}</option>
                <option value="LXGW WenKai">{{ t('settings.fontWenkai') }}</option>
              </select>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.layout') }}</label>
            <div class="control-row">
              <span class="control-name">{{ t('settings.sidebarWidth') }}</span>
              <input type="range" :min="160" :max="450" :step="10" :value="store.sidebarWidth" @input="store.setSidebarWidth(Number(($event.target as HTMLInputElement).value))" class="range-input" />
              <span class="control-value">{{ store.sidebarWidth }}px</span>
            </div>
            <div class="control-row">
              <span class="control-name">{{ t('settings.editorWidth') }}</span>
              <input type="range" :min="20" :max="80" :step="5" v-model.number="store.settings.editor_width" class="range-input" />
              <span class="control-value">{{ store.settings.editor_width }}%</span>
            </div>
            <div class="control-row">
              <span class="control-name">{{ t('settings.previewWidth') }}</span>
              <input type="range" :min="600" :max="1200" :step="50" v-model.number="store.settings.preview_max_width" class="range-input" />
              <span class="control-value">{{ store.settings.preview_max_width }}px</span>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.preferences') }}</label>
            <div class="control-row">
              <span class="control-name">{{ t('settings.autoSave') }}</span>
              <button
                class="switch"
                :class="{ on: store.settings.auto_save }"
                role="switch"
                :aria-checked="store.settings.auto_save"
                @click="store.settings.auto_save = !store.settings.auto_save"
              >
                <span class="switch-knob"></span>
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.export') }}</label>
            <div class="export-buttons">
              <button class="export-btn" @click="handleCopyRichText" :disabled="!store.hasFile || exportBusy">
                {{ exportStatus === 'copied' ? t('settings.exportCopied') : t('settings.exportCopyRich') }}
              </button>
              <button class="export-btn" @click="handleExportHtml" :disabled="!store.hasFile || exportBusy">
                {{ exportStatus === 'exported' ? t('settings.exportExported') : t('settings.exportHtml') }}
              </button>
              <button class="export-btn" @click="handlePrint" :disabled="!store.hasFile || exportBusy" :title="t('settings.exportPrintHint')">
                {{ t('settings.exportPrint') }}
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.updates') }}</label>
            <div class="control-row">
              <span class="control-name">{{ t('settings.currentVersion') }}</span>
              <span class="control-value">{{ appVersion || '—' }}</span>
            </div>
            <div class="update-row">
              <div class="update-info">
                <p class="update-text">{{ updateStatusText }}</p>
                <p v-if="updateVersion && updateStatus === 'available'" class="update-meta">{{ t('settings.updateAvailableVersion', { version: updateVersion }) }}</p>
              </div>
              <button
                v-if="updateStatus !== 'available'"
                class="update-btn"
                @click="handleCheckUpdates"
                :disabled="updateStatus === 'checking' || updateStatus === 'downloading'"
              >
                {{ updateStatus === 'checking' ? t('settings.updateChecking') : t('settings.updateCheck') }}
              </button>
              <button
                v-else
                class="update-btn primary"
                @click="handleInstallUpdate"
                :disabled="isInstalling"
              >
                {{ isInstalling ? t('settings.installing') : t('settings.updateInstall') }}
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label class="settings-label">{{ t('settings.about') }}</label>
            <a class="about-link" href="https://github.com/OrangeSAM/mdnice" target="_blank" rel="noopener noreferrer">
              <span class="about-link-text">{{ t('settings.viewOnGitHub') }}</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M5 3H13V11M13 3L3 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore, type LanguageSetting } from '../stores/app'
import { useTheme, type ThemeMode } from '../composables/useTheme'
import { useUpdater } from '../composables/useUpdater'
import { t, setLocale, resolveLocale } from '../i18n'
import { copyRichText, exportHtmlFile, printPreview } from '../utils/export'
import { getVersion } from '@tauri-apps/api/app'

const store = useAppStore()
const { setTheme } = useTheme()

const themes = computed(() => [
  { label: t('settings.themeSystem'), value: 'system' as ThemeMode },
  { label: t('settings.themeLight'), value: 'light' as ThemeMode },
  { label: t('settings.themeDark'), value: 'dark' as ThemeMode },
  { label: t('settings.themeSepia'), value: 'sepia' as ThemeMode },
  { label: t('settings.themeGreen'), value: 'green' as ThemeMode },
  { label: t('settings.themeSolarized'), value: 'solarized' as ThemeMode },
  { label: t('settings.themeNord'), value: 'nord' as ThemeMode },
  { label: t('settings.themeGruvbox'), value: 'gruvbox' as ThemeMode },
])

// 语言选项:locale 是响应式的,这里用 getter 保持翻译随切换更新
const languageOptions = computed(() => [
  { label: t('settings.languageSystem'), value: 'system' as LanguageSetting },
  { label: '中文', value: 'zh' as LanguageSetting },
  { label: 'English', value: 'en' as LanguageSetting },
])

function handleThemeChange(value: ThemeMode) {
  setTheme(value)
}

function handleLanguageChange(value: LanguageSetting) {
  store.updateSettings({ language: value })
  setLocale(resolveLocale(value))
}

// --- Reading presets ---
const presets = computed(() => [
  { label: t('settings.presetDefault'), desc: t('settings.presetDefaultDesc'), font_family: 'system-ui', line_height: 1.8, preview_max_width: 800 },
  { label: t('settings.presetBook'), desc: t('settings.presetBookDesc'), font_family: 'Noto Serif SC', line_height: 2.0, preview_max_width: 720 },
  { label: t('settings.presetWenkai'), desc: t('settings.presetWenkaiDesc'), font_family: 'LXGW WenKai', line_height: 1.9, preview_max_width: 780 },
  { label: t('settings.presetCompact'), desc: t('settings.presetCompactDesc'), font_family: 'system-ui', line_height: 1.55, preview_max_width: 900 },
])

function applyPreset(p: { font_family: string; line_height: number; preview_max_width: number }) {
  store.updateSettings({
    font_family: p.font_family,
    line_height: p.line_height,
    preview_max_width: p.preview_max_width,
  })
}

function isPresetActive(p: { font_family: string; line_height: number; preview_max_width: number }): boolean {
  return (
    store.settings.font_family === p.font_family &&
    Math.abs(store.settings.line_height - p.line_height) < 0.01 &&
    store.settings.preview_max_width === p.preview_max_width
  )
}

// --- Export section ---
const exportBusy = ref(false)
const exportStatus = ref<'' | 'copied' | 'exported'>('')

let exportStatusTimer: ReturnType<typeof setTimeout> | null = null
function flashExportStatus(status: 'copied' | 'exported') {
  exportStatus.value = status
  if (exportStatusTimer) clearTimeout(exportStatusTimer)
  exportStatusTimer = setTimeout(() => {
    exportStatus.value = ''
  }, 2000)
}

async function handleCopyRichText() {
  exportBusy.value = true
  try {
    if (await copyRichText()) flashExportStatus('copied')
  } finally {
    exportBusy.value = false
  }
}

async function handleExportHtml() {
  exportBusy.value = true
  try {
    if (await exportHtmlFile()) flashExportStatus('exported')
  } catch (e) {
    console.error('Export HTML failed:', e)
  } finally {
    exportBusy.value = false
  }
}

function handlePrint() {
  printPreview()
}

// --- Update section ---
type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'error'
const updateStatus = ref<UpdateStatus>('idle')
const updateVersion = ref('')
const updateError = ref('')
const appVersion = ref('')

const isInstalling = computed(() => updateStatus.value === 'downloading')

const {
  checkForUpdates,
  downloadAndInstall,
  updateAvailable,
  updateVersion: pendingVersion,
} = useUpdater()

const updateStatusText = computed(() => {
  switch (updateStatus.value) {
    case 'idle': return t('settings.updateIdle')
    case 'checking': return t('settings.updateChecking')
    case 'available': return t('settings.updateAvailable')
    case 'up-to-date': return t('settings.updateUpToDate')
    case 'downloading': return t('settings.updateDownloading')
    case 'error': return updateError.value || t('settings.updateError')
  }
})

async function handleCheckUpdates() {
  updateStatus.value = 'checking'
  updateError.value = ''
  const update = await checkForUpdates()
  if (update) {
    updateStatus.value = 'available'
    updateVersion.value = update.version
  } else if (updateAvailable.value) {
    updateStatus.value = 'available'
    updateVersion.value = pendingVersion.value
  } else {
    updateStatus.value = 'up-to-date'
  }
}

async function handleInstallUpdate() {
  updateStatus.value = 'downloading'
  const ok = await downloadAndInstall()
  if (!ok) {
    updateStatus.value = 'error'
  }
}

onMounted(async () => {
  try {
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = '0.1.0'
  }
})
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.settings-modal {
  width: 580px;
  max-width: calc(100vw - 48px);
  max-height: 82vh;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.settings-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 20px;
}

.settings-group {
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.settings-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
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

/* Language segmented control */
.segmented {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.segment-btn {
  flex: 1;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.segment-btn.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

/* Theme cards */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.theme-card.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.theme-card:hover:not(.active) {
  border-color: var(--border-strong);
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

.preview-sepia {
  background: #f7f1e3;
  border: 1px solid #ddd2b6;
}

.preview-green {
  background: #d7e7d0;
  border: 1px solid #b3c9ab;
}

.preview-solarized {
  background: #fdf6e3;
  border: 1px solid #e0d7bd;
}

.preview-nord {
  background: #2e3440;
  border: 1px solid #3b4252;
}

.preview-gruvbox {
  background: #282828;
  border: 1px solid #3c3836;
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
.preview-sepia .preview-bar { background: #d9cba4; }
.preview-green .preview-bar { background: #9fb996; }
.preview-solarized .preview-bar { background: #decf9f; }
.preview-nord .preview-bar { background: #4c566a; }
.preview-gruvbox .preview-bar { background: #504945; }
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
.preview-sepia .preview-line { background: #e6dcc4; }
.preview-green .preview-line { background: #bcd4b3; }
.preview-solarized .preview-line { background: #e8ddba; }
.preview-nord .preview-line { background: #434c5e; }
.preview-gruvbox .preview-line { background: #3c3836; }
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

/* Preset cards */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.12s ease, background-color 0.12s ease;
  text-align: left;
}

.preset-card.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.preset-card:hover:not(.active) {
  border-color: var(--border-strong);
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-card.active .preset-name {
  color: var(--accent);
}

.preset-desc {
  font-size: 10px;
  color: var(--text-muted);
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

/* Switch */
.switch {
  margin-left: auto;
  width: 34px;
  height: 20px;
  border: none;
  border-radius: 10px;
  background: var(--bg-tertiary);
  position: relative;
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
  padding: 0;
}

.switch.on {
  background: var(--accent);
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}

.switch.on .switch-knob {
  transform: translateX(14px);
}

/* Export buttons */
.export-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.export-btn {
  padding: 7px 12px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
  text-align: left;
}

.export-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Update section */
.update-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.update-info {
  flex: 1;
  min-width: 0;
}

.update-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.update-meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.update-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
  flex-shrink: 0;
}

.update-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.update-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.update-btn.primary:hover:not(:disabled) {
  background: var(--accent-hover);
  color: white;
}

.update-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* About */
.about-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 12px;
  text-decoration: none;
  transition: opacity 0.12s ease;
}

.about-link:hover {
  opacity: 0.8;
}

/* 弹窗过渡 */
.settings-modal-enter-active,
.settings-modal-leave-active {
  transition: opacity 0.18s ease;
}

.settings-modal-enter-active .settings-modal,
.settings-modal-leave-active .settings-modal {
  transition: transform 0.18s var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), opacity 0.18s ease;
}

.settings-modal-enter-from,
.settings-modal-leave-to {
  opacity: 0;
}

.settings-modal-enter-from .settings-modal,
.settings-modal-leave-to .settings-modal {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
