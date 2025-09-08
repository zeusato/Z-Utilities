"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";
import { jsPDF } from "jspdf";
// ---------------- Component ----------------
export default function ImageToPDFTool() {
    // Refs
    const fileInputRef = useRef(null);
    const uploadRef = useRef(null);
    const previewWrapRef = useRef(null);
    const previewImgRef = useRef(null);
    const sortableInstRef = useRef(null);
    const cropFrameRef = useRef(null);
    // Crop helpers
    const cropStart = useRef({ x: 0, y: 0 });
    const dragOffset = useRef({ dx: 0, dy: 0 });
    const resizeHandle = useRef(null);
    const draggingCrop = useRef(false);
    const resizingCrop = useRef(false);
    // State
    const [images, setImages] = useState([]);
    const [current, setCurrent] = useState(0);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [cropping, setCropping] = useState(false);
    // Preview interactions (fit / pan / zoom)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [initialZoom, setInitialZoom] = useState(1);
    const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    // ---------------- Utils ----------------
    const toast = useCallback((msg, type = "info") => {
        const box = document.getElementById("status-container");
        if (!box)
            return;
        box.innerHTML = "";
        const div = document.createElement("div");
        div.className =
            "p-3 rounded-lg mb-2 font-medium fixed top-4 right-4 z-50 max-w-sm " +
                (type === "success"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : type === "error"
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : type === "warning"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300");
        div.textContent = msg;
        box.appendChild(div);
        if (type === "success")
            setTimeout(() => box.contains(div) && box.removeChild(div), 4000);
    }, []);
    // ---------------- Upload/Drop ----------------
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        uploadRef.current?.classList.add("ring", "ring-cyan-400");
    }, []);
    const handleDragLeave = useCallback(() => {
        uploadRef.current?.classList.remove("ring", "ring-cyan-400");
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        uploadRef.current?.classList.remove("ring", "ring-cyan-400");
        const files = Array.from(e.dataTransfer.files);
        onFiles(files);
    }, []);
    const handleChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        onFiles(files);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    }, []);
    const onFiles = useCallback(async (files) => {
        const list = files.filter((f) => ["image/jpeg", "image/jpg", "image/png"].includes(f.type));
        if (!list.length) {
            toast("Vui lòng chọn file JPG/PNG hợp lệ", "error");
            return;
        }
        if (list.length > 50)
            list.splice(50);
        setBusy(true);
        setProgress(0);
        setProgressText("Đang tải file…");
        const promises = list.map((f, i) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setProgress(((i + 1) / list.length) * 100);
                setProgressText(`Đang xử lý: ${f.name} (${i + 1}/${list.length})`);
                const url = String(ev.target?.result || "");
                resolve({
                    id: `img_${images.length + i}_${Date.now()}`,
                    url,
                    originalImage: url,
                });
            };
            reader.onerror = () => reject(new Error(`Failed to read ${f.name}`));
            reader.readAsDataURL(f);
        }));
        try {
            const newImages = await Promise.all(promises);
            setImages((prev) => {
                const merged = [...prev, ...newImages];
                if (!prev.length && merged.length)
                    setCurrent(0);
                return merged;
            });
            setBusy(false);
            toast(`Đã thêm ${newImages.length} ảnh. Tổng ${images.length + newImages.length} ảnh.`, "success");
        }
        catch (err) {
            console.error(err);
            toast(`Lỗi xử lý file: ${err?.message || "Không xác định"}`, "error");
            setBusy(false);
        }
    }, [images.length, toast]);
    // ---------------- Sortable (danh sách ảnh) ----------------
    // ---------------- Move & Rotate (thumbnail controls) ----------------
    const moveImage = useCallback((i, dir) => {
        setImages((prev) => {
            const j = i + dir;
            if (j < 0 || j >= prev.length)
                return prev;
            const next = [...prev];
            const tmp = next[i];
            next[i] = next[j];
            next[j] = tmp;
            setCurrent((c) => (c === i ? j : c === j ? i : c));
            return next;
        });
    }, []);
    const rotateImage = useCallback((i) => {
        setImages((prev) => {
            const next = [...prev];
            const it = { ...next[i] };
            const img = new Image();
            img.onload = () => {
                // xoay 90°
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = img.height;
                canvas.height = img.width;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                it.url = canvas.toDataURL("image/jpeg", 0.92);
                next[i] = it;
                setImages(next);
            };
            img.src = it.url;
            return prev; // sẽ set lại trong onload
        });
    }, []);
    const setImagesEl = useCallback((node) => {
        // Destroy old instance if exists
        if (sortableInstRef.current) {
            try {
                sortableInstRef.current.destroy();
            }
            catch { }
            sortableInstRef.current = null;
        }
        if (!node)
            return; // unmount
        // Create new instance on current node
        sortableInstRef.current = new Sortable(node, {
            animation: 150,
            ghostClass: "opacity-40 bg-gray-200",
            onEnd: (evt) => {
                const oldIndex = evt.oldIndex ?? -1;
                const newIndex = evt.newIndex ?? -1;
                if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex)
                    return;
                setImages((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(oldIndex, 1);
                    next.splice(newIndex, 0, moved);
                    setCurrent((c) => {
                        if (c === oldIndex)
                            return newIndex;
                        if (c > oldIndex && c <= newIndex)
                            return c - 1;
                        if (c < oldIndex && c >= newIndex)
                            return c + 1;
                        return c;
                    });
                    return next;
                });
            },
        });
    }, []);
    const removeImage = useCallback((id) => {
        if (!confirm("Xóa ảnh này?"))
            return;
        setImages((prev) => {
            const next = prev.filter((img) => img.id !== id);
            setCurrent((c) => Math.min(c, Math.max(0, next.length - 1)));
            return next;
        });
    }, []);
    // ---------------- Crop (overlay + kéo/resize) ----------------
    const placeHandles = (frame) => {
        const make = (h, style, cursor) => {
            const el = document.createElement("div");
            el.dataset.handle = h;
            el.className = "absolute w-3 h-3 bg-cyan-500 border-2 border-white rounded-full z-30";
            Object.assign(el.style, style, { cursor });
            frame.appendChild(el);
        };
        // corners
        make("nw", { left: "0%", top: "0%", transform: "translate(-50%, -50%)" }, "nwse-resize");
        make("ne", { left: "100%", top: "0%", transform: "translate(-50%, -50%)" }, "nesw-resize");
        make("sw", { left: "0%", top: "100%", transform: "translate(-50%, -50%)" }, "nesw-resize");
        make("se", { left: "100%", top: "100%", transform: "translate(-50%, -50%)" }, "nwse-resize");
        // edges
        make("n", { left: "50%", top: "0%", transform: "translate(-50%, -50%)" }, "ns-resize");
        make("s", { left: "50%", top: "100%", transform: "translate(-50%, -50%)" }, "ns-resize");
        make("w", { left: "0%", top: "50%", transform: "translate(-50%, -50%)" }, "ew-resize");
        make("e", { left: "100%", top: "50%", transform: "translate(-50%, -50%)" }, "ew-resize");
    };
    const startCrop = useCallback(() => {
        const container = previewWrapRef.current;
        const img = previewImgRef.current;
        if (!container || !img || current < 0)
            return;
        setCropping(true);
        document.body.style.userSelect = "none";
        const overlay = document.createElement("div");
        overlay.id = "crop-overlay";
        overlay.className = "absolute inset-0 z-10";
        overlay.style.pointerEvents = "none";
        const frame = document.createElement("div");
        frame.id = "crop-frame";
        frame.className = "absolute border-2 border-cyan-500 bg-cyan-500/10 cursor-move z-20 rounded";
        frame.style.pointerEvents = "auto";
        container.appendChild(overlay);
        overlay.appendChild(frame);
        cropFrameRef.current = frame;
        placeHandles(frame);
        // đặt giữa khung theo 50% ảnh đang hiển thị
        const rI = img.getBoundingClientRect();
        const rC = container.getBoundingClientRect();
        const fw = Math.max(50, rI.width * 0.5);
        const fh = Math.max(50, rI.height * 0.5);
        const left = rI.left - rC.left + (rI.width - fw) / 2;
        const top = rI.top - rC.top + (rI.height - fh) / 2;
        frame.style.left = `${left}px`;
        frame.style.top = `${top}px`;
        frame.style.width = `${fw}px`;
        frame.style.height = `${fh}px`;
        // Drag move – dùng offset CHUẨN để không nhảy
        frame.addEventListener("mousedown", (e) => {
            const t = e.target;
            if (t.closest("[data-handle]"))
                return; // nếu bấm vào handle, không drag move
            const rect = frame.getBoundingClientRect();
            draggingCrop.current = true;
            resizeHandle.current = null;
            // Offset tính theo mép frame
            dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
            e.preventDefault();
        });
        // Resize from handles
        frame.querySelectorAll("[data-handle]").forEach((h) => h.addEventListener("mousedown", (e) => {
            draggingCrop.current = false;
            resizingCrop.current = true;
            resizeHandle.current = e.target.dataset.handle;
            cropStart.current.x = e.clientX;
            cropStart.current.y = e.clientY;
            e.preventDefault();
            e.stopPropagation();
        }));
    }, [current]);
    const onDocMove = useCallback((e) => {
        if (!cropping)
            return;
        const frame = cropFrameRef.current;
        const img = previewImgRef.current;
        const container = previewWrapRef.current;
        if (!frame || !img || !container)
            return;
        const rI = img.getBoundingClientRect();
        const rC = container.getBoundingClientRect();
        const imgL = rI.left - rC.left;
        const imgT = rI.top - rC.top;
        const imgR = imgL + rI.width;
        const imgB = imgT + rI.height;
        const rect = frame.getBoundingClientRect();
        if (draggingCrop.current) {
            let nx = e.clientX - rC.left - dragOffset.current.dx;
            let ny = e.clientY - rC.top - dragOffset.current.dy;
            const fw = rect.width;
            const fh = rect.height;
            nx = Math.max(imgL, Math.min(nx, imgR - fw));
            ny = Math.max(imgT, Math.min(ny, imgB - fh));
            frame.style.left = `${nx}px`;
            frame.style.top = `${ny}px`;
        }
        if (resizingCrop.current && resizeHandle.current) {
            const dx = e.clientX - cropStart.current.x;
            const dy = e.clientY - cropStart.current.y;
            let nx = rect.left - rC.left;
            let ny = rect.top - rC.top;
            let w = rect.width;
            let h = rect.height;
            switch (resizeHandle.current) {
                case "nw":
                    nx += dx;
                    ny += dy;
                    w -= dx;
                    h -= dy;
                    break;
                case "ne":
                    ny += dy;
                    w += dx;
                    h -= dy;
                    break;
                case "sw":
                    nx += dx;
                    w -= dx;
                    h += dy;
                    break;
                case "se":
                    w += dx;
                    h += dy;
                    break;
                case "n":
                    ny += dy;
                    h -= dy;
                    break;
                case "s":
                    h += dy;
                    break;
                case "w":
                    nx += dx;
                    w -= dx;
                    break;
                case "e":
                    w += dx;
                    break;
            }
            w = Math.max(50, w);
            h = Math.max(50, h);
            nx = Math.max(imgL, Math.min(nx, imgR - w));
            ny = Math.max(imgT, Math.min(ny, imgB - h));
            if (nx + w > imgR)
                w = imgR - nx;
            if (ny + h > imgB)
                h = imgB - ny;
            frame.style.left = `${nx}px`;
            frame.style.top = `${ny}px`;
            frame.style.width = `${w}px`;
            frame.style.height = `${h}px`;
            cropStart.current.x = e.clientX;
            cropStart.current.y = e.clientY;
        }
    }, [cropping]);
    const onDocUp = useCallback(() => {
        draggingCrop.current = false;
        resizingCrop.current = false;
        resizeHandle.current = null;
        document.body.style.userSelect = "";
    }, []);
    useEffect(() => {
        if (!cropping)
            return;
        document.addEventListener("mousemove", onDocMove);
        document.addEventListener("mouseup", onDocUp);
        return () => {
            document.removeEventListener("mousemove", onDocMove);
            document.removeEventListener("mouseup", onDocUp);
        };
    }, [cropping, onDocMove, onDocUp]);
    const cancelCrop = useCallback(() => {
        setCropping(false);
        const overlay = document.getElementById("crop-overlay");
        overlay?.parentElement?.removeChild(overlay);
        cropFrameRef.current = null;
        draggingCrop.current = false;
        resizingCrop.current = false;
        resizeHandle.current = null;
        document.body.style.userSelect = "";
    }, []);
    const applyCrop = useCallback(() => {
        const frame = cropFrameRef.current;
        const img = previewImgRef.current;
        if (!frame || !img)
            return;
        const rF = frame.getBoundingClientRect();
        const rI = img.getBoundingClientRect();
        const scaleX = img.naturalWidth / rI.width;
        const scaleY = img.naturalHeight / rI.height;
        const cropX = (rF.left - rI.left) * scaleX;
        const cropY = (rF.top - rI.top) * scaleY;
        const cropW = rF.width * scaleX;
        const cropH = rF.height * scaleY;
        setImages((prev) => {
            const next = [...prev];
            const it = { ...next[current] };
            const out = document.createElement("canvas");
            const ctx = out.getContext("2d");
            out.width = Math.max(1, Math.round(cropW));
            out.height = Math.max(1, Math.round(cropH));
            // Vẽ từ CURRENT url (đảm bảo đúng trạng thái sau xử lý)
            const s = new Image();
            s.onload = () => {
                ctx.drawImage(s, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
                it.url = out.toDataURL("image/jpeg", 0.9);
                next[current] = it;
                setImages(next);
                toast("Đã cắt ảnh", "success");
            };
            s.src = it.url;
            return prev; // tạm thời, we setImages(next) khi onload
        });
        cancelCrop();
    }, [current, cancelCrop, toast]);
    // ---------------- Xử lý ảnh: Grayscale & Binarize (Otsu) ----------------
    const toGrayscale = useCallback(() => {
        const item = images[current];
        if (!item)
            return;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            ctx.drawImage(img, 0, 0);
            const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = im.data;
            for (let i = 0; i < data.length; i += 4) {
                // luminance tốt hơn avg
                const g = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = g;
            }
            ctx.putImageData(im, 0, 0);
            const url = canvas.toDataURL("image/jpeg", 0.92);
            setImages((prev) => {
                const next = [...prev];
                next[current] = { ...next[current], url };
                return next;
            });
            toast("Đã chuyển ảnh sang Grayscale", "success");
        };
        img.src = item.url;
    }, [images, current, toast]);
    const otsuThreshold = (gray) => {
        const hist = new Array(256).fill(0);
        for (let i = 0; i < gray.length; i += 4)
            hist[gray[i]]++;
        const total = gray.length / 4;
        let sum = 0;
        for (let t = 0; t < 256; t++)
            sum += t * hist[t];
        let sumB = 0, wB = 0, wF = 0, mB = 0, mF = 0, max = 0, threshold = 0;
        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0)
                continue;
            wF = total - wB;
            if (wF === 0)
                break;
            sumB += t * hist[t];
            mB = sumB / wB;
            mF = (sum - sumB) / wF;
            const between = wB * wF * (mB - mF) * (mB - mF);
            if (between > max) {
                max = between;
                threshold = t;
            }
        }
        return threshold;
    };
    const toBinarize = useCallback(() => {
        const item = images[current];
        if (!item)
            return;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            ctx.drawImage(img, 0, 0);
            const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = im.data;
            // chuyển gray trước
            for (let i = 0; i < data.length; i += 4) {
                const g = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = g;
            }
            // tìm threshold Otsu
            const t = otsuThreshold(data);
            for (let i = 0; i < data.length; i += 4) {
                const v = data[i] > t ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = v;
            }
            ctx.putImageData(im, 0, 0);
            const url = canvas.toDataURL("image/jpeg", 0.92);
            setImages((prev) => {
                const next = [...prev];
                next[current] = { ...next[current], url };
                return next;
            });
            toast(`Đã chuyển ảnh sang Đen trắng (ngưỡng ${t})`, "success");
        };
        img.src = item.url;
    }, [images, current, toast]);
    const restoreOriginal = useCallback(() => {
        const item = images[current];
        if (!item)
            return;
        setImages((prev) => {
            const next = [...prev];
            next[current] = { ...next[current], url: next[current].originalImage };
            return next;
        });
        toast("Đã khôi phục ảnh gốc", "success");
    }, [images, current, toast]);
    // ---------------- Preview fit / pan / zoom ----------------
    // Fit ảnh vào khung mỗi khi đổi trang hoặc set ảnh
    useEffect(() => {
        const item = images[current];
        if (!item || !previewWrapRef.current) {
            setInitialZoom(1);
            setZoom(1);
            setInitialPan({ x: 0, y: 0 });
            setPan({ x: 0, y: 0 });
            setNaturalSize({ width: 0, height: 0 });
            return;
        }
        const container = previewWrapRef.current;
        const contW = container.clientWidth;
        const contH = container.clientHeight;
        const tmp = new Image();
        tmp.onload = () => {
            const natW = tmp.naturalWidth;
            const natH = tmp.naturalHeight;
            setNaturalSize({ width: natW, height: natH });
            const scaleX = contW / natW;
            const scaleY = contH / natH;
            const fitScale = Math.min(scaleX, scaleY, 1);
            const scaledW = natW * fitScale;
            const scaledH = natH * fitScale;
            const centerX = (contW - scaledW) / 2;
            const centerY = (contH - scaledH) / 2;
            setInitialZoom(fitScale);
            setZoom(fitScale);
            setInitialPan({ x: centerX, y: centerY });
            setPan({ x: centerX, y: centerY });
        };
        tmp.src = item.url;
    }, [images, current]);
    // Clamp pan khi zoom > fit
    useEffect(() => {
        if (!naturalSize.width || zoom <= initialZoom) {
            setPan(initialPan);
            return;
        }
        const contW = previewWrapRef.current?.clientWidth || 0;
        const contH = previewWrapRef.current?.clientHeight || 0;
        const scaledW = naturalSize.width * zoom;
        const scaledH = naturalSize.height * zoom;
        const maxX = 0;
        const minX = contW - scaledW;
        const maxY = 0;
        const minY = contH - scaledH;
        setPan((prev) => ({
            x: Math.min(maxX, Math.max(minX, prev.x)),
            y: Math.min(maxY, Math.max(minY, prev.y)),
        }));
    }, [zoom, naturalSize, initialPan, initialZoom]);
    const resetView = () => {
        setZoom(initialZoom);
        setPan(initialPan);
    };
    // Wheel zoom – listener non-passive để preventDefault
    useEffect(() => {
        const el = previewWrapRef.current;
        if (!el)
            return;
        const onWheel = (e) => {
            e.preventDefault();
            if (!images[current])
                return;
            const delta = -e.deltaY;
            setZoom((z) => {
                const next = Math.max(initialZoom, Math.min(4, z + (delta > 0 ? 0.1 : -0.1)));
                return Number(next.toFixed(2));
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [images, current, initialZoom]);
    // ---------------- Export PDF ----------------
    const doExport = useCallback(async () => {
        if (!images.length) {
            toast("Không có ảnh để tạo PDF", "error");
            return;
        }
        try {
            const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
            images.forEach((it, i) => {
                if (i > 0)
                    doc.addPage("a4", "portrait");
                const img = new Image();
                img.src = it.url;
                // NOTE: vì addImage dùng dataURL, không cần chờ onload chính xác, nhưng ta vẫn tính theo kích thước canvas logic an toàn:
                // hard-fit theo tỉ lệ trang A4, margin 10mm
                const pw = 210, ph = 297;
                // Mẹo: nếu không có natural size, cứ fit vào vùng nội dung
                // (độ chính xác đủ tốt vì addImage sẽ scale theo thông số iw/ih)
                // Ta tạm giả định r ~ 1.33 cho đến khi ảnh onload -> nhưng ở đây không cần vì iw/ih là tham số đích.
                // Để ổn định: dùng  r = 1.33 mặc định nếu không đo được. Nhưng ta sẽ tạo ảnh ảo để lấy size synchronously không được,
                // vậy chọn fit theo chiều dài trang và giữ margin.
                // => ta fit theo bounding box (pw-20 x ph-20)
                const boxW = pw - 20, boxH = ph - 20;
                // Thử đọc kích thước bằng decode synchronous? Không.
                // Chọn giải pháp trung dung: vẽ tạm lên canvas để lấy size.
                // (an toàn: nhỏ ảnh lớn -> memory cẩn thận)
                // Đơn giản hơn: dùng <img> mà chưa onload thì width/height=0; ta fallback r=1 (vuông).
                const r = (img.width && img.height) ? img.width / img.height : 1;
                let iw, ih;
                if (r > boxW / boxH) {
                    iw = boxW;
                    ih = iw / r;
                }
                else {
                    ih = boxH;
                    iw = ih * r;
                }
                const x = (pw - iw) / 2;
                const y = (ph - ih) / 2;
                doc.addImage(it.url, "JPEG", x, y, iw, ih);
            });
            const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            doc.save(`images_to_pdf_${ts}.pdf`);
            toast("Đã xuất PDF", "success");
        }
        catch (e) {
            console.error(e);
            toast(`Lỗi tạo PDF: ${e?.message || "Không xác định"}`, "error");
        }
    }, [images, toast]);
    // ---------------- UI ----------------
    return (_jsxs("div", { className: "w-full h-full overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_0.5fr_2fr] gap-4 h-[calc(100%-1.5rem)]", children: [_jsxs("div", { className: "min-w-0 overflow-auto lg:overflow-hidden", children: [_jsxs("div", { ref: uploadRef, className: "mb-3 mt-1 border-2 border-dashed border-cyan-500 rounded-xl p-8 text-center bg-slate-400/30- backdrop-blur-sm transition-all duration-300 hover:border-cyan-600 hover:bg-green-50/50", onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => fileInputRef.current?.click(), children: [_jsx("div", { className: "text-4xl mb-4 text-cyan-500", children: "\uD83D\uDDBC\uFE0F" }), _jsx("div", { className: "text-lg text-white mb-2", children: "K\u00E9o th\u1EA3 \u1EA3nh v\u00E0o \u0111\u00E2y ho\u1EB7c b\u1EA5m \u0111\u1EC3 ch\u1ECDn" }), _jsx("div", { className: "text-sm text-white mb-4", children: "H\u1ED7 tr\u1EE3: JPG, PNG (t\u1ED1i \u0111a 50 file)" }), _jsx("button", { className: "bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-600 transition-colors", children: "Ch\u1ECDn \u1EA3nh \u0111\u1EC3 chuy\u1EC3n \u0111\u1ED5i" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".jpg,.jpeg,.png", multiple: true, className: "hidden", onChange: handleChange })] }), busy && (_jsxs("div", { className: "ml-2 mr-2 p-4 border border-zinc-300 rounded-xl bg-zinc-50", children: [_jsx("h3", { className: "text-lg font-medium mb-2", children: "\u0110ang x\u1EED l\u00FD file..." }), _jsx("div", { className: "bg-zinc-200 rounded-full h-2 mb-2", children: _jsx("div", { className: "bg-gradient-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) }), _jsx("p", { className: "text-sm text-zinc-600", children: progressText })] })), _jsxs("div", { className: "ml-0 mr-2 flex flex-wrap items-center justify-center gap-2 mt-4 grid-rows-2", children: [_jsxs("div", { className: "flex item-center justify-begin gap-5 w-full", children: [_jsxs("button", { onClick: toGrayscale, className: "rounded-xl w-[100px] h-[50px]  bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50", disabled: !images.length, children: ["\uD83C\uDF9B\uFE0F ", _jsx("br", {}), "Grayscale"] }), _jsxs("button", { onClick: toBinarize, className: "rounded-xl w-[100px] h-[50px] bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-50", disabled: !images.length, children: ["\uD83D\uDDA8\uFE0F ", _jsx("br", {}), "B/W"] }), _jsx("button", { onClick: restoreOriginal, className: "rounded-xl w-[100px]  h-[50px] bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50", disabled: !images.length, children: "\u21A9\uFE0F Original" })] }), _jsx("div", { className: "flex item-center justify-begin gap-5 w-full" }), _jsxs("div", { className: "flex item-center justify-begin gap-5 w-full", children: [_jsx("button", { onClick: () => {
                                                    setImages([]);
                                                    setCurrent(0);
                                                    setCropping(false);
                                                    const ov = document.getElementById("crop-overlay");
                                                    ov?.parentElement?.removeChild(ov);
                                                    setZoom(1);
                                                    setPan({ x: 0, y: 0 });
                                                    setInitialZoom(1);
                                                    setInitialPan({ x: 0, y: 0 });
                                                }, className: "rounded-xl w-[200px] bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50", disabled: !images.length, children: "\uD83D\uDD04 Reset" }), _jsx("button", { onClick: doExport, className: "rounded-xl w-[200px] bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50", disabled: !images.length, children: "\uD83D\uDCE5 T\u1EA1o PDF" })] })] })] }), _jsx("div", { className: "min-w-0 mt-1 overflow-hidden border border-zinc-300 backdrop-blur-sm flex flex-col rounded-xl", children: _jsxs("div", { className: "ml-2 mr-2 rounded-xl overflow-auto scrollbar-none", children: [_jsxs("div", { className: "px-4 py-2 text-sm font-medium text-center", children: ["Danh s\u00E1ch (", images.length, ")"] }), _jsx("div", { ref: setImagesEl, className: "flex flex-col gap-2 p-2 min-h-[120px]", children: images.length === 0 ? (_jsx("div", { className: "flex-1 flex items-center justify-center text-center text-xs text-white py-4", children: "Kh\u00F4ng c\u00F3 \u1EA3nh n\u00E0o. Upload \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u." })) : (images.map((img, i) => (_jsxs("div", { className: `relative bg-white rounded-lg p-2 cursor-pointer transition-all duration-300 border-2 border-transparent flex-shrink-0 w-full hover:shadow-md ${i === current ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow-md" : ""}`, onClick: () => setCurrent(i), children: [_jsxs("div", { className: "absolute top-1 right-1 flex gap-1", children: [_jsx("button", { className: "w-5 h-5 bg-zinc-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-zinc-600 disabled:opacity-40", title: "L\u00EAn", disabled: i === 0, onClick: (e) => { e.stopPropagation(); moveImage(i, -1); }, children: "\u2191" }), _jsx("button", { className: "w-5 h-5 bg-zinc-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-zinc-600 disabled:opacity-40", title: "Xu\u1ED1ng", disabled: i === images.length - 1, onClick: (e) => { e.stopPropagation(); moveImage(i, 1); }, children: "\u2193" }), _jsx("button", { className: "w-5 h-5 bg-gray-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-gray-600", title: "Xoay 90\u00B0", onClick: (e) => { e.stopPropagation(); rotateImage(i); }, children: "\u21BB" }), _jsx("button", { className: "w-5 h-5 bg-red-500 text-white rounded-full text-[12px] leading-[18px] hover:bg-red-600", title: "X\u00F3a", onClick: (e) => { e.stopPropagation(); removeImage(img.id); }, children: "\u00D7" })] }), _jsx("img", { src: img.url, alt: `Ảnh ${i + 1}`, className: "w-full h-[120px] object-cover rounded mb-1" }), _jsxs("div", { className: "text-center text-xs text-zinc-600", children: ["\u1EA2nh ", i + 1] })] }, img.id)))) })] }) }), _jsx("div", { className: "min-w-0 overflow-hidden", children: _jsx("div", { className: "flex h-full flex-col", children: _jsx("div", { ref: previewWrapRef, onDoubleClick: resetView, onMouseDown: (e) => {
                                    if (!images[current] || e.button !== 0)
                                        return;
                                    // nếu bấm vào khung crop thì không pan
                                    const target = e.target;
                                    if (target.closest("#crop-frame"))
                                        return;
                                    setIsPanning(true);
                                    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                                    e.preventDefault();
                                }, onMouseMove: (e) => {
                                    if (!isPanning || !images[current])
                                        return;
                                    setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
                                }, onMouseUp: () => setIsPanning(false), onMouseLeave: () => setIsPanning(false), className: "relative mr-1 mt-1 w-full h-full border border-zinc-300 rounded-xl backdrop-blur-sm overflow-hidden cursor-grab active:cursor-grabbing", children: images.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute top-2 right-2 z-30 flex gap-2", children: !cropping ? (_jsx("button", { onClick: startCrop, className: "rounded bg-cyan-600 text-white text-xs px-3 py-1 hover:bg-cyan-700", children: "C\u1EAFt" })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: applyCrop, className: "rounded bg-emerald-600 text-white text-xs px-3 py-1 hover:bg-emerald-700", children: "\u00C1p d\u1EE5ng" }), _jsx("button", { onClick: cancelCrop, className: "rounded bg-rose-600 text-white text-xs px-3 py-1 hover:bg-rose-700", children: "H\u1EE7y" })] })) }), _jsx("img", { ref: previewImgRef, src: images[current].url, alt: `Xem trước ảnh ${current + 1}`, className: "absolute top-0 left-0 max-w-none max-h-none select-none", style: { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }, draggable: false }, images[current].id)] })) : (_jsx("div", { className: "flex items-center justify-center h-full text-center text-white", children: _jsxs("div", { children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83D\uDDBC\uFE0F" }), _jsx("p", { children: "Ch\u1ECDn \u1EA3nh \u0111\u1EC3 xem tr\u01B0\u1EDBc" })] }) })) }) }) })] }), _jsx("div", { id: "status-container", className: "ml-2 mr-2" })] }));
}
