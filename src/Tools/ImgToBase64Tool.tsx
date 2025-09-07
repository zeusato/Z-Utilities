"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";

// Glass card style reuse
const fieldBox =
  "rounded-2xl border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-900/60 dark:border-zinc-700";

// Helpers
const kb = (bytes: number) => (bytes / 1024).toFixed(1);

function dataUrlMime(dataUrl: string): string | undefined {
  const m = /^data:([^;]+);base64,/.exec(dataUrl);
  return m?.[1];
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(String(e.target?.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function transformDataURL(
  dataUrl: string,
  opts: { forceType?: string; resize?: boolean; W?: number; H?: number; quality?: number }
): Promise<string> {
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
        } else if (H && !W) {
          w = Math.round((img.naturalWidth * H) / img.naturalHeight);
          h = H;
        } else if (W && H) {
          w = W;
          h = H;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const q = Math.min(1, Math.max(0.01, (opts.quality ?? 0.92)));
      const type = opts.forceType || dataUrlMime(dataUrl) || "image/png";
      try {
        resolve(canvas.toDataURL(type, q));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

interface Item {
  id: string;
  name: string;
  fileKB: string;
  dataUrl: string;
}

export default function ImgToBase64Tool() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Controls
  const [forceType, setForceType] = useState<string>("");
  const [resize, setResize] = useState(false);
  const [W, setW] = useState<string>("");
  const [H, setH] = useState<string>("");
  const [quality, setQuality] = useState<number>(92);

  const handlePick = () => fileRef.current?.click();

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const out: Item[] = [];
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
    },
    [forceType, resize, W, H, quality]
  );

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
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
    } catch {}
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

  return (
    <div className="w-full h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[0.5fr_2fr] gap-4">
        {/* Left: Controls & Drop */}
        <div className="flex flex-col gap-3">
          <div className={`${fieldBox} p-4`}>
            <div className="flex flex-wrap justify-start items-center gap-2">
              <button onClick={handlePick} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Chọn ảnh
              </button>
              <select
                value={forceType}
                onChange={(e) => setForceType(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm dark:bg-zinc-900/60 dark:border-zinc-700"
                title="Định dạng xuất"
              >
                <option value="">Giữ định dạng gốc</option>
                <option value="image/png">Ép PNG</option>
                <option value="image/jpeg">Ép JPEG</option>
                <option value="image/webp">Ép WEBP</option>
              </select>
            
              <div className="flex items-center justify-start gap-2 text-xs opacity-80">
                <span>Quality</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Math.max(1, Math.min(100, Number(e.target.value) || 92)))}
                  className="w-[88px] rounded-lg border border-zinc-300 bg-white/70 px-2 py-1.5 text-xs dark:bg-zinc-900/60 dark:border-zinc-700"
                  title="JPEG/WEBP quality"
                />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="ml-1 flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-indigo-600" checked={resize} onChange={(e) => setResize(e.target.checked)} />
                Resize
              </label>
              <input
                type="number"
                placeholder="Width px"
                value={W}
                onChange={(e) => setW(e.target.value)}
                disabled={!resize}
                className="w-[120px] rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm disabled:opacity-50 dark:bg-zinc-900/60 dark:border-zinc-700"
              />
              <input
                type="number"
                placeholder="Height px"
                value={H}
                onChange={(e) => setH(e.target.value)}
                disabled={!resize}
                className="w-[120px] rounded-lg border border-zinc-300 bg-white/70 px-3 py-2 text-sm disabled:opacity-50 dark:bg-zinc-900/60 dark:border-zinc-700"
              />
              </div>
            </div>
          </div>

          <div
            className={`${fieldBox} ${dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-dashed"} p-6 text-center text-zinc-600 dark:text-zinc-300 cursor-pointer`}
            onClick={handlePick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="text-4xl">🖼️</div>
            <div className="mt-1 text-sm opacity-80">Kéo & thả ảnh vào đây (hoặc bấm “Chọn ảnh”).</div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={clearList} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Xoá danh sách
            </button>
            <button onClick={resetAll} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Reset all
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className={`${fieldBox} p-4`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
            <div>
              <div className="mb-3 text-sm font-semibold">Danh sách kết quả</div>
              <div className="grid gap-3">
                {items.map((it, idx) => {
                  const sizeKB = Math.ceil((it.dataUrl.length * 3) / 4 / 1024);
                  const tag = `<img src="${it.dataUrl}" alt="${it.name.replace(/"/g, "&quot;")}" />`;
                  return (
                    <div key={it.id} className="grid grid-cols-[140px_1fr] gap-3 items-start rounded-xl border border-zinc-200 p-2 dark:border-zinc-700">
                      <img src={it.dataUrl} className="h-[140px] w-[140px] rounded-md object-cover bg-zinc-100" alt="thumb" />
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2 justify-between text-xs text-green-400">
                          <div>
                            {it.name} · {it.fileKB} KB → {sizeKB.toLocaleString()} KB
                          </div>
                          <div className="flex gap-2 text-white">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(tag);
                              }}
                              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                              Copy <code>&lt;img&gt;</code>
                            </button>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(it.dataUrl);
                              }}
                              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                              Copy data URL
                            </button>
                          </div>
                        </div>
                        <textarea
                          className="w-full min-h-[110px] resize-vertical rounded-lg border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:bg-zinc-900 dark:text-white dark:border-zinc-700"
                          spellCheck={false}
                          value={tag}
                          readOnly
                        />
                      </div>
                    </div>
                  );
                })}
                {!items.length && (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    Chưa có ảnh nào. Hãy tải ảnh ở khung bên trái.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold">Gộp tất cả (HTML snippet)</div>
              <textarea
                className="h-[260px] w-full resize-vertical rounded-lg border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:bg-zinc-900 dark:text-white dark:border-zinc-700"
                value={combinedHTML}
                readOnly
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={copyCombined} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Copy tất cả
                </button>
                <button onClick={downloadHTML} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Tải .html
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Mẹo: Base64 làm HTML nặng, nên chỉ dùng cho logo/icon/gif nhỏ, email template, hoặc khi cần 1 file duy nhất.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
