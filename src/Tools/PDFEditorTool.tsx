"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";

// Dùng worker CDN để tránh lỗi bundler (vite/next)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ---------------- Types ----------------
type PageData = {
  id: string;
  originalFile: File;
  pageNumber?: number;
  canvas: HTMLCanvasElement;
  thumbnailCanvas: HTMLCanvasElement;
  dataUrl: string;
  thumbnailDataUrl: string;
  rotation: number;
  index: number;
  type: "pdf" | "image";
};

// ---------------- Component ----------------
export default function PDFEditorTool() {
  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  // State
  const [processedPages, setProcessedPages] = useState<PageData[]>([]);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportType, setExportType] = useState<"all" | "range">("all");
  const [range, setRange] = useState({ from: 1, to: 1 });

  // --- Zoom/Pan (giống OCRExtractTool)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [initialZoom, setInitialZoom] = useState(1);
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // ---------------- Utils ----------------
  const toast = (msg: string, type: "success" | "error" | "warning" | "info" = "info") => {
    const box = document.getElementById("status-container");
    if (!box) return;
    box.innerHTML = "";
    const div = document.createElement("div");
    div.className =
      "p-3 rounded-lg mb-2 font-medium max-w-sm " +
      (type === "success"
        ? "bg-green-100 text-green-800 border border-green-300"
        : type === "error"
        ? "bg-red-100 text-red-800 border border-red-300"
        : type === "warning"
        ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
        : "bg-blue-100 text-blue-800 border border-blue-300");
    div.textContent = msg;
    box.appendChild(div);
    if (type === "success") setTimeout(() => box.contains(div) && box.removeChild(div), 4000);
  };

  const createThumbnail = useCallback((canvas: HTMLCanvasElement, mw: number, mh: number) => {
    const t = document.createElement("canvas");
    const ctx = t.getContext("2d")!;
    const r = Math.min(mw / canvas.width, mh / canvas.height);
    const w = Math.max(1, Math.round(canvas.width * r));
    const h = Math.max(1, Math.round(canvas.height * r));
    t.width = w;
    t.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, w, h);
    return t;
  }, []);

  // ---------------- Upload/Drop ----------------
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    uploadRef.current?.classList.add("ring", "ring-cyan-400");
  }, []);

  const handleDragLeave = useCallback(() => {
    uploadRef.current?.classList.remove("ring", "ring-cyan-400");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    uploadRef.current?.classList.remove("ring", "ring-cyan-400");
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const onFiles = useCallback(
    async (files: File[]) => {
      const list = files.filter(
        (f) => f.type === "application/pdf" || ["image/jpeg", "image/jpg", "image/png"].includes(f.type)
      );
      if (!list.length) {
        toast("Vui lòng chọn file PDF/JPG/PNG hợp lệ", "error");
        return;
      }
      if (list.length > 50) list.splice(50);

      setBusy(true);
      setProgress(0);
      setProgressText("Đang tải file…");

      let curIndex = processedPages.length;
      const newPages: PageData[] = [];

      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setProgress(((i + 1) / list.length) * 100);
        setProgressText(`Đang xử lý: ${f.name} (${i + 1}/${list.length})`);

        try {
          if (f.type === "application/pdf") {
            const ab = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(ab).promise;
            for (let p = 1; p <= pdf.numPages; p++) {
              const page = await pdf.getPage(p);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d")!;
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;

              const thumb = createThumbnail(canvas, 60, 80); // nhỏ cho sắc nét khi hiển thị 30x40
              newPages.push({
                id: `page_${curIndex}_${Date.now()}`,
                originalFile: f,
                pageNumber: p,
                canvas,
                thumbnailCanvas: thumb,
                dataUrl: canvas.toDataURL("image/jpeg", 0.9),
                thumbnailDataUrl: thumb.toDataURL("image/jpeg", 0.85),
                rotation: 0,
                index: curIndex,
                type: "pdf",
              });
              curIndex++;
            }
          } else {
            const page = await new Promise<PageData>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const ctx = canvas.getContext("2d")!;
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx.drawImage(img, 0, 0);
                  const thumb = createThumbnail(canvas, 60, 80);
                  resolve({
                    id: `page_${curIndex}_${Date.now()}`,
                    originalFile: f,
                    canvas,
                    thumbnailCanvas: thumb,
                    dataUrl: canvas.toDataURL("image/jpeg", 0.9),
                    thumbnailDataUrl: thumb.toDataURL("image/jpeg", 0.85),
                    rotation: 0,
                    index: curIndex,
                    type: "image",
                  });
                };
                img.src = String(ev.target?.result || "");
              };
              reader.readAsDataURL(f);
            });
            newPages.push(page);
            curIndex++;
          }
        } catch (err: any) {
          console.error(err);
          toast(`Lỗi xử lý file ${f.name}: ${err?.message || "Không xác định"}`, "error");
        }
      }

      setProcessedPages((prev) => {
        const merged = [...prev, ...newPages];
        if (!prev.length && merged.length) setCurrent(0);
        return merged;
      });

      setBusy(false);
      setRange({ from: 1, to: processedPages.length + newPages.length });
      toast(`Đã thêm ${newPages.length} trang. Tổng ${processedPages.length + newPages.length} trang.`, "success");
    },
    [processedPages.length, createThumbnail]
  );

  // ---------------- Move page Up/Down ----------------
  const movePage = useCallback((i: number, dir: -1 | 1) => {
    setProcessedPages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      next.forEach((p, k) => (p.index = k));
      setCurrent((c) => (c === i ? j : c === j ? i : c));
      return next;
    });
  }, []);

  // ---------------- Rotate/Delete ----------------
  const rotateCanvas = useCallback((canvas: HTMLCanvasElement, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const out = document.createElement("canvas");
    const ctx = out.getContext("2d")!;
    out.width = canvas.width * cos + canvas.height * sin;
    out.height = canvas.width * sin + canvas.height * cos;
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return out;
  }, []);

  const rotatePage = useCallback(
    (i: number) => {
      setProcessedPages((prev) => {
        const next = [...prev];
        const p = { ...next[i] };
        p.rotation = (p.rotation + 90) % 360;
        p.canvas = rotateCanvas(prev[i].canvas, 90);
        p.dataUrl = p.canvas.toDataURL("image/jpeg", 0.9);
        p.thumbnailCanvas = createThumbnail(p.canvas, 60, 80);
        p.thumbnailDataUrl = p.thumbnailCanvas.toDataURL("image/jpeg", 0.85);
        next[i] = p;
        return next;
      });
      toast("Đã xoay trang", "success");
    },
    [rotateCanvas, createThumbnail]
  );

  const deletePage = useCallback((i: number) => {
    if (!confirm("Xóa trang này?")) return;
    setProcessedPages((prev) => {
      const next = prev.slice(0, i).concat(prev.slice(i + 1));
      setCurrent((c) => Math.min(c, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  // ---------------- Crop (overlay + kéo/resize) ----------------
  const [cropping, setCropping] = useState(false);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const resizeHandle = useRef<string | null>(null);
  const dragging = useRef(false);
  const resizing = useRef(false);

  const placeHandles = (frame: HTMLDivElement) => {
    const make = (h: string, style: Partial<CSSStyleDeclaration>, cursor: string) => {
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
    if (!container || !img) return;

    setCropping(true);

    (document.body.style as any).userSelect = 'none';
    const overlay = document.createElement("div");
    overlay.id = "crop-overlay";
    overlay.className = "absolute inset-0 z-10";
    overlay.style.pointerEvents = "none";

    const frame = document.createElement("div");
    frame.id = "crop-frame";
    frame.className =
      "absolute border-2 border-cyan-500 bg-cyan-500/10 cursor-move z-20 rounded";
    frame.style.pointerEvents = "auto";

    container.appendChild(overlay);
    overlay.appendChild(frame);
    cropFrameRef.current = frame as HTMLDivElement;

    placeHandles(frame);

    // Đặt giữa khung preview với tỉ lệ 50% ảnh đang hiển thị
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

    // Drag move
    frame.addEventListener("mousedown", (e) => {
      // Nếu bấm vào handle (dot/edge) thì KHÔNG bật drag move
      const t = e.target as HTMLElement;
      if (t.closest('[data-handle]')) return;

      // Bật kéo (exclusive)
      resizing.current = false;
      dragging.current = true;

      const rect = frame.getBoundingClientRect();
      // Offset CHUẨN: chuột so với mép trái/trên của CHÍNH frame
      dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.preventDefault();
    });

    // Resize from handles
    frame.querySelectorAll<HTMLElement>("[data-handle]").forEach((h) =>
      h.addEventListener("mousedown", (e) => {
        // Resize (exclusive)
        dragging.current = false;
        resizing.current = true;
        resizeHandle.current = (e.target as HTMLElement).dataset.handle!;
        cropStart.current.x = e.clientX;
        cropStart.current.y = e.clientY;
        e.preventDefault();
        e.stopPropagation();
      })
    );
  }, []);

  const onDocMove = useCallback((e: MouseEvent) => {
    if (!cropping) return;
    const frame = cropFrameRef.current;
    const img = previewImgRef.current;
    const container = previewWrapRef.current;
    if (!frame || !img || !container) return;

    const rI = img.getBoundingClientRect();
    const rC = container.getBoundingClientRect();
    const imgL = rI.left - rC.left;
    const imgT = rI.top - rC.top;
    const imgR = imgL + rI.width;
    const imgB = imgT + rI.height;

    const rect = frame.getBoundingClientRect();

    if (dragging.current) {
      let nx = e.clientX - rC.left - dragOffset.current.dx;
      let ny = e.clientY - rC.top  - dragOffset.current.dy;
      const fw = rect.width;
      const fh = rect.height;
      nx = Math.max(imgL, Math.min(nx, imgR - fw));
      ny = Math.max(imgT, Math.min(ny, imgB - fh));
      frame.style.left = `${nx}px`;
      frame.style.top  = `${ny}px`;
    }

    if (resizing.current && resizeHandle.current) {
      const dx = e.clientX - cropStart.current.x;
      const dy = e.clientY - cropStart.current.y;

      let nx = rect.left - rC.left;
      let ny = rect.top - rC.top;
      let w = rect.width;
      let h = rect.height;

      switch (resizeHandle.current) {
        case "nw":
          nx += dx; ny += dy; w -= dx; h -= dy; break;
        case "ne":
          ny += dy; w += dx; h -= dy; break;
        case "sw":
          nx += dx; w -= dx; h += dy; break;
        case "se":
          w += dx; h += dy; break;
        case "n":
          ny += dy; h -= dy; break;
        case "s":
          h += dy; break;
        case "w":
          nx += dx; w -= dx; break;
        case "e":
          w += dx; break;
      }

      w = Math.max(50, w);
      h = Math.max(50, h);
      nx = Math.max(imgL, Math.min(nx, imgR - w));
      ny = Math.max(imgT, Math.min(ny, imgB - h));
      if (nx + w > imgR) w = imgR - nx;
      if (ny + h > imgB) h = imgB - ny;

      frame.style.left = `${nx}px`;
      frame.style.top = `${ny}px`;
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;

      cropStart.current.x = e.clientX;
      cropStart.current.y = e.clientY;
    }
  }, [cropping]);

  const onDocUp = useCallback(() => {
    dragging.current = false;
    resizing.current = false;
    resizeHandle.current = null;
    (document.body.style as any).userSelect = '';
  }, []);

  useEffect(() => {
    if (!cropping) return;
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
    dragging.current = false;
    resizing.current = false;
    resizeHandle.current = null;
    (document.body.style as any).userSelect = '';
  }, []);

  const applyCrop = useCallback(() => {
    const frame = cropFrameRef.current;
    const img = previewImgRef.current;
    if (!frame || !img) return;

    const rF = frame.getBoundingClientRect();
    const rI = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rI.width;
    const scaleY = img.naturalHeight / rI.height;

    const cropX = (rF.left - rI.left) * scaleX;
    const cropY = (rF.top - rI.top) * scaleY;
    const cropW = rF.width * scaleX;
    const cropH = rF.height * scaleY;

    setProcessedPages((prev) => {
      const next = [...prev];
      const p = { ...next[current] };
      const out = document.createElement("canvas");
      const ctx = out.getContext("2d")!;
      out.width = Math.max(1, Math.round(cropW));
      out.height = Math.max(1, Math.round(cropH));
      ctx.drawImage(p.canvas, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
      p.canvas = out;
      p.dataUrl = out.toDataURL("image/jpeg", 0.9);
      p.thumbnailCanvas = createThumbnail(out, 60, 80);
      p.thumbnailDataUrl = p.thumbnailCanvas.toDataURL("image/jpeg", 0.85);
      next[current] = p;
      return next;
    });

    cancelCrop();
    toast("Đã cắt ảnh", "success");
  }, [current, cancelCrop, createThumbnail]);

  // remove crop overlay when switch page
  useEffect(() => {
    if (cropping) cancelCrop();
  }, [current]);

  // ---------------- Preview interactions (fit, pan, zoom) ----------------
  useEffect(() => {
    const page = processedPages[current];
    if (!page || !previewWrapRef.current) {
      setInitialZoom(1);
      setZoom(1);
      setInitialPan({ x: 0, y: 0 });
      setPan({ x: 0, y: 0 });
      setNaturalSize({ width: 0, height: 0 });
      return;
    }
    const container = previewWrapRef.current!;
    const contW = container.clientWidth;
    const contH = container.clientHeight;
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
      setZoom(fitScale);
      setInitialPan({ x: centerX, y: centerY });
      setPan({ x: centerX, y: centerY });
    };
    img.src = page.dataUrl;
  }, [current, processedPages]);

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
  }, [zoom, naturalSize, initialPan]);

  const resetView = () => {
    setZoom(initialZoom);
    setPan(initialPan);
  };

  // Attach non-passive wheel handler to avoid console warnings and allow preventDefault
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      if (!processedPages[current]) return;
      const delta = -e.deltaY;
      setZoom((z) => {
        const next = Math.max(initialZoom, Math.min(4, z + (delta > 0 ? 0.1 : -0.1)));
        return Number(next.toFixed(2));
      });
    };
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler);
  }, [initialZoom, processedPages, current]);

  // ---------------- Export PDF ----------------
  const doExport = useCallback(async () => {
    if (!processedPages.length) {
      toast("Không có trang để xuất PDF", "error");
      return;
    }
    const from = exportType === "range" ? Math.max(1, Math.min(range.from, processedPages.length)) : 1;
    const to = exportType === "range" ? Math.max(from, Math.min(range.to, processedPages.length)) : processedPages.length;

    const pages = processedPages.slice(from - 1, to).filter(Boolean);
    if (!pages.length) {
      toast("Không có trang hợp lệ để xuất.", "error");
      return;
    }
    try {
      // KHÔNG deletePage(1); dùng luôn trang đầu mặc định
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pages.forEach((p, i) => {
        if (i > 0) pdf.addPage("a4", "portrait");
        const pw = 210, ph = 297; // A4 mm
        const r = p.canvas.width / p.canvas.height;
        let iw: number, ih: number;
        if (r > pw / ph) {
          iw = pw - 20; // margin 10mm
          ih = iw / r;
        } else {
          ih = ph - 20;
          iw = ih * r;
        }
        const x = (pw - iw) / 2;
        const y = (ph - ih) / 2;
        const img = p.canvas.toDataURL("image/jpeg", 0.9);
        pdf.addImage(img, "JPEG", x, y, iw, ih);
      });
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      pdf.save(`edited_pdf_${ts}.pdf`);
      toast("Đã xuất PDF", "success");
      setExportOpen(false);
    } catch (e: any) {
      console.error(e);
      toast(`Lỗi tạo PDF: ${e?.message || "Không xác định"}`, "error");
    }
  }, [processedPages, exportType, range, initialZoom]);

  // ---------------- UI ----------------
  return (
    <div className="w-full h-full overflow-hidden">

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 h-[calc(100%-1.5rem)]">
        {/* LEFT */}
        <div className="min-w-0 overflow-auto lg:overflow-hidden flex flex-col">
          <div
            ref={uploadRef}
            className="mb-3 mt-1 border-2 border-dashed border-cyan-500 rounded-xl p-8 text-center bg-slate-400/30 backdrop-blur transition-all duration-300 hover:border-cyan-600 hover:bg-green-50/50"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-4 text-cyan-500">📄</div>
            <div className="text-lg text-white mb-2">Kéo thả file PDF/Ảnh vào đây hoặc bấm để chọn</div>
            <div className="text-sm text-white-300 mb-4">Hỗ trợ: PDF, JPG, PNG, JPEG (tối đa 50 file)</div>
            <button className="bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-600 transition-colors">
              Chọn file để chỉnh sửa
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={handleChange}
            />
          </div>

          {busy && (
            <div className="ml-2 mr-2 p-4 border border-zinc-300 rounded-xl bg-zinc-50">
              <h3 className="text-lg font-medium mb-2">Đang xử lý file...</h3>
              <div className="bg-zinc-200 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-600">{progressText}</p>
            </div>
          )}

          {/* Status box (DUY NHẤT) */}
          <div id="status-container" className="ml-2 mr-2" />

          {/* ACTIONS */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 mb-2">
            <button
              onClick={() => {
                setProcessedPages([]);
                setCurrent(0);
                setCropping(false);
                const ov = document.getElementById("crop-overlay");
                ov?.parentElement?.removeChild(ov);
                setZoom(1); setPan({ x: 0, y: 0 }); setInitialZoom(1); setInitialPan({ x: 0, y: 0 });
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              disabled={!processedPages.length}
            >
              🔄 Reset
            </button>
            <button
              onClick={() => {
                setRange({ from: 1, to: processedPages.length || 1 });
                setExportOpen(true);
              }}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50"
              disabled={!processedPages.length}
            >
              📥 Xuất PDF
            </button>
          </div>
        </div>

        {/* RIGHT: Preview (h-full) + vertical thumbnails ở bên phải */}
        <div className="min-w-0 mr-1 overflow-hidden">
          <div className="flex h-full gap-3">
            {/* PREVIEW */}
            <div
              ref={previewWrapRef}
              // onWheel={onWheelPreview}
              onDoubleClick={resetView}
              onMouseDown={(e) => {
                if (!processedPages[current] || e.button !== 0) return;
                // chặn kéo khi bấm vào khung crop
                const target = e.target as HTMLElement;
                if (target.closest('#crop-frame')) return;
                setIsDragging(true);
                dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                e.preventDefault();
              }}
              onMouseMove={(e) => {
                if (!isDragging || !processedPages[current]) return;
                setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              className="relative flex-1 border border-zinc-300 rounded-xl bg-slate-400/30 backdrop-blur-sm overflow-hidden cursor-grab active:cursor-grabbing"
            >
              {processedPages.length ? (
                <>
                  {/* Crop controls trong khung */}
                  <div className="absolute top-2 right-2 z-30 flex gap-2">
                    {!cropping ? (
                      <button
                        onClick={startCrop}
                        className="rounded bg-cyan-600 text-white text-xs px-3 py-1 hover:bg-cyan-700"
                      >
                        Crop
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={applyCrop}
                          className="rounded bg-emerald-600 text-white text-xs px-3 py-1 hover:bg-emerald-700"
                        >
                          Áp dụng
                        </button>
                        <button
                          onClick={cancelCrop}
                          className="rounded bg-rose-600 text-white text-xs px-3 py-1 hover:bg-rose-700"
                        >
                          Hủy
                        </button>
                      </>
                    )}
                  </div>

                  <img
                    key={processedPages[current].id}
                    ref={previewImgRef}
                    src={processedPages[current].dataUrl}
                    alt={`Preview trang ${current + 1}`}
                    className="absolute top-0 left-0 max-w-none max-h-none select-none"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                    draggable={false}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-white">
                  <div>
                    <div className="text-4xl mb-2">📄</div>
                    <p>Chưa có trang nào</p>
                  </div>
                </div>
              )}
            </div>

            {/* THUMBNAILS (vertical) */}
            <div className="w-56 border border-zinc-300 rounded-xl bg-slate-400/30 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 text-sm font-medium text-center">Danh sách trang</div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                {processedPages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-white py-4">
                    Không có trang nào <br/>Upload file để bắt đầu
                  </div>
                ) : (
                  processedPages.map((p, i) => (
                    <div
                      key={p.id}
                      className={`relative bg-white rounded-lg px-2 py-2 cursor-pointer transition-all duration-300 border ${
                        i === current ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow" : "border-zinc-200 hover:shadow"
                      }`}
                      onClick={() => setCurrent(i)}
                    >
                      {/* controls */}
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          className="w-5 h-5 bg-zinc-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-zinc-600 disabled:opacity-40"
                          title="Lên"
                          disabled={i === 0}
                          onClick={(e) => { e.stopPropagation(); movePage(i, -1); }}
                        >
                          ↑
                        </button>
                        <button
                          className="w-5 h-5 bg-zinc-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-zinc-600 disabled:opacity-40"
                          title="Xuống"
                          disabled={i === processedPages.length - 1}
                          onClick={(e) => { e.stopPropagation(); movePage(i, 1); }}
                        >
                          ↓
                        </button>
                        <button
                          className="w-5 h-5 bg-gray-500 text-white rounded-full text-[10px] leading-[18px] hover:bg-gray-600"
                          title="Xoay"
                          onClick={(e) => { e.stopPropagation(); rotatePage(i); }}
                        >
                          ↻
                        </button>
                        <button
                          className="w-5 h-5 bg-red-500 text-white rounded-full text-[12px] leading-[18px] hover:bg-red-600"
                          title="Xóa"
                          onClick={(e) => { e.stopPropagation(); deletePage(i); }}
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <img
                          src={p.thumbnailDataUrl}
                          alt={`Thumb ${i + 1}`}
                          className="w-[30px] h-[40px] object-contain bg-white border border-zinc-200 rounded"
                        />
                        <div className="text-xs text-zinc-600">Trang {i + 1}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {exportOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">📥 Xuất PDF</h3>
              <button onClick={() => setExportOpen(false)} className="text-2xl text-zinc-500 hover:text-zinc-700">&times;</button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="export-type" value="all" checked={exportType === "all"} onChange={() => setExportType("all")} />
                <span>📄 Xuất tất cả trang</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="export-type" value="range" checked={exportType === "range"} onChange={() => setExportType("range")} />
                <span>📑 Chọn khoảng trang</span>
              </label>

              {exportType === "range" && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Từ trang</span>
                    <input type="number" min={1} max={processedPages.length} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: +e.target.value }))} className="w-16 p-2 border rounded text-center" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">đến trang</span>
                    <input type="number" min={1} max={processedPages.length} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: +e.target.value }))} className="w-16 p-2 border rounded text-center" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setExportOpen(false)} className="px-4 py-2 border rounded-lg text-zinc-600 hover:bg-zinc-50">Hủy</button>
              <button onClick={doExport} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Xuất PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
