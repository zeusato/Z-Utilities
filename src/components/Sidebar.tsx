// src/components/Sidebar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { TOOLS } from "@/data/tools";
import type { Tool } from "@/data/tools";
import {
  Image as ImageIcon,
  FileText,
  QrCode,
  PlayCircle,
  Boxes,
  Pin as PinIcon,
} from "lucide-react";

// ---------------- Helpers ----------------
function getCatKey(t: Tool): string {
  // common fields; fallback
  // @ts-ignore
  return t.categoryId || t.groupId || t.category || t.group || "Khác";
}
function getCatLabel(key: string, sample?: Tool): string {
  // @ts-ignore
  const explicit = sample?.categoryName || sample?.groupName;
  if (explicit) return explicit as string;
  const map: Record<string, string> = {
    image_pdf: "Công cụ xử lý hình ảnh & PDF",
    text_data: "Công cụ xử lý văn bản & dữ liệu",
    qr_cccd: "Công cụ QR Code & CCCD",
    media: "Công cụ đa phương tiện",
    other: "Tiện ích khác",
    Khác: "Tiện ích khác",
  };
  return map[key] || key;
}
function CatGlyph({ label }: { label: string }) {
  const L = label.toLowerCase();
  let Icon = Boxes;
  if (/(hình ảnh|ảnh|image|pdf)/i.test(L)) Icon = ImageIcon;
  else if (/(văn bản|text|dữ liệu|data)/i.test(L)) Icon = FileText;
  else if (/(qr|cccd)/i.test(L)) Icon = QrCode;
  else if (/(đa phương tiện|media|audio|video)/i.test(L)) Icon = PlayCircle;
  return <Icon className="w-5 h-5" />;
}
function groupToolsByCategory(tools: Tool[]) {
  const map = new Map<string, { key: string; label: string; items: Tool[] }>();
  for (const t of tools) {
    const key = getCatKey(t);
    const label = getCatLabel(key, t);
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key)!.items.push(t);
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
  const [hoverCat, setHoverCat] = React.useState<string | null>(null); // compact hover state
  const [expanded, setExpanded] = React.useState<boolean>(false); // full panel visibility
  const [pinned, setPinned] = React.useState<boolean>(false); // keep panel open
  const collapseTimer = React.useRef<number | null>(null);
  const hoverTimer = React.useRef<number | null>(null);

  // groups (static)
  const groups = React.useMemo(() => groupToolsByCategory(TOOLS as Tool[]), []);
  const isToolActive = (slug: string) => pathname.startsWith("/tool/" + slug);

  // persist pinned
  React.useEffect(() => {
    const v = localStorage.getItem("sidebar_pinned");
    if (v === "1") setPinned(true);
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
      collapseTimer.current = window.setTimeout(() => setExpanded(false), 500) as unknown as number;
    }
  };

  return (
    <aside className="relative select-none">
      {/* Compact bar */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40">
        <div className="glass rounded-2xl p-2 flex flex-col items-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Thu gọn" : "Mở menu"}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs transition-colors"
          >
            {expanded ? "«" : "»"}
          </button>

          {/* Category icons with inline subtools; keep open while mouse over icon or its tools */}
          <div className="flex flex-col items-center gap-2">
            {groups.map((g) => (
              <div
                key={g.key}
                className="relative group"
                onMouseEnter={() => {
                  if (hoverCat !== g.key && hoverTimer.current === null) {
                    hoverTimer.current = window.setTimeout(() => {
                      setHoverCat(g.key);
                      hoverTimer.current = null;
                    }, 500) as unknown as number;
                  }
                }}
                onMouseLeave={() => {
                  if (hoverTimer.current !== null) {
                    window.clearTimeout(hoverTimer.current);
                    hoverTimer.current = null;
                  }
                  if (hoverCat === g.key) {
                    setHoverCat(null);
                  }
                }}
              >
                {/* Category icon */}
                <button
                  aria-label={g.label}
                  className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-lg bg-white/10 hover:bg-white/15 transition"
                >
                  <CatGlyph label={g.label} />
                </button>
                {/* Category tooltip */}
                <div className={`pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 opacity-0 transition-opacity ${hoverCat !== g.key ? 'group-hover:opacity-100' : ''}`}>
                  <div className="glass px-2 py-1 rounded-md text-xs whitespace-nowrap">{g.label}</div>
                </div>

                {/* Subtools block lives in same wrapper so hover persists across icon -> tools */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    hoverCat === g.key ? "max-h-96 mt-1" : "max-h-0"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {g.items.map((t) => (
                      <div key={t.id} className="relative group/tool">
                        <Link
                          to={`/tool/${t.slug}`}
                          className={`w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-base bg-white/10 hover:bg-white/15 transition ${
                            isToolActive(t.slug) ? "bg-white/20" : ""
                          }`}
                          title={t.name}
                        >
                          <span aria-hidden>{t.icon || "🛠"}</span>
                        </Link>
                        {/* Tool tooltip */}
                        <div className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 opacity-0 group-hover/tool:opacity-100 transition-opacity">
                          <div className="glass px-2 py-1 rounded-md text-xs whitespace-nowrap">{t.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded (full) panel */}
      <div className={`fixed left-3 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'w-[320px] md:w-[380px]' : 'w-0'}`}>
        <div
          className={`glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 p-3' : 'opacity-0 p-0'}`}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm opacity-80 px-1">Tất cả công cụ</div>
              {/* Pin button only; highlighted when pinned. No close button. */}
              <button
                onClick={() => setPinned((v) => !v)}
                className={`rounded-md px-2 py-1 border border-white/15 transition flex items-center gap-1 text-xs ${
                  pinned ? "bg-cyan-500/70 text-white" : "bg-white/10 hover:bg-white/15"
                }`}
                title={pinned ? "Đang ghim" : "Ghim menu"}
                aria-pressed={pinned}
              >
                <PinIcon className="w-3.5 h-3.5" />
                {pinned ? "Đã ghim" : "Ghim"}
              </button>
            </div>

            <div className="space-y-3 pr-1 max-h-[70vh] overflow-y-auto scrollbar-none">
              {groups.map((g) => (
                <div key={g.key} className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <CatGlyph label={g.label} />
                    <div className="font-medium text-sm">{g.label}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {g.items.map((t) => (
                      <Link
                        key={t.id}
                        to={`/tool/${t.slug}`}
                        className={`rounded-lg px-2 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 transition flex items-center gap-2 ${
                          isToolActive(t.slug) ? "bg-white/20" : ""
                        }`}
                      >
                        <span className="text-lg" aria-hidden>
                          {t.icon || "🛠"}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{t.name}</div>
                          {/* @ts-ignore */}
                          {t.shortDesc && (
                            <div className="text-[11px] opacity-70 truncate">{t.shortDesc}</div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
  );
}
