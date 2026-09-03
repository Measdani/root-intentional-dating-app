import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import {
  CommunityProvider,
  installStorageNamespace,
  persistActiveCommunityId,
  resolveActiveCommunityId,
} from '@/modules'

const activeCommunityId = resolveActiveCommunityId()
installStorageNamespace(activeCommunityId)
persistActiveCommunityId(activeCommunityId)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CommunityProvider initialCommunityId={activeCommunityId}>
        <App />
      </CommunityProvider>
    </ErrorBoundary>
  </StrictMode>,
)
