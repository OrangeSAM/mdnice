import type { Ref } from 'vue'
import type { FileEntry } from '../stores/app'

export interface FileTreeContext {
  openContextMenu: (e: MouseEvent, item: FileEntry) => void
  collapseSignal: Ref<number>
}

export const FILE_TREE_CONTEXT_KEY = Symbol('FILE_TREE_CONTEXT_KEY')
