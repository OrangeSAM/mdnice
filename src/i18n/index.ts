import { ref } from 'vue'
import { zh } from './zh'
import { en } from './en'

// 轻量 i18n:词典 + 响应式 locale。t() 在组件渲染期读取 locale.value,
// 切换语言时所有用到 t() 的组件自动重渲染。

export type Locale = 'zh' | 'en'
export type LanguageSetting = 'system' | Locale

export const DICTS: Record<Locale, Record<string, string>> = { zh, en }

const locale = ref<Locale>('zh')

export function getLocale(): Locale {
  return locale.value
}

export function setLocale(l: Locale): void {
  locale.value = l
}

/** 解析设置项里的语言偏好;system 跟随系统语言 */
export function resolveLocale(setting: LanguageSetting): Locale {
  if (setting === 'zh' || setting === 'en') return setting
  return detectSystemLocale()
}

export function detectSystemLocale(): Locale {
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 翻译;缺 key 时回退英文,再缺则回显 key 便于发现遗漏 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[locale.value] ?? DICTS.en
  let text = dict[key] ?? DICTS.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return text
}
