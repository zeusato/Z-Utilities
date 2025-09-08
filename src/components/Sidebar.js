import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/Sidebar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { TOOLS } from "@/data/tools";
import { Image as ImageIcon, FileText, QrCode, PlayCircle, Boxes, Pin as PinIcon, } from "lucide-react";
// ---------------- Helpers ----------------
function getCatKey(t) {
    // common fields; fallback
    // @ts-ignore
    return t.categoryId || t.groupId || t.category || t.group || "Khác";
}
function getCatLabel(key, sample) {
    // @ts-ignore
    const explicit = sample?.categoryName || sample?.groupName;
    if (explicit)
        return explicit;
    const map = {
        image_pdf: "Công cụ xử lý hình ảnh & PDF",
        text_data: "Công cụ xử lý văn bản & dữ liệu",
        qr_cccd: "Công cụ QR Code & CCCD",
        media: "Công cụ đa phương tiện",
        other: "Tiện ích khác",
        Khác: "Tiện ích khác",
    };
    return map[key] || key;
}
function CatGlyph({ label }) {
    const L = label.toLowerCase();
    let Icon = Boxes;
    if (/(hình ảnh|ảnh|image|pdf)/i.test(L))
        Icon = ImageIcon;
    else if (/(văn bản|text|dữ liệu|data)/i.test(L))
        Icon = FileText;
    else if (/(qr|cccd)/i.test(L))
        Icon = QrCode;
    else if (/(đa phương tiện|media|audio|video)/i.test(L))
        Icon = PlayCircle;
    return _jsx(Icon, { className: "w-5 h-5" });
}
function groupToolsByCategory(tools) {
    const map = new Map();
    for (const t of tools) {
        const key = getCatKey(t);
        const label = getCatLabel(key, t);
        if (!map.has(key))
            map.set(key, { key, label, items: [] });
        map.get(key).items.push(t);
    }
    const arr = Array.from(map.values());
    const ORDER = ["image_pdf", "text_data", "qr_cccd", "media", "other", "Khác"];
    return arr.sort((a, b) => {
        const ia = ORDER.indexOf(a.key);
        const ib = ORDER.indexOf(b.key);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}
// ---------------- Component ----------------
export default function Sidebar() {
    const { pathname } = useLocation();
    const [hoverCat, setHoverCat] = React.useState(null); // compact hover state
    const [expanded, setExpanded] = React.useState(false); // full panel visibility
    const [pinned, setPinned] = React.useState(false); // keep panel open
    const collapseTimer = React.useRef(null);
    const hoverTimer = React.useRef(null);
    // groups (static)
    const groups = React.useMemo(() => groupToolsByCategory(TOOLS), []);
    const isToolActive = (slug) => pathname.startsWith("/tool/" + slug);
    // persist pinned
    React.useEffect(() => {
        const v = localStorage.getItem("sidebar_pinned");
        if (v === "1")
            setPinned(true);
    }, []);
    React.useEffect(() => {
        localStorage.setItem("sidebar_pinned", pinned ? "1" : "0");
    }, [pinned]);
    // auto-collapse when not pinned & mouse leaves full panel
    const handlePanelMouseEnter = () => {
        if (collapseTimer.current) {
            window.clearTimeout(collapseTimer.current);
            collapseTimer.current = null;
        }
    };
    const handlePanelMouseLeave = () => {
        if (!pinned) {
            collapseTimer.current = window.setTimeout(() => setExpanded(false), 500);
        }
    };
    return (_jsxs("aside", { className: "relative select-none", children: [_jsx("div", { className: "fixed left-3 top-1/2 -translate-y-1/2 z-40", children: _jsxs("div", { className: "glass rounded-2xl p-2 flex flex-col items-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl", children: [_jsx("button", { onClick: () => setExpanded((v) => !v), title: expanded ? "Thu gọn" : "Mở menu", className: "w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs transition-colors", children: expanded ? "«" : "»" }), _jsx("div", { className: "flex flex-col items-center gap-2", children: groups.map((g) => (_jsxs("div", { className: "relative group", onMouseEnter: () => {
                                    if (hoverCat !== g.key && hoverTimer.current === null) {
                                        hoverTimer.current = window.setTimeout(() => {
                                            setHoverCat(g.key);
                                            hoverTimer.current = null;
                                        }, 500);
                                    }
                                }, onMouseLeave: () => {
                                    if (hoverTimer.current !== null) {
                                        window.clearTimeout(hoverTimer.current);
                                        hoverTimer.current = null;
                                    }
                                    if (hoverCat === g.key) {
                                        setHoverCat(null);
                                    }
                                }, children: [_jsx("button", { "aria-label": g.label, className: "w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-lg bg-white/10 hover:bg-white/15 transition", children: _jsx(CatGlyph, { label: g.label }) }), _jsx("div", { className: `pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 opacity-0 transition-opacity ${hoverCat !== g.key ? 'group-hover:opacity-100' : ''}`, children: _jsx("div", { className: "glass px-2 py-1 rounded-md text-xs whitespace-nowrap", children: g.label }) }), _jsx("div", { className: `overflow-hidden transition-all duration-300 ${hoverCat === g.key ? "max-h-96 mt-1" : "max-h-0"}`, children: _jsx("div", { className: "flex flex-col items-center gap-2", children: g.items.map((t) => (_jsxs("div", { className: "relative group/tool", children: [_jsx(Link, { to: `/tool/${t.slug}`, className: `w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-base bg-white/10 hover:bg-white/15 transition ${isToolActive(t.slug) ? "bg-white/20" : ""}`, title: t.name, children: _jsx("span", { "aria-hidden": true, children: t.icon || "🛠" }) }), _jsx("div", { className: "pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 opacity-0 group-hover/tool:opacity-100 transition-opacity", children: _jsx("div", { className: "glass px-2 py-1 rounded-md text-xs whitespace-nowrap", children: t.name }) })] }, t.id))) }) })] }, g.key))) })] }) }), _jsx("div", { className: `fixed left-3 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'w-[320px] md:w-[380px]' : 'w-0'}`, children: _jsxs("div", { className: `glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 p-3' : 'opacity-0 p-0'}`, onMouseEnter: handlePanelMouseEnter, onMouseLeave: handlePanelMouseLeave, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("div", { className: "text-sm opacity-80 px-1", children: "T\u1EA5t c\u1EA3 c\u00F4ng c\u1EE5" }), _jsxs("button", { onClick: () => setPinned((v) => !v), className: `rounded-md px-2 py-1 border border-white/15 transition flex items-center gap-1 text-xs ${pinned ? "bg-cyan-500/70 text-white" : "bg-white/10 hover:bg-white/15"}`, title: pinned ? "Đang ghim" : "Ghim menu", "aria-pressed": pinned, children: [_jsx(PinIcon, { className: "w-3.5 h-3.5" }), pinned ? "Đã ghim" : "Ghim"] })] }), _jsx("div", { className: "space-y-3 pr-1 max-h-[70vh] overflow-y-auto scrollbar-none", children: groups.map((g) => (_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 p-2", children: [_jsxs("div", { className: "flex items-center gap-2 px-1 mb-2", children: [_jsx(CatGlyph, { label: g.label }), _jsx("div", { className: "font-medium text-sm", children: g.label })] }), _jsx("div", { className: "grid grid-cols-1 gap-1", children: g.items.map((t) => (_jsxs(Link, { to: `/tool/${t.slug}`, className: `rounded-lg px-2 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 transition flex items-center gap-2 ${isToolActive(t.slug) ? "bg-white/20" : ""}`, children: [_jsx("span", { className: "text-lg", "aria-hidden": true, children: t.icon || "🛠" }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "font-medium text-sm truncate", children: t.name }), t.shortDesc && (_jsx("div", { className: "text-[11px] opacity-70 truncate", children: t.shortDesc }))] })] }, t.id))) })] }, g.key))) })] }) })] }));
}
