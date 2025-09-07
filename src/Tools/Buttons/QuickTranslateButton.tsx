import React, { useEffect, useState } from "react";
import Portal from "@/components/Portal";

type QuickTranslateButtonProps = {
  label?: string;
  className?: string;
  endpoints?: string[];
  /** Nơi render popup: 'body' hoặc selector như '#workspace-root' */
  portalSelector?: string;
};

type TranslateResponse = {
  translatedText: string;
  detectedLanguage?: { language: string; confidence?: number };
};

const LANG_NAMES = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  ja: "Tiếng Nhật",
  ko: "Tiếng Hàn",
  zh: "Tiếng Trung",
} as const;
type LangKey = keyof typeof LANG_NAMES;
const ALLOWED: readonly LangKey[] = ["vi", "en", "ja", "ko", "zh"] as const;
const normalizeLang = (s: string) => (s.toLowerCase().startsWith("zh") ? "zh" : s.toLowerCase());
const isLangKey = (x: string): x is LangKey => (ALLOWED as readonly string[]).includes(x);


const DEFAULT_ENDPOINTS = [
  "https://lt.vern.cc",
  "https://translate.terraprint.co",
  "https://libretranslate.com",
];

const overlayBase =
  "fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center";
const panelBase =
  "w-[90vw] max-w-[760px] max-h-[85vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase =
  "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const closeBtn = "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const sectionPad = "p-4 sm:p-5";
const inputBase =
  "w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-zinc-300/60 outline-none focus:ring-2 focus:ring-blue-400/60 px-3 py-2";
const selectBase = "w-full rounded-lg bg-white/5 border border-white/15 text-white outline-none px-3 py-2";
const labelBase = "text-sm font-medium text-zinc-200 mb-2";
const swapIconBase = "shrink-0 text-blue-400 hover:text-blue-300 cursor-pointer transition text-xl select-none";
const toastBase = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2 rounded-lg bg-black/80 text-white text-sm shadow-lg";
const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 disabled:opacity-50";
const btnSecondary =
  "rounded-xl px-3 py-2 text-sm font-medium bg-zinc-700 text-white hover:bg-zinc-900 focus:ring-2 focus:ring-zinc-400 disabled:opacity-50";

export default function QuickTranslateButton({
  label = "Dịch nhanh",
  className = "",
  endpoints = DEFAULT_ENDPOINTS,
  portalSelector = "body", // hoặc "#workspace-root"
}: QuickTranslateButtonProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"auto" | LangKey>("auto");
  const [target, setTarget] = useState<LangKey>("en");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function robustTranslate(q: string, src: string, tgt: string) {
  const text = q.trim();
  if (!text) throw new Error("Nội dung rỗng");

  // build body đúng spec, bỏ hẳn api_key khi không có
  const body: Record<string, unknown> = {
    q: text,
    source: src,     // 'auto' | 'vi' | ...
    target: tgt,     // 'en' | 'vi' | ...
    format: "text",
    // alternatives: 3, // bật nếu cần, nhiều instance không hỗ trợ sẽ trả 400
  };

  const res = await fetch("/api/lt/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();           // đọc text trước để debug được
  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(j?.error || raw || `HTTP ${res.status}`);
    } catch {
      throw new Error(raw || `HTTP ${res.status}`);
    }
  }

  return JSON.parse(raw) as {
    translatedText: string;
    detectedLanguage?: { language: string; confidence?: number };
  };
}

  async function handleTranslate() {
    const q = input.trim();
    if (!q) return showToast("Nhập nội dung cần dịch đã đại ca!");
    setLoading(true);
    setOutput("");
    try {
      const data = await robustTranslate(q, source, target);
      setOutput(data.translatedText || "");
      if (source === "auto" && data.detectedLanguage?.language) {
        const raw = normalizeLang(data.detectedLanguage.language);
        if (isLangKey(raw)) {
          setSource(raw);
          showToast(`Đã phát hiện ngôn ngữ: ${LANG_NAMES[raw]}`);
        }
      }
    } catch (e: any) {
      setOutput(`Lỗi: ${e?.message || e}`);
      showToast("Hệ thống dịch đang tắc, thử lại giúp em!");
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    if (source === "auto") return showToast('Đang ở "Tự động phát hiện" không thể hoán đổi!');
    const oldSrc = source;
    const oldTgt = target;
    setSource(oldTgt);
    setTarget(oldSrc);
    setInput(output);
    setOutput(input);
  }

  function handleCopy() {
    if (!output) return showToast("Không có nội dung để copy!");
    navigator.clipboard.writeText(output).then(
      () => showToast("Đã copy kết quả!"),
      () => showToast("Copy thất bại (trình duyệt chặn)!")
    );
  }

  return (
    <>
      <button
        type="button"
        className={className || "rounded-xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open && (
        <Portal selector={portalSelector}>
          <div className={overlayBase} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className={`${panelBase} animate-in fade-in zoom-in duration-150`}>
              <div className={headerBase}>
                <h3 className="text-lg font-semibold text-white">Công cụ dịch nhanh</h3>
                <button className={closeBtn} onClick={() => setOpen(false)} aria-label="Đóng">&times;</button>
              </div>

              <div className={`${sectionPad} grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4`}>
                <div>
                  <label className={labelBase}>Ngôn ngữ nguồn</label>
                  <select className={selectBase} value={source} onChange={(e) => setSource(e.target.value as any)}>
                    <option value="auto">Tự động phát hiện</option>
                    {ALLOWED.map(k => <option key={k} value={k}>{LANG_NAMES[k]}</option>)}
                  </select>
                  <div className="mt-2">
                    <textarea className={inputBase} rows={7} placeholder="Gõ hoặc dán nội dung cần dịch..." value={input} onChange={(e) => setInput(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center justify-center pt-6 md:pt-8">
                  <button type="button" className={swapIconBase} title="Đảo chiều" onClick={handleSwap}>&#8646;</button>
                </div>

                <div>
                  <label className={labelBase}>Dịch sang</label>
                  <select className={selectBase} value={target} onChange={(e) => setTarget(e.target.value as LangKey)}>
                    {ALLOWED.map(k => <option key={k} value={k}>{LANG_NAMES[k]}</option>)}
                  </select>
                  <div className="mt-2">
                    <textarea className={`${inputBase} min-h-[2.5rem]`} rows={7} placeholder="Kết quả sẽ hiển thị ở đây..." value={output} readOnly />
                  </div>
                </div>
              </div>

              <div className={`${sectionPad} flex items-center justify-end gap-2 border-t border-white/10`}>
                <button type="button" className={btnSecondary} onClick={handleCopy}>Copy kết quả</button>
                <button type="button" disabled={loading} className={`${btnPrimary} inline-flex items-center gap-2`} onClick={handleTranslate}>
                  {loading && (<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>)}
                  <span>{loading ? "Đang dịch..." : "Dịch"}</span>
                </button>
              </div>
            </div>
            {toast && <div className={toastBase}>{toast}</div>}
          </div>
        </Portal>
      )}
    </>
  );
}
