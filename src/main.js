import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Intro from '@/pages/Intro';
import Workspace from '@/pages/Workspace';
import ToolPage from '@/pages/ToolPage';
import '@/styles/globals.css';
// BASE_URL: dev = "/", build (gh-pages) = "/Z-Utilities/"
const router = createBrowserRouter([
    { path: '/', element: _jsx(Intro, {}) },
    { path: '/app', element: _jsx(Workspace, {}) },
    { path: '/tool/:slug', element: _jsx(ToolPage, {}) },
    // fallback về Intro nếu route lạ (tránh 404 trong SPA)
    { path: '*', element: _jsx(Intro, {}) },
], { basename: import.meta.env.BASE_URL });
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(RouterProvider, { router: router }) }));
