import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import CataloguePage from './pages/CataloguePage';
import PODraftPage from './pages/PODraftPage';
import POListPage from './pages/POListPage';
import PODetailPage from './pages/PODetailPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/catalogue" replace />,
  },
  {
    element: <AppShell />,
    children: [
      { path: '/catalogue', element: <CataloguePage /> },
      { path: '/po/draft', element: <PODraftPage /> },
      { path: '/po', element: <POListPage /> },
      { path: '/po/:id', element: <PODetailPage /> },
    ],
  },
]);

async function bootstrap() {
  // Start MSW only in dev when the env flag is set
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'warn' });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element with id "root" not found');

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();

