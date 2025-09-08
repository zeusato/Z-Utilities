"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from "react";
const fieldClass = "w-full rounded-xl border border-zinc-300/70 bg-white/60 backdrop-blur px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/60 dark:bg-zinc-900/50 dark:border-zinc-700";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.12;
export default function ColorPaletteTool() {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const exportCanvasRef = useRef(null);
    const uploadInputRef = useRef(null);
    const [viewport, setViewport] = useState({ w: 0, h: 0, dpr: 1 });
    const [img, setImg] = useState(null);
    const [baseScale, setBaseScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedColor, setSelectedColor] = useState("");
    const [palette, setPalette] = useState([]);
    const [scheme, setScheme] = useState("monochrome");
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
    // ---------- Canvas sizing (fix ratio + DPI) ----------
    const syncCanvasSize = useCallback(() => {
        const wrap = containerRef.current;
        const c = canvasRef.current;
        if (!wrap || !c)
            return;
        const rect = wrap.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Size backing store in device pixels, draw in CSS pixels via transform
        c.width = Math.max(1, Math.round(rect.width * dpr));
        c.height = Math.max(1, Math.round(rect.height * dpr));
        c.style.width = rect.width + "px";
        c.style.height = rect.height + "px";
        const ctx = c.getContext("2d");
        if (ctx)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        setViewport({ w: rect.width, h: rect.height, dpr });
    }, []);
    useEffect(() => {
        syncCanvasSize();
        const onR = () => syncCanvasSize();
        window.addEventListener("resize", onR);
        const ResizeObserver = window.ResizeObserver;
        const ro = ResizeObserver ? new ResizeObserver(() => syncCanvasSize()) : null;
        if (ro && containerRef.current)
            ro.observe(containerRef.current);
        return () => {
            window.removeEventListener("resize", onR);
            ro?.disconnect();
        };
    }, [syncCanvasSize]);
    // ---------- Load/Paste/Drop image ----------
    const loadImageFromBlob = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const im = new Image();
            im.onload = () => setImg(im);
            im.src = String(e.target?.result || "");
        };
        reader.readAsDataURL(file);
    };
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f)
            loadImageFromBlob(f);
        if (uploadInputRef.current)
            uploadInputRef.current.value = "";
    };
    useEffect(() => {
        const paste = (e) => {
            const items = e.clipboardData?.items;
            if (!items)
                return;
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.type.startsWith("image/")) {
                    const b = it.getAsFile();
                    if (b)
                        loadImageFromBlob(b);
                    break;
                }
            }
        };
        const prevent = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        const drop = (e) => {
            const f = e.dataTransfer?.files?.[0];
            if (f)
                loadImageFromBlob(f);
        };
        window.addEventListener("paste", paste);
        ["dragenter", "dragover", "dragleave", "drop"].forEach((n) => document.body.addEventListener(n, prevent));
        document.body.addEventListener("drop", drop);
        return () => {
            window.removeEventListener("paste", paste);
            ["dragenter", "dragover", "dragleave", "drop"].forEach((n) => document.body.removeEventListener(n, prevent));
            document.body.removeEventListener("drop", drop);
        };
    }, []);
    // ---------- Compute base scale to FIT (không méo ảnh) ----------
    useEffect(() => {
        if (!img)
            return;
        if (!viewport.w || !viewport.h)
            return;
        const sX = viewport.w / img.naturalWidth;
        const sY = viewport.h / img.naturalHeight;
        const s = Math.min(sX, sY); // giới hạn theo chiều chạm khung trước (fit toàn bộ)
        setBaseScale(s);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [img, viewport.w, viewport.h]);
    // ---------- Draw ----------
    const draw = useCallback(() => {
        const c = canvasRef.current;
        if (!c)
            return;
        const ctx = c.getContext("2d");
        if (!ctx)
            return;
        // Clear
        ctx.clearRect(0, 0, viewport.w, viewport.h);
        if (!img)
            return;
        const scale = baseScale * zoom;
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        const cx = (viewport.w - drawW) / 2 + pan.x;
        const cy = (viewport.h - drawH) / 2 + pan.y;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, cx, cy, drawW, drawH);
    }, [img, baseScale, zoom, pan.x, pan.y, viewport.w, viewport.h]);
    useEffect(() => {
        draw();
    }, [draw]);
    // ---------- Interactions ----------
    const onMouseDown = (e) => {
        setDragging(true);
        const rect = e.target.getBoundingClientRect();
        setDragStart({ x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y });
    };
    const onMouseMove = (e) => {
        // preview circle position
        const rect = e.target.getBoundingClientRect();
        setPreviewPos({ x: e.clientX - rect.left - 25, y: e.clientY - rect.top - 25 });
        setShowPreview(true);
        if (!dragging)
            return;
        setPan({ x: e.clientX - rect.left - dragStart.x, y: e.clientY - rect.top - dragStart.y });
    };
    const onMouseUp = () => setDragging(false);
    const onWheel = (e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? -1 : 1;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((z + dir * ZOOM_STEP).toFixed(3)))));
    };
    const rgbToHex = (r, g, b) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    // Accurate pixel pick (map về toạ độ ảnh gốc)
    const pickColorAt = (clientX, clientY) => {
        if (!img || !canvasRef.current)
            return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left; // CSS px
        const y = clientY - rect.top; // CSS px
        const scale = baseScale * zoom;
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        const cx = (viewport.w - drawW) / 2 + pan.x;
        const cy = (viewport.h - drawH) / 2 + pan.y;
        // Toạ độ trong ảnh gốc
        const imgX = (x - cx) / scale;
        const imgY = (y - cy) / scale;
        // clamp
        const clampedX = Math.max(0, Math.min(img.naturalWidth - 1, Math.floor(imgX)));
        const clampedY = Math.max(0, Math.min(img.naturalHeight - 1, Math.floor(imgY)));
        // Lấy màu trực tiếp từ ảnh gốc ở 1:1 (chính xác tuyệt đối)
        const temp = document.createElement("canvas");
        temp.width = img.naturalWidth;
        temp.height = img.naturalHeight;
        const tctx = temp.getContext("2d");
        tctx.drawImage(img, 0, 0);
        const pix = tctx.getImageData(clampedX, clampedY, 1, 1).data;
        const hex = rgbToHex(pix[0], pix[1], pix[2]);
        setSelectedColor(hex);
        fetchPalette(hex);
    };
    const onClickCanvas = (e) => {
        pickColorAt(e.clientX, e.clientY);
    };
    // ---------- Palette fetch/export ----------
    const fetchPalette = async (hex, mode) => {
        setLoading(true);
        setPalette([]);
        const clean = hex.replace(/^#/, "");
        const usedMode = mode || scheme;
        try {
            const res = await fetch(`https://www.thecolorapi.com/scheme?hex=${clean}&mode=${usedMode}&count=6`);
            if (!res.ok)
                throw new Error("HTTP " + res.status);
            const data = await res.json();
            setPalette(data.colors || []);
        }
        catch (e) {
            console.error(e);
            setPalette([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSchemeChange = (e) => {
        const next = e.target.value;
        setScheme(next);
        if (selectedColor)
            fetchPalette(selectedColor, next);
    };
    const copyToClipboard = (text, el) => {
        navigator.clipboard.writeText(text).then(() => {
            const p = el.querySelector("p");
            const old = p?.innerText;
            if (p) {
                p.innerText = "Đã sao chép!";
                setTimeout(() => (p.innerText = old || text), 1200);
            }
        });
    };
    const exportPalette = () => {
        if (!palette.length)
            return;
        const c = exportCanvasRef.current;
        if (!c)
            return;
        const g = c.getContext("2d");
        if (!g)
            return;
        const sw = 120, sh = 100, th = 30, pad = 20;
        c.width = sw * palette.length + pad * 2;
        c.height = sh + th + pad * 2;
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
        g.textAlign = "center";
        g.font = "16px sans-serif";
        palette.forEach((col, i) => {
            const x = pad + i * sw;
            g.fillStyle = col.hex.value;
            g.fillRect(x, pad, sw, sh);
            g.fillStyle = "#000";
            g.fillText(col.hex.value, x + sw / 2, pad + sh + 20);
        });
        const a = document.createElement("a");
        a.download = `color-palette-${selectedColor.replace('#', '')}.png`;
        a.href = c.toDataURL("image/png");
        a.click();
    };
    const handleReset = () => {
        setImg(null);
        setSelectedColor("");
        setPalette([]);
        setScheme("monochrome");
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };
    return (_jsxs("div", { className: "w-full h-full overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-1.5rem)]", children: [_jsxs("div", { className: "min-w-0 overflow-auto lg:overflow-hidden", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2 ml-2 mr-2 mt-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("span", { className: "hidden sm:inline", children: "T\u1EA3i \u1EA3nh" }), _jsx("span", { className: "rounded-md bg-cyan-500 px-3 py-1.5 text-xs text-white hover:bg-cyan-600", children: "Ch\u1ECDn t\u1EC7p" }), _jsx("input", { ref: uploadInputRef, type: "file", accept: "image/*", onChange: handleFileChange, className: "hidden" })] }), _jsx("span", { className: "text-xs opacity-70 ml-2 mt-3", children: "ho\u1EB7c d\u00E1n \u1EA3nh t\u1EEB clipboard (Ctrl+V)" })] }), _jsxs("div", { ref: containerRef, className: "ml-2 mr-2 relative w-full h-[360px] border border-zinc-300 rounded-xl overflow-hidden bg-zinc-100", children: [_jsx("canvas", { ref: canvasRef, className: "absolute inset-0 w-full h-full cursor-crosshair", onMouseDown: onMouseDown, onMouseMove: onMouseMove, onMouseUp: onMouseUp, onMouseLeave: onMouseUp, onWheel: onWheel, onClick: onClickCanvas }), _jsx("div", { className: "absolute pointer-events-none rounded-full border-4 border-white shadow-lg z-10", style: {
                                            display: showPreview ? "block" : "none",
                                            left: `${previewPos.x}px`,
                                            top: `${previewPos.y}px`,
                                            width: "50px",
                                            height: "50px",
                                        } })] })] }), _jsx("div", { className: "min-w-0 overflow-hidden", children: _jsxs("div", { className: "flex h-full flex-col items-center justify-start p-0", children: [_jsxs("div", { className: "w-full items-start justify-center grid-rows-3", children: [_jsx("div", { className: "w-full", children: selectedColor && (_jsxs("div", { className: "flex flex-col gap-2 ml-2 mr-2 mt-2", children: [_jsx("label", { className: "text-sm font-medium", children: "M\u00E0u \u0111\u00E3 ch\u1ECDn" }), _jsxs("div", { className: `${fieldClass} flex items-center gap-4 p-3`, children: [_jsx("div", { className: "w-12 h-12 rounded-md border-2 border-white shadow-md", style: { backgroundColor: selectedColor } }), _jsx("p", { className: "font-mono text-slate-700 dark:text-slate-200", children: selectedColor.toUpperCase() })] })] })) }), _jsxs("div", { className: "mb-3 flex-wrap items-center gap-2 ml-2 mr-2 mt-2 w-full", children: [_jsx("label", { htmlFor: "scheme-select", className: "font-medium text-sm", children: "Lo\u1EA1i Palette:" }), _jsxs("select", { id: "scheme-select", className: `${fieldClass} w-[195px] ml-5`, value: scheme, onChange: handleSchemeChange, children: [_jsx("option", { value: "monochrome", children: "\u0110\u01A1n s\u1EAFc (Monochrome)" }), _jsx("option", { value: "monochrome-dark", children: "\u0110\u01A1n s\u1EAFc t\u1ED1i" }), _jsx("option", { value: "monochrome-light", children: "\u0110\u01A1n s\u1EAFc s\u00E1ng" }), _jsx("option", { value: "analogic", children: "T\u01B0\u01A1ng \u0111\u1ED3ng (Analogic)" }), _jsx("option", { value: "complement", children: "B\u1ED5 sung (Complement)" }), _jsx("option", { value: "analogic-complement", children: "T\u01B0\u01A1ng \u0111\u1ED3ng-B\u1ED5 sung" }), _jsx("option", { value: "triad", children: "B\u1ED9 ba (Triad)" }), _jsx("option", { value: "quad", children: "B\u1ED9 b\u1ED1n (Quad)" })] })] }), _jsxs("div", { className: "w-full px-2 space-y-4", children: [loading && (_jsx("div", { className: "flex justify-center py-12", children: _jsx("div", { className: "border-4 border-zinc-300 border-t-zinc-600 rounded-full w-12 h-12 animate-spin" }) })), !loading && palette.length === 0 && (_jsxs("div", { className: "text-center py-12 text-zinc-500", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "mx-auto h-12 w-12", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "1", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" }) }), _jsx("p", { className: "mt-2", children: "Palette s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y sau khi b\u1EA1n ch\u1ECDn m\u00E0u." })] })), !loading && palette.length > 0 && (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3", children: palette.map((color, index) => (_jsxs("div", { className: "text-center cursor-pointer transition-all duration-200 hover:scale-105", onClick: (e) => copyToClipboard(color.hex.value, e.currentTarget), children: [_jsx("div", { className: "h-24 rounded-lg shadow-md mx-auto", style: { backgroundColor: color.hex.value } }), _jsx("p", { className: "mt-2 font-mono text-sm font-medium", children: color.hex.value })] }, index))) }))] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-center gap-2", children: [_jsx("button", { onClick: handleReset, className: "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700", children: "\u0110\u1EB7t l\u1EA1i" }), palette.length > 0 && (_jsx("button", { onClick: exportPalette, className: "rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700", children: "T\u1EA3i PNG" }))] })] }) })] }), _jsx("canvas", { ref: exportCanvasRef, style: { display: "none" } })] }));
}
