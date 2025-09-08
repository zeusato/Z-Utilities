import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { TOOLS } from '@/data/tools';
import { useRecentTools } from '@/hooks/useRecentTools';
export default function ToolPage() {
    const { slug } = useParams();
    const tool = TOOLS.find(t => t.slug === slug);
    const { push } = useRecentTools();
    useEffect(() => {
        if (slug)
            push(slug);
    }, [slug, push]);
    if (!tool) {
        return (_jsxs("div", { className: "min-h-screen", children: [_jsx(Header, {}), _jsx("main", { className: "max-w-4xl mx-auto px-4 md:px-6 py-12", children: _jsx("div", { className: "opacity-80", children: "Kh\u00F4ng t\u00ECm th\u1EA5y c\u00F4ng c\u1EE5." }) })] }));
    }
    let ToolComp = null;
    if (tool.componentPath) {
        ToolComp = lazy(() => import(/* @vite-ignore */ tool.componentPath));
    }
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx(Header, {}), _jsxs("main", { className: "max-w-4xl mx-auto px-4 md:px-6 py-12", children: [_jsx("h1", { className: "text-2xl md:text-3xl font-bold", children: tool.name }), tool.shortDesc && _jsx("p", { className: "opacity-80", children: tool.shortDesc }), _jsx("div", { className: "mt-6", children: ToolComp ? (_jsx(Suspense, { fallback: _jsx("div", { className: "rounded-2xl glass p-6", children: "\u0110ang t\u1EA3i c\u00F4ng c\u1EE5..." }), children: _jsx(ToolComp, {}) })) : (_jsxs("div", { className: "rounded-2xl glass p-6", children: ["Tool ", _jsx("strong", { children: tool.slug }), " ch\u01B0a \u0111\u01B0\u1EE3c khai b\u00E1o componentPath."] })) })] })] }));
}
