import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export default function ToolCard({ tool }) {
    return (_jsxs(Link, { to: `/tool/${tool.slug}`, className: "rounded-2xl glass p-4 hover:bg-white/15 transition block", children: [_jsx("div", { className: "text-2xl", children: tool.icon || '🛠' }), _jsx("div", { className: "mt-2 font-semibold", children: tool.name }), _jsx("div", { className: "text-sm opacity-80", children: tool.shortDesc })] }));
}
