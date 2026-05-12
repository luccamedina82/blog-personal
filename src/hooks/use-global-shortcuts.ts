import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'

const NAV_SEQUENCES: Record<string, string> = {
  'g a': '/study/decks',
  'g v': '/english/vocab',
  'g e': '/english/evaluator',
  'g s': '/english/shadowing',
  'g b': '/english/books',
  'g q': '/study/quizzes',
}

const SEQUENCE_TIMEOUT = 1000

export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const bufRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      ) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()
      if (timerRef.current) clearTimeout(timerRef.current)

      bufRef.current = [...bufRef.current, key].slice(-2)
      const seq = bufRef.current.join(' ')

      const dest = NAV_SEQUENCES[seq]
      if (dest) {
        e.preventDefault()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({ to: dest as any })
        bufRef.current = []
        return
      }

      timerRef.current = setTimeout(() => {
        bufRef.current = []
      }, SEQUENCE_TIMEOUT)
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [navigate])
}
