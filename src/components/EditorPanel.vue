<template>
  <div class="editor-panel" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { useAppStore } from '../stores/app'
import { debounce } from 'lodash-es'

const store = useAppStore()
const editorContainer = ref<HTMLElement>()
const editorView = shallowRef<EditorView>()

const emit = defineEmits<{
  (e: 'update', content: string): void
}>()

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

  const state = EditorState.create({
    doc: store.fileContent || '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle),
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
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
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
