// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import QuickOpen from '../components/QuickOpen.vue'
import { useAppStore } from '../stores/app'

// mock tauri invoke,避免 happy-dom 下无 Tauri internals 报错
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => []),
}))

function mountQuickOpen() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppStore()
  const wrapper = mount(QuickOpen, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

describe('QuickOpen', () => {
  it('showQuickOpen=true 时渲染弹层与输入框', async () => {
    const { wrapper, store } = mountQuickOpen()
    expect(wrapper.find('.quickopen-overlay').exists()).toBe(false)

    store.showQuickOpen = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quickopen-overlay').exists()).toBe(true)
    expect(wrapper.find('.quickopen-input').exists()).toBe(true)
  })

  it('打开后显示空状态提示,输入查询后不抛错', async () => {
    const { wrapper, store } = mountQuickOpen()
    store.showQuickOpen = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('输入文件名过滤')

    const input = wrapper.find('.quickopen-input')
    await input.setValue('框架')
    await wrapper.vm.$nextTick()
    // 无文件夹时无结果但不报错
    expect(wrapper.find('.quickopen-overlay').exists()).toBe(true)
  })

  it('Esc 关闭弹层', async () => {
    const { wrapper, store } = mountQuickOpen()
    store.showQuickOpen = true
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.quickopen-input')
    await input.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    expect(store.showQuickOpen).toBe(false)
    expect(wrapper.find('.quickopen-overlay').exists()).toBe(false)
  })
})
