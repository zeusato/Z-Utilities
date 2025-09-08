import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/Workspace.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ToolCard from "@/components/ToolCard";
import { TOOLS } from "@/data/tools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { DotBackground } from "@/components/lightswind/grid-dot-background";
// ---------------- Search helpers (accent-insensitive + fuzzy) ----------------
// 1) Remove Vietnamese diacritics and standardize text
function normalizeVN(str) {
    if (!str)
        return "";
    // Remove combining marks + map đ/Đ -> d/D, lower-case
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
}
// 2) Tokenize to ASCII words after normalization (works well for VN text w/o accents)
function tokenize(str) {
    return normalizeVN(str)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}
// 3) Build a searchable haystack from a tool item
function buildHaystack(t) {
    const extras = [
        t?.slug,
        t?.shortDesc,
        ...(Array.isArray(t.keywords) ? t.keywords : []),
        ...(Array.isArray(t.tags) ? t.tags : []),
        t.group || t.category || "",
    ]
        .filter(Boolean)
        .join(" ");
    return `${t.name || ""} ${extras}`;
}
// 4) Fuzzy score (0..100). Accent-insensitive, supports partial tokens, order, prefix.
function fuzzyScore(query, text) {
    const q = normalizeVN(query.trim());
    const h = normalizeVN(text);
    if (!q)
        return 1; // empty query -> tiny positive score
    if (!h)
        return 0;
    // quick full-substring bonus
    let score = h.includes(q) ? 85 : 0;
    const qTokens = tokenize(query);
    const hTokens = tokenize(text);
    if (!qTokens.length)
        return score;
    // token coverage
    let covered = 0;
    let prefixHits = 0;
    for (const qt of qTokens) {
        // present if any token in haystack contains it as substring
        const hit = hTokens.some((ht) => ht.includes(qt));
        if (hit)
            covered++;
        // prefix boost
        if (hTokens.some((ht) => ht.startsWith(qt)))
            prefixHits++;
    }
    const coverage = (covered / qTokens.length) * 60; // up to +60
    const prefixBoost = Math.min(prefixHits * 4, 12); // up to +12
    // order proximity: positions of first occurrences
    let orderBoost = 0;
    const firstPos = hTokens.findIndex((ht) => ht.includes(qTokens[0] || ""));
    const lastPos = hTokens.findIndex((ht) => ht.includes(qTokens[qTokens.length - 1] || ""));
    if (firstPos >= 0 && lastPos >= 0 && lastPos >= firstPos) {
        const span = (lastPos - firstPos + 1) || 1;
        orderBoost = Math.max(0, 12 - span * 2); // tighter span => more boost
    }
    score = Math.max(score, 0) + coverage + prefixBoost + orderBoost;
    return Math.max(0, Math.min(100, score));
}
export default function Workspace() {
    const { slug } = useParams();
    const [q, setQ] = React.useState("");
    const { recent, push } = useRecentTools();
    // Lock page scroll khi vào workspace
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);
    const featured = TOOLS.filter((t) => t.featured).slice(0, 4);
    // Accent-insensitive fuzzy over name + extras
    const filtered = TOOLS
        .map((t) => ({ t, hay: buildHaystack(t), sc: fuzzyScore(q, buildHaystack(t)) }))
        .filter((x) => x.sc >= 30) // permissive threshold
        .sort((a, b) => b.sc - a.sc)
        .map((x) => x.t);
    const tool = slug ? TOOLS.find((t) => t.slug === slug) : null;
    // Ghi nhớ tool gần đây
    useEffect(() => {
        if (slug)
            push(slug);
    }, [slug, push]);
    // Chuẩn bị comp tool (componentPath nên là relative literal, vd: "../Tools/UrlShortener.tsx")
    let ToolComp = null;
    if (tool?.componentPath) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ToolComp = lazy(() => import(/* @vite-ignore */ tool.componentPath));
    }
    return (_jsxs("div", { className: "relative h-[100svh] overflow-hidden", children: [_jsx("div", { className: "absolute inset-x-0 top-0 z-40", children: _jsx(Header, {}) }), _jsx(Sidebar, {}), _jsx(DotBackground, { dotSize: 1, dotColor: "#d4d4d4", darkDotColor: "#404040", spacing: 22, showFade: true, fadeIntensity: 28, className: "fixed inset-0 -z-10 pointer-events-none" }), _jsxs("main", { className: "h-[100svh] px-4 md:px-6 pt-20 pb-6", children: [!slug && (_jsx("section", { className: "grid h-full place-items-center", children: _jsxs("div", { className: "w-full max-w-6xl", children: [_jsxs("div", { className: "text-center", children: [_jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "T\u00ECm c\u00F4ng c\u1EE5...", className: "w-full max-w-xl mx-auto rounded-2xl glass px-4 py-3 text-base" }), _jsx("div", { className: "mt-8 grid grid-cols-2 gap-4 max-w-xl mx-auto", children: (recent.length ? TOOLS.filter((t) => recent.includes(t.slug)).slice(0, 4) : featured).map((t) => (_jsx(ToolCard, { tool: t }, t.id))) })] }), q && (_jsxs("div", { className: "mt-10", children: [_jsx("div", { className: "mb-3 text-white/80 text-sm", children: "K\u1EBFt qu\u1EA3" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", children: [filtered.map((t) => (_jsx(ToolCard, { tool: t }, t.id))), filtered.length === 0 && _jsx("div", { className: "opacity-70", children: "Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3" })] })] }))] }) })), slug && (_jsx("section", { className: "h-full max-w-6xl mx-auto", children: tool ? (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "shrink-0 space-y-1", children: [_jsx("h1", { className: "text-2xl md:text-3xl font-bold", children: tool.name }), tool.shortDesc && _jsx("p", { className: "opacity-80", children: tool.shortDesc })] }), _jsx("div", { className: "mt-6 grow overflow-auto rounded-2xl", children: ToolComp ? (_jsx(Suspense, { fallback: _jsx("div", { className: "rounded-2xl glass p-6", children: "\u0110ang t\u1EA3i c\u00F4ng c\u1EE5..." }), children: _jsx("div", { className: "h-full", children: _jsx(ToolComp, {}) }) })) : (_jsxs("div", { className: "rounded-2xl glass p-6", children: ["Tool ", _jsx("strong", { children: tool.slug }), " ch\u01B0a khai b\u00E1o ", _jsx("code", { children: "componentPath" }), "."] })) })] })) : (_jsx("div", { className: "opacity-80", children: "Kh\u00F4ng t\u00ECm th\u1EA5y c\u00F4ng c\u1EE5." })) }))] })] }));
}
