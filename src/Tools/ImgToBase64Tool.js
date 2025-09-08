"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useState } from "react";
// Glass card style reuse
const fieldBox = "rounded-2xl border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-900/60 dark:border-zinc-700";
// Helpers
const kb = (bytes) => (bytes / 1024).toFixed(1);
function dataUrlMime(dataUrl) {
    const m = /^data:([^;]+);base64,/.exec(dataUrl);
    return m?.[1];
}
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = (e) => resolve(String(e.target?.result || ""));
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}
async function transformDataURL(dataUrl, opts) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (opts.resize) {
                const W = Number(opts.W) || 0;
                const H = Number(opts.H) || 0;
                if (W && !H) {
                    h = Math.round((img.naturalHeight * W) / img.naturalWidth);
                    w = W;
                }
                else if (H && !W) {
                    w = Math.round((img.naturalWidth * H) / img.naturalHeight);
                    h = H;
                }
                else if (W && H) {
                    w = W;
                    h = H;
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.floor(w));
            canvas.height = Math.max(1, Math.floor(h));
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const q = Math.min(1, Math.max(0.01, (opts.quality ?? 0.92)));
            const type = opts.forceType || dataUrlMime(dataUrl) || "image/png";
            try {
                resolve(canvas.toDataURL(type, q));
            }
            catch (e) {
                reject(e);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}
export default function ImgToBase64Tool() {
    const [items, setItems] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);
    // Controls
    const [forceType, setForceType] = useState("");
    const [resize, setResize] = useState(false);
    const [W, setW] = useState("");
    const [H, setH] = useState("");
    const [quality, setQuality] = useState(92);
    const handlePick = () => fileRef.current?.click();
    const handleFiles = useCallback(async (files) => {
        if (!files)
            return;
        const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
        const out = [];
        for (const f of arr) {
            const src = await fileToDataURL(f);
            const dataUrl = await transformDataURL(src, {
                forceType: forceType || undefined,
                resize,
                W: Number(W) || undefined,
                H: Number(H) || undefined,
                quality: quality / 100,
            });
            out.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, fileKB: kb(f.size), dataUrl });
        }
        setItems((prev) => [...prev, ...out]);
    }, [forceType, resize, W, H, quality]);
    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };
    const onDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };
    const onDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };
    const clearList = () => setItems([]);
    const resetAll = () => {
        clearList();
        setForceType("");
        setResize(false);
        setW("");
        setH("");
        setQuality(92);
    };
    const combinedHTML = useMemo(() => {
        return items
            .map((it) => `<img src="${it.dataUrl}" alt="${it.name.replace(/"/g, "&quot;")}" />`)
            .join("\n");
    }, [items]);
    const copyCombined = async () => {
        try {
            await navigator.clipboard.writeText(combinedHTML);
        }
        catch { }
    };
    const downloadHTML = () => {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Base64 Images</title></head><body>\n${combinedHTML}\n</body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "base64-images.html";
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsx("div", { className: "w-full h-full", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[0.5fr_2fr] gap-4", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: `${fieldBox} p-4`, children: _jsxs("div", { className: "flex flex-wrap justify-start items-center gap-2", children: [_jsx("button", { onClick: handlePick, className: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700", children: "Ch\u1ECDn \u1EA3nh" }), _jsxs("select", { value: forceType, onChange: (e) => setForceType(e.target.value), className: "rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm dark:bg-zinc-900/60 dark:border-zinc-700", title: "\u0110\u1ECBnh d\u1EA1ng xu\u1EA5t", children: [_jsx("option", { value: "", children: "Gi\u1EEF \u0111\u1ECBnh d\u1EA1ng g\u1ED1c" }), _jsx("option", { value: "image/png", children: "\u00C9p PNG" }), _jsx("option", { value: "image/jpeg", children: "\u00C9p JPEG" }), _jsx("option", { value: "image/webp", children: "\u00C9p WEBP" })] }), _jsxs("div", { className: "flex items-center justify-start gap-2 text-xs opacity-80", children: [_jsx("span", { children: "Quality" }), _jsx("input", { type: "number", min: 1, max: 100, value: quality, onChange: (e) => setQuality(Math.max(1, Math.min(100, Number(e.target.value) || 92))), className: "w-[88px] rounded-lg border border-zinc-300 bg-white/70 px-2 py-1.5 text-xs dark:bg-zinc-900/60 dark:border-zinc-700", title: "JPEG/WEBP quality" })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-3", children: [_jsxs("label", { className: "ml-1 flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", className: "accent-indigo-600", checked: resize, onChange: (e) => setResize(e.target.checked) }), "Resize"] }), _jsx("input", { type: "number", placeholder: "Width px", value: W, onChange: (e) => setW(e.target.value), disabled: !resize, className: "w-[120px] rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm disabled:opacity-50 dark:bg-zinc-900/60 dark:border-zinc-700" }), _jsx("input", { type: "number", placeholder: "Height px", value: H, onChange: (e) => setH(e.target.value), disabled: !resize, className: "w-[120px] rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm disabled:opacity-50 dark:bg-zinc-900/60 dark:border-zinc-700" })] })] }) }), _jsxs("div", { className: `${fieldBox} ${dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-dashed"} p-6 text-center text-zinc-600 dark:text-zinc-300 cursor-pointer`, onClick: handlePick, onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop, children: [_jsx("div", { className: "text-4xl", children: "\uD83D\uDDBC\uFE0F" }), _jsx("div", { className: "mt-1 text-sm opacity-80", children: "K\u00E9o & th\u1EA3 \u1EA3nh v\u00E0o \u0111\u00E2y (ho\u1EB7c b\u1EA5m \u201CCh\u1ECDn \u1EA3nh\u201D)." }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e) => handleFiles(e.target.files) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: clearList, className: "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800", children: "Xo\u00E1 danh s\u00E1ch" }), _jsx("button", { onClick: resetAll, className: "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800", children: "Reset all" })] })] }), _jsx("div", { className: `${fieldBox} p-4`, children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-3 text-sm font-semibold", children: "Danh s\u00E1ch k\u1EBFt qu\u1EA3" }), _jsxs("div", { className: "grid gap-3", children: [items.map((it, idx) => {
                                                const sizeKB = Math.ceil((it.dataUrl.length * 3) / 4 / 1024);
                                                const tag = `<img src="${it.dataUrl}" alt="${it.name.replace(/"/g, "&quot;")}" />`;
                                                return (_jsxs("div", { className: "grid grid-cols-[140px_1fr] gap-3 items-start rounded-xl border border-zinc-200 p-2 dark:border-zinc-700", children: [_jsx("img", { src: it.dataUrl, className: "h-[140px] w-[140px] rounded-md object-cover bg-zinc-100", alt: "thumb" }), _jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2 justify-between text-xs text-green-400", children: [_jsxs("div", { children: [it.name, " \u00B7 ", it.fileKB, " KB \u2192 ", sizeKB.toLocaleString(), " KB"] }), _jsxs("div", { className: "flex gap-2 text-white", children: [_jsxs("button", { onClick: async () => {
                                                                                        await navigator.clipboard.writeText(tag);
                                                                                    }, className: "rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800", children: ["Copy ", _jsx("code", { children: "<img>" })] }), _jsx("button", { onClick: async () => {
                                                                                        await navigator.clipboard.writeText(it.dataUrl);
                                                                                    }, className: "rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800", children: "Copy data URL" })] })] }), _jsx("textarea", { className: "w-full min-h-[110px] resize-vertical rounded-lg border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:bg-zinc-900 dark:text-white dark:border-zinc-700", spellCheck: false, value: tag, readOnly: true })] })] }, it.id));
                                            }), !items.length && (_jsx("div", { className: "rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700", children: "Ch\u01B0a c\u00F3 \u1EA3nh n\u00E0o. H\u00E3y t\u1EA3i \u1EA3nh \u1EDF khung b\u00EAn tr\u00E1i." }))] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-3 text-sm font-semibold", children: "G\u1ED9p t\u1EA5t c\u1EA3 (HTML snippet)" }), _jsx("textarea", { className: "h-[260px] w-full resize-vertical rounded-lg border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:bg-zinc-900 dark:text-white dark:border-zinc-700", value: combinedHTML, readOnly: true }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx("button", { onClick: copyCombined, className: "rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700", children: "Copy t\u1EA5t c\u1EA3" }), _jsx("button", { onClick: downloadHTML, className: "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800", children: "T\u1EA3i .html" })] }), _jsx("p", { className: "mt-3 text-xs text-zinc-500", children: "M\u1EB9o: Base64 l\u00E0m HTML n\u1EB7ng, n\u00EAn ch\u1EC9 d\u00F9ng cho logo/icon/gif nh\u1ECF, email template, ho\u1EB7c khi c\u1EA7n 1 file duy nh\u1EA5t." })] })] }) })] }) }));
}
