import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { DevLabAnnotation } from './types'

export const annotationDecorationKey = new PluginKey('devlabAnnotationDecoration')

export type AnnotationsExtensionOptions = {
  getAnnotations: () => DevLabAnnotation[]
  onAnnotationClick?: (annotationId: string, rect: { top: number; left: number }) => void
}

function buildDecorations(doc: import('@tiptap/pm/model').Node, annotations: DevLabAnnotation[]): DecorationSet {
  const decos: Decoration[] = []
  // Only highlight pending annotations
  const active = annotations.filter((a) => a.status === 'pending')
  if (active.length === 0) return DecorationSet.empty

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    for (const ann of active) {
      const idx = node.text.indexOf(ann.original_text)
      if (idx < 0) continue
      decos.push(
        Decoration.inline(
          pos + idx,
          pos + idx + ann.original_text.length,
          {
            class: `devlab-annotation devlab-annotation--${ann.kind}`,
            'data-annotation-id': ann.id,
          },
        ),
      )
    }
  })
  return DecorationSet.create(doc, decos)
}

export const AnnotationsExtension = Extension.create<AnnotationsExtensionOptions>({
  name: 'devlabAnnotations',

  addOptions() {
    return {
      getAnnotations: () => [],
      onAnnotationClick: undefined,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: annotationDecorationKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc, options.getAnnotations())
          },
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(annotationDecorationKey) as DevLabAnnotation[] | undefined
            if (meta) return buildDecorations(newState.doc, meta)
            if (tr.docChanged) return buildDecorations(newState.doc, options.getAnnotations())
            return prev
          },
        },
        props: {
          decorations(state) {
            return annotationDecorationKey.getState(state)
          },
          handleDOMEvents: {
            click(_view, event) {
              const target = event.target as HTMLElement | null
              const el = target?.closest('[data-annotation-id]') as HTMLElement | null
              if (!el) return false
              const id = el.getAttribute('data-annotation-id')
              if (!id) return false
              const rect = el.getBoundingClientRect()
              options.onAnnotationClick?.(id, { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX })
              event.preventDefault()
              return true
            },
          },
        },
      }),
    ]
  },
})

export function dispatchAnnotationsUpdate(
  editor: import('@tiptap/react').Editor,
  annotations: DevLabAnnotation[],
) {
  editor.view.dispatch(editor.state.tr.setMeta(annotationDecorationKey, annotations))
}
