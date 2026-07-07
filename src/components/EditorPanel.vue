<template>
  <div class="editor-panel" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef, computed } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, HighlightStyle } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'

const store = useAppStore()
const editorContainer = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()

const emit = defineEmits<{
  (e: 'update', content: string): void
}>()

function getEffectiveTheme(): string {
  const mode = store.settings.theme || 'light'
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

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

  const isDark = getEffectiveTheme() === 'dark'

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
          backgroundColor: isDark ? '#0f1117' : '#f8f7f4',
          color: isDark ? '#e2e4ea' : '#1a1a1a',
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
          color: isDark ? '#e2e4ea' : '#1a1a1a',
        },
        '.cm-content': {
          caretColor: isDark ? '#60a5fa' : '#2563eb',
          color: isDark ? '#e2e4ea' : '#1a1a1a',
        },
        '.cm-gutters': {
          backgroundColor: isDark ? '#0f1117' : '#f8f7f4',
          color: isDark ? '#5c6078' : '#a3a3a3',
          borderRightColor: isDark ? '#1e2030' : '#e2e0db',
        },
        '.cm-activeLineGutter': {
          backgroundColor: isDark ? '#161822' : '#f0efeb',
          color: isDark ? '#9498a8' : '#525252',
        },
        '.cm-activeLine': {
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.06)' : 'rgba(37, 99, 235, 0.04)',
        },
        '.cm-selectionBackground': {
          backgroundColor: isDark ? 'rgba(251, 146, 60, 0.1)' : 'rgba(194, 65, 12, 0.08) !important',
        },
        '.cm-cursor': {
          borderLeftColor: isDark ? '#60a5fa' : '#2563eb',
        },
        '.cm-matchingBracket': {
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(37, 99, 235, 0.12)',
          outline: isDark ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)',
        },
        '.cm-placeholder': {
          color: isDark ? '#5c6078' : '#a3a3a3',
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
