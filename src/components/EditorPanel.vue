<template>
  <div class="editor-panel" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef, computed } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, HighlightStyle } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import { useAppStore } from '../stores/app'
import { isDarkThemeValue } from '../composables/useTheme'
import { debounce } from 'lodash-es'

const store = useAppStore()
const editorContainer = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()

const emit = defineEmits<{
  (e: 'update', content: string): void
}>()

// 深色系主题(深色/极夜/暖夜)用深色语法高亮;界面底色全部走 CSS 变量,自动跟随全部主题
const isDark = isDarkThemeValue(store.settings.theme)

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.heading2, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.heading3, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.heading4, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.heading5, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.heading6, color: '#60a5fa', fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#c4b5fd' },
  { tag: tags.strong, fontWeight: '700', color: '#e2e4ea' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#5c6078' },
  { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
  { tag: tags.url, color: '#5c6078' },
  { tag: tags.string, color: '#a5d6ff' },
  { tag: tags.keyword, color: '#c4b5fd' },
  { tag: tags.comment, color: '#5c6078', fontStyle: 'italic' },
  { tag: tags.meta, color: '#5c6078' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.9em' },
  { tag: tags.processingInstruction, color: '#5c6078' },
  { tag: tags.escape, color: '#fbbf24' },
  { tag: tags.atom, color: '#f87171' },
  { tag: tags.bool, color: '#f87171' },
  { tag: tags.definition(tags.variableName), color: '#e2e4ea' },
  { tag: tags.tagName, color: '#f87171' },
  { tag: tags.bracket, color: '#9498a8' },
  { tag: tags.content, color: '#e2e4ea' },
])

onMounted(() => {
  if (!editorContainer.value) return

  const handleUpdate = debounce((update: any) => {
    if (update.docChanged) {
      const content = update.state.doc.toString()
      store.setContent(content)
      emit('update', content)
    }
  }, 200)

  const updateHandler = EditorView.updateListener.of((update) => {
    handleUpdate(update)
  })

  // 编辑器创建时快照一次深色判断即可:语法高亮配色切换需重建 state,主题改版由整体刷新兜底
  const isDark = isDarkThemeValue(store.settings.theme)

  const state = EditorState.create({
    doc: store.fileContent || '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(isDark ? darkHighlightStyle : defaultHighlightStyle),
      highlightSelectionMatches(),
      autocompletion(),
      markdown(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      updateHandler,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: 'var(--editor-font-size, 14px)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
        },
        '.cm-content': {
          caretColor: 'var(--accent)',
          color: 'var(--text-primary)',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          borderRight: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
        },
        '.cm-activeLine': {
          backgroundColor: 'var(--accent-light)',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'var(--accent-soft) !important',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--accent)',
        },
        '.cm-matchingBracket': {
          backgroundColor: 'var(--accent-light)',
          outline: '1px solid var(--accent-soft)',
        },
        '.cm-placeholder': {
          color: 'var(--text-muted)',
        },
      }),
    ],
  })

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  })
})

watch(
  () => store.fileContent,
  (newContent) => {
    if (!editorView.value) return
    const currentContent = editorView.value.state.doc.toString()
    if (newContent !== currentContent) {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newContent,
        },
      })
    }
  }
)

// 切换文件时,把光标与滚动重置回顶部,避免停留在上一个文件的阅读位置
watch(
  () => store.currentFilePath,
  () => {
    if (!editorView.value) return
    editorView.value.dispatch({
      selection: EditorSelection.single(0),
      scrollIntoView: true,
    })
  }
)
</script>

<style scoped>
.editor-panel {
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.editor-panel :deep(.cm-editor) {
  height: 100%;
}
</style>
