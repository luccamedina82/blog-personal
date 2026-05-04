// src/main.tsx
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

// 1. Importás el árbol que Vite generó solo
import { routeTree } from './routeTree.gen'

// 2. Creás el router
const router = createRouter({ routeTree })

// 3. Registrás el router para el autocompletado de TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// 4. Renderizás
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)