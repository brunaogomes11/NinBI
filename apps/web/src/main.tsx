import '@fontsource-variable/plus-jakarta-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AppProviders, createQueryClient } from './app/providers'
import { createAppRouter } from './app/router'
import './styles/index.css'

const client = createQueryClient()
const router = createAppRouter()

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
