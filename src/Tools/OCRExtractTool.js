"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
const OCR_API_KEY = (typeof import.meta !== "undefined" && import.meta.env &&
    (import.meta.env.VITE_OCRSPACE_KEY || import.meta.env.NEXT_PUBLIC_OCRSPACE_KEY)) ||
    "K84672286188957";
const fieldBox = "rounded-2xl border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-900/60 dark:border-zinc-700";
function dataURLFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(String(e.target?.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
async function compressDataUrl(dataUrl, maxKB = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            let { width, height } = img;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.9;
            let out = canvas.toDataURL("image/jpeg", quality);
            const sizeKB = (b64) => (b64.split(",")[1].length * 3) / 4 / 1024;
            while (sizeKB(out) > maxKB && quality > 0.15) {
                quality -= 0.1;
                out = canvas.toDataURL("image/jpeg", quality);
            }
            resolve(out);
        };
        img.src = dataUrl;
    });
}
export default function OCRExtractTool() {
    const [pages, setPages] = useState([]);
    const [active, setActive] = useState(-1);
    const [status, setStatus] = useState("");
    const [autoCompress, setAutoCompress] = useState(true);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState("");
    // Crop + Zoom + Pan state
    const [cropping, setCropping] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [initialZoom, setInitialZoom] = useState(1);
    const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const fileInputRef = useRef(null);
    const previewRef = useRef(null);
    const imgRef = useRef(null);
    const cropBoxRef = useRef(null);
    // for dragging/resizing crop
    const dragInfo = useRef(null);
    const hasActive = active >= 0 && active < pages.length;
    const activePage = hasActive ? pages[active] : null;
    // Load pdf.js via CDN
    useEffect(() => {
        if (!window.pdfjsLib) {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            };
            document.head.appendChild(s);
        }
    }, []);
    // Initial fit and center for preview image
    useEffect(() => {
        if (!activePage || !previewRef.current) {
            setInitialZoom(1);
            setInitialPan({ x: 0, y: 0 });
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setNaturalSize({ width: 0, height: 0 });
            return;
        }
        const calculateFit = () => {
            const container = previewRef.current;
            const contW = container.clientWidth;
            const contH = container.clientHeight;
            if (contW === 0 || contH === 0)
                return;
            const img = new Image();
            img.onload = () => {
                const natW = img.naturalWidth;
                const natH = img.naturalHeight;
                setNaturalSize({ width: natW, height: natH });
                const scaleX = contW / natW;
                const scaleY = contH / natH;
                const fitScale = Math.min(scaleX, scaleY, 1);
                const scaledW = natW * fitScale;
                const scaledH = natH * fitScale;
                const centerX = (contW - scaledW) / 2;
                const centerY = (contH - scaledH) / 2;
                setInitialZoom(fitScale);
                setInitialPan({ x: centerX, y: centerY });
                setZoom(fitScale);
                setPan({ x: centerX, y: centerY });
            };
            img.src = activePage.dataUrl;
        };
        calculateFit();
        if (previewRef.current && (previewRef.current.clientWidth === 0 || previewRef.current.clientHeight === 0)) {
            setTimeout(calculateFit, 0);
        }
    }, [activePage]);
    // --- Upload handler ---
    const handleFiles = useCallback(async (files) => {
        if (!files || !files.length)
            return;
        const list = [];
        for (const file of Array.from(files)) {
            if (file.type === "application/pdf") {
                const pdfjsLib = window.pdfjsLib;
                if (!pdfjsLib)
                    continue;
                const ab = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
                const take = Math.min(pdf.numPages, Math.max(0, 5 - (pages.length + list.length)));
                for (let i = 1; i <= take; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    list.push({ id: `${Date.now()}-${i}`, dataUrl: canvas.toDataURL("image/jpeg"), name: `${file.name}#${i}` });
                }
            }
            else if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                list.push({ id: `${Date.now()}-${Math.random()}`, dataUrl: await dataURLFromFile(file), name: file.name });
            }
        }
        if (pages.length + list.length > 5) {
            setStatus("❌ Tối đa 5 trang/ảnh.");
            return;
        }
        setStatus("");
        setPages((prev) => {
            const joined = [...prev, ...list];
            if (joined.length && active === -1)
                setActive(0);
            return joined;
        });
    }, [pages.length, active]);
    // Reset pages + crop + zoom
    const resetAll = () => {
        setPages([]);
        setActive(-1);
        setResult("");
        setStatus("");
        setCropping(false);
        setZoom(1);
        if (cropBoxRef.current) {
            cropBoxRef.current.style.left = "";
            cropBoxRef.current.style.top = "";
            cropBoxRef.current.style.width = "";
            cropBoxRef.current.style.height = "";
        }
    };
    // Init crop box centered inside preview
    const initCropBox = () => {
        if (!previewRef.current || !cropBoxRef.current)
            return;
        const wrap = previewRef.current.getBoundingClientRect();
        const w = Math.max(80, Math.floor(wrap.width * 0.6));
        const h = Math.max(60, Math.floor(wrap.height * 0.5));
        const l = Math.floor((wrap.width - w) / 2);
        const t = Math.floor((wrap.height - h) / 2);
        cropBoxRef.current.style.width = w + "px";
        cropBoxRef.current.style.height = h + "px";
        cropBoxRef.current.style.left = l + "px";
        cropBoxRef.current.style.top = t + "px";
    };
    // Enter crop mode => show box centered
    const enterCrop = () => {
        setCropping(true);
        setTimeout(() => initCropBox(), 0);
    };
    // Apply crop
    const applyCrop = () => {
        if (!activePage || !cropBoxRef.current || !previewRef.current || !imgRef.current)
            return;
        const imgEl = imgRef.current;
        const imageRect = imgEl.getBoundingClientRect();
        const wrapRect = previewRef.current.getBoundingClientRect();
        const cropRect = cropBoxRef.current.getBoundingClientRect();
        // position of crop relative to image
        const relX = Math.max(0, cropRect.left - imageRect.left);
        const relY = Math.max(0, cropRect.top - imageRect.top);
        const relW = Math.min(imageRect.width - relX, cropRect.width);
        const relH = Math.min(imageRect.height - relY, cropRect.height);
        const img = new Image();
        img.onload = () => {
            const scaleX = img.naturalWidth / imageRect.width;
            const scaleY = img.naturalHeight / imageRect.height;
            const c = document.createElement("canvas");
            const ctx = c.getContext("2d");
            c.width = Math.max(1, Math.floor(relW * scaleX));
            c.height = Math.max(1, Math.floor(relH * scaleY));
            ctx.drawImage(img, relX * scaleX, relY * scaleY, relW * scaleX, relH * scaleY, 0, 0, c.width, c.height);
            const next = c.toDataURL("image/jpeg");
            setPages((prev) => prev.map((p, i) => (i === active ? { ...p, dataUrl: next } : p)));
            setCropping(false);
        };
        img.src = activePage.dataUrl;
    };
    // Drag/resize crop box
    useEffect(() => {
        if (!cropping || !cropBoxRef.current || !previewRef.current)
            return;
        const crop = cropBoxRef.current;
        const wrap = previewRef.current;
        const onMouseDown = (e) => {
            const target = e.target;
            const role = target.dataset.role;
            const mode = role === "resize" ? "resize" : "move";
            const rect = crop.getBoundingClientRect();
            dragInfo.current = {
                mode,
                startX: e.clientX,
                startY: e.clientY,
                boxStart: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            };
            e.preventDefault();
            e.stopPropagation(); // Prevent bubbling to preview for pan
        };
        const onMouseMove = (e) => {
            if (!dragInfo.current)
                return;
            const info = dragInfo.current;
            const dx = e.clientX - info.startX;
            const dy = e.clientY - info.startY;
            const wrapRect = wrap.getBoundingClientRect();
            if (info.mode === "move") {
                let newLeft = info.boxStart.left + dx - wrapRect.left;
                let newTop = info.boxStart.top + dy - wrapRect.top;
                // keep inside wrapper
                newLeft = Math.max(0, Math.min(newLeft, wrapRect.width - info.boxStart.width));
                newTop = Math.max(0, Math.min(newTop, wrapRect.height - info.boxStart.height));
                crop.style.left = newLeft + "px";
                crop.style.top = newTop + "px";
            }
            else {
                let newW = Math.max(40, info.boxStart.width + dx);
                let newH = Math.max(40, info.boxStart.height + dy);
                const left = parseFloat(crop.style.left || "0");
                const top = parseFloat(crop.style.top || "0");
                newW = Math.min(newW, wrapRect.width - left);
                newH = Math.min(newH, wrapRect.height - top);
                crop.style.width = newW + "px";
                crop.style.height = newH + "px";
            }
        };
        const onMouseUp = () => (dragInfo.current = null);
        crop.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            crop.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [cropping]);
    // Prevent drag outside bounds
    useEffect(() => {
        if (!naturalSize.width || zoom <= initialZoom) {
            setPan(initialPan);
            return;
        }
        const contW = previewRef.current ? previewRef.current.clientWidth : 0;
        const contH = previewRef.current ? previewRef.current.clientHeight : 0;
        const scaledW = naturalSize.width * zoom;
        const scaledH = naturalSize.height * zoom;
        const maxX = 0;
        const minX = contW - scaledW;
        const maxY = 0;
        const minY = contH - scaledH;
        setPan(prev => ({
            x: Math.min(maxX, Math.max(minX, prev.x)),
            y: Math.min(maxY, Math.max(minY, prev.y))
        }));
    }, [zoom, naturalSize, initialPan]);
    // Reset to initial view
    const resetView = () => {
        setZoom(initialZoom);
        setPan(initialPan);
    };
    // Cancel crop
    const cancelCrop = () => {
        setCropping(false);
    };
    // Zoom with wheel in preview
    const onWheelPreview = (e) => {
        if (!hasActive)
            return;
        e.preventDefault();
        const delta = -e.deltaY; // wheel up => zoom in
        setZoom((z) => {
            const next = Math.max(initialZoom, Math.min(4, z + (delta > 0 ? 0.1 : -0.1)));
            return Number(next.toFixed(2));
        });
    };
    // --- OCR ---
    const performOCR = async (page) => {
        try {
            const useData = autoCompress ? await compressDataUrl(page.dataUrl, 1024) : page.dataUrl;
            const blob = await (await fetch(useData)).blob();
            const form = new FormData();
            form.append("language", "eng");
            form.append("isOverlayRequired", "false");
            form.append("apikey", OCR_API_KEY);
            form.append("OCREngine", "2");
            form.append("file", blob, page.name || "image.jpg");
            const res = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: form });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.IsErroredOnProcessing)
                throw new Error(json.ErrorMessage || "OCR error");
            const text = json?.ParsedResults?.[0]?.ParsedText || "";
            return text;
        }
        catch (e) {
            setStatus("❌ Lỗi OCR: " + (e?.message || "Không xác định"));
            return null;
        }
    };
    const ocrCurrent = async () => {
        if (!activePage)
            return;
        setBusy(true);
        setStatus("");
        const text = await performOCR(activePage);
        if (text !== null)
            setResult(text);
        setBusy(false);
    };
    const ocrAll = async () => {
        if (!pages.length)
            return;
        setBusy(true);
        setStatus("");
        const lines = [];
        for (let i = 0; i < pages.length; i++) {
            const t = await performOCR(pages[i]);
            lines.push(`=== Trang ${i + 1} ===\n${t ?? "[Lỗi OCR trang này]"}`);
        }
        const content = lines.join("\n\n" + "=".repeat(50) + "\n\n");
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ocr-extracted-text.txt";
        a.click();
        URL.revokeObjectURL(url);
        setBusy(false);
    };
    return (_jsxs("div", { className: "w-full h-full", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_2fr_1.5fr] gap-4", children: [_jsxs("div", { children: [_jsxs("div", { onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
                                    e.preventDefault();
                                    handleFiles(e.dataTransfer.files);
                                }, className: `mb-3 ${fieldBox} border-dashed p-6 text-center hover:border-cyan-500 min-h-[240px] flex flex-col items-center justify-center`, children: [_jsx("div", { className: "text-4xl", children: "\uD83D\uDCC4" }), _jsx("div", { className: "text-sm opacity-80 mt-1", children: "K\u00E9o th\u1EA3 file \u1EA2nh ho\u1EB7c PDF v\u00E0o \u0111\u00E2y" }), _jsx("button", { className: "mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700", onClick: () => fileInputRef.current?.click(), children: "Ch\u1ECDn file" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf,.jpg,.jpeg,.png,.webp", multiple: true, className: "hidden", onChange: (e) => handleFiles(e.target.files) })] }), _jsx("div", { className: "text-xs opacity-70", children: pages.length ? `${pages.length} trang/ảnh đã tải lên` : "Chưa có ảnh/trang nào" }), _jsx("button", { onClick: resetAll, className: "mt-2 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700", children: "Reset" })] }), _jsx("div", { children: _jsxs("div", { className: `${fieldBox} p-3`, children: [_jsxs("div", { ref: previewRef, onWheel: onWheelPreview, onDoubleClick: resetView, onMouseDown: (e) => {
                                        if (!hasActive || e.button !== 0)
                                            return;
                                        // Skip if clicking on crop box or handle during cropping
                                        if (cropping && (e.target === cropBoxRef.current || e.target.closest('.border-2')))
                                            return;
                                        setIsDragging(true);
                                        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                                        e.preventDefault();
                                    }, onMouseMove: (e) => {
                                        if (!isDragging || !hasActive)
                                            return;
                                        setPan({
                                            x: e.clientX - dragStartRef.current.x,
                                            y: e.clientY - dragStartRef.current.y
                                        });
                                    }, onMouseUp: () => setIsDragging(false), onMouseLeave: () => setIsDragging(false), className: "relative flex items-center justify-center h-[330px] overflow-hidden rounded-xl bg-zinc-50 cursor-grab active:cursor-grabbing", children: [activePage ? (_jsx("img", { ref: imgRef, src: activePage.dataUrl, className: "absolute top-0 left-0 max-w-none max-h-none select-none", style: { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }, alt: "preview", draggable: false })) : (_jsx("div", { className: "flex items-center justify-center text-sm text-zinc-500", children: "Ch\u01B0a c\u00F3 \u1EA3nh/trang n\u00E0o" })), activePage && (_jsxs("div", { className: "absolute right-2 top-2 flex gap-1", children: [_jsx("button", { onClick: cropping ? cancelCrop : enterCrop, className: `rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow ${cropping
                                                        ? "bg-rose-600 hover:bg-rose-700"
                                                        : "bg-zinc-600 hover:bg-zinc-700"}`, children: cropping ? "Hủy" : "Crop" }), cropping && (_jsx("button", { onClick: applyCrop, className: "rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700", children: "X\u00E1c nh\u1EADn" }))] })), cropping && (_jsx("div", { ref: cropBoxRef, className: "absolute border-2 border-dashed border-emerald-500 bg-emerald-300/10", style: { left: 40, top: 40, width: 260, height: 180 }, children: _jsx("div", { "data-role": "resize", className: "absolute -right-2 -bottom-2 h-4 w-4 cursor-se-resize rounded-full bg-emerald-500" }) }))] }), _jsx("div", { className: "mt-3 flex gap-3 overflow-x-auto pb-2", children: pages.map((p, idx) => (_jsxs("div", { className: `relative w-[110px] flex-shrink-0 rounded-lg border p-1 ${idx === active ? "border-cyan-500 ring-2 ring-cyan-200" : "border-transparent"}`, children: [_jsx("img", { src: p.dataUrl, className: "h-[86px] w-full cursor-pointer rounded object-cover", onClick: () => setActive(idx) }), _jsx("button", { onClick: () => {
                                                    setPages((prev) => {
                                                        const arr = [...prev];
                                                        arr.splice(idx, 1);
                                                        if (active === idx)
                                                            setActive(arr.length ? Math.min(idx, arr.length - 1) : -1);
                                                        else if (active > idx)
                                                            setActive((a) => a - 1);
                                                        return arr;
                                                    });
                                                }, className: "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-white shadow", title: "X\u00F3a trang", children: "\u00D7" }), _jsxs("div", { className: "mt-1 text-center text-[11px] opacity-70", children: ["Trang ", idx + 1] })] }, p.id))) })] }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("div", { className: `${fieldBox} flex-1 p-3`, children: _jsx("textarea", { className: "h-[220px] w-full h-full rounded-xl border border-zinc-300 p-2 font-mono text-sm !text-black", value: result, onChange: (e) => setResult(e.target.value) }) }), _jsxs("div", { className: `${fieldBox} mt-4 p-3`, children: [_jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [_jsx("button", { disabled: !hasActive || busy, onClick: ocrCurrent, className: "rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60", children: busy ? "Đang xử lý…" : "Đọc trang hiện tại" }), _jsx("button", { disabled: !pages.length || busy, onClick: ocrAll, className: "rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60", children: "\u0110\u1ECDc to\u00E0n b\u1ED9 trang & xu\u1EA5t file" })] }), _jsxs("label", { className: "mt-3 flex items-center gap-2 text-xs opacity-80", children: [_jsx("input", { type: "checkbox", className: "size-4 accent-cyan-500", checked: autoCompress, onChange: (e) => setAutoCompress(e.target.checked) }), "T\u1EF1 \u0111\u1ED9ng n\u00E9n \u1EA3nh tr\u01B0\u1EDBc khi OCR (\u2264 1MB)"] })] })] })] }), status && (_jsx("div", { className: `${fieldBox} mt-4 border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700`, children: status }))] }));
}
