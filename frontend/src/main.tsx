import { createRoot } from 'react-dom/client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import './styles/global.css'
import { ReactQueryPersistProvider } from './lib/react-query/persist.tsx'
import { QueryErrorBoundary } from './components/error-handling/QueryErrorBoundary'

// Set initial theme based on localStorage before rendering the app
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <ReactQueryPersistProvider>
    <QueryErrorBoundary>
      <App />
      {/* React Query DevTools temporariamente desabilitado por erro de cache */}
      {/* {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryErrorBoundary>
  </ReactQueryPersistProvider>,
)
