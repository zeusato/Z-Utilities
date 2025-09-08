import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Intro from '@/pages/Intro'
import Workspace from '@/pages/Workspace'
import ToolPage from '@/pages/ToolPage'
import '@/styles/globals.css'

// BASE_URL: dev = "/", build (gh-pages) = "/Z-Utilities/"
const router = createBrowserRouter(
  [
    { path: '/', element: <Intro /> },
    { path: '/app', element: <Workspace /> },
    { path: '/tool/:slug', element: <ToolPage /> },
    // fallback về Intro nếu route lạ (tránh 404 trong SPA)
    { path: '*', element: <Intro /> },
  ],
  { basename: import.meta.env.BASE_URL }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
