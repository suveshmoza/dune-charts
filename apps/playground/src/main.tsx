import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ChartPlayground } from '@/playground/ChartPlayground';
import { ChartShowcase } from '@/playground/ChartShowcase';

import App from './App.tsx';

import '@suveshmoza/dune-charts/styles.css';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ChartPlayground /> },
      { path: 'showcase', element: <ChartShowcase /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </StrictMode>,
);
