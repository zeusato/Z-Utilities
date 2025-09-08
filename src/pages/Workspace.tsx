// src/pages/Workspace.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ToolCard from "@/components/ToolCard";
import { TOOLS } from "@/data/tools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { DotBackground } from "@/components/lightswind/grid-dot-background";
//import SmokeyCursor from "@/components/lightswind/smokey-cursor";
import { BorderBeam } from "@/components/lightswind/border-beam";

// ---------------- Search helpers (accent-insensitive + fuzzy) ----------------
// 1) Remove Vietnamese diacritics and standardize text
function normalizeVN(str: string): string {
  if (!str) return "";
  // Remove combining marks + map đ/Đ -> d/D, lower-case
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// 2) Tokenize to ASCII words after normalization (works well for VN text w/o accents)
function tokenize(str: string): string[] {
  return normalizeVN(str)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// 3) Build a searchable haystack from a tool item
function buildHaystack(t: any): string {
  const extras = [
    t?.slug,
    t?.shortDesc,
    ...(Array.isArray((t as any).keywords) ? (t as any).keywords : []),
    ...(Array.isArray((t as any).tags) ? (t as any).tags : []),
    (t as any).group || (t as any).category || "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${t.name || ""} ${extras}`;
}

// 4) Fuzzy score (0..100). Accent-insensitive, supports partial tokens, order, prefix.
function fuzzyScore(query: string, text: string): number {
  const q = normalizeVN(query.trim());
  const h = normalizeVN(text);
  if (!q) return 1; // empty query -> tiny positive score
  if (!h) return 0;

  // quick full-substring bonus
  let score = h.includes(q) ? 85 : 0;

  const qTokens = tokenize(query);
  const hTokens = tokenize(text);
  if (!qTokens.length) return score;

  // token coverage
  let covered = 0;
  let prefixHits = 0;
  for (const qt of qTokens) {
    // present if any token in haystack contains it as substring
    const hit = hTokens.some((ht) => ht.includes(qt));
    if (hit) covered++;
    // prefix boost
    if (hTokens.some((ht) => ht.startsWith(qt))) prefixHits++;
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
  const { slug } = useParams<{ slug?: string }>();
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
    if (slug) push(slug);
  }, [slug, push]);

  // Chuẩn bị comp tool (componentPath nên là relative literal, vd: "../Tools/UrlShortener.tsx")
  let ToolComp: React.ComponentType | null = null;
  if (tool?.componentPath) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ToolComp = lazy(() => import(/* @vite-ignore */ tool.componentPath));
  }

  return (
    <div className="relative h-[100svh] overflow-hidden">
      {/* Header overlay (không chiếm layout) */}
      <div className="absolute inset-x-0 top-0 z-40">
        <Header />
      </div>

      {/* Sidebar vẫn fixed như cũ */}
      <Sidebar />

      {/* BG phủ toàn màn hình */}
      <DotBackground
        dotSize={1}
        dotColor="#d4d4d4"
        darkDotColor="#404040"
        spacing={22}
        showFade
        fadeIntensity={28}
        className="fixed inset-0 -z-10 pointer-events-none"
      />

      {/* Vùng nội dung full viewport */}
      <main className="h-[100svh] px-4 md:px-6 pt-20 pb-6">
        {/* Khi CHƯA chọn tool -> màn search, center trong viewport */}
        {!slug && (
          <section className="grid h-full place-items-center">
            <div className="w-full max-w-6xl">
              <div className="text-center">                
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm công cụ..."
                  className="w-full max-w-xl mx-auto rounded-2xl glass px-4 py-3 text-base"
                />
                                
                <div className="mt-8 grid grid-cols-2 gap-4 max-w-xl mx-auto">
                  {(recent.length ? TOOLS.filter((t) => recent.includes(t.slug)).slice(0, 4) : featured).map((t) => (
                    <ToolCard key={t.id} tool={t} />
                  ))}
                </div>
              </div>

              {q && (
                <div className="mt-10">
                  <div className="mb-3 text-white/80 text-sm">Kết quả</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filtered.map((t) => (
                      <ToolCard key={t.id} tool={t} />
                    ))}
                    {filtered.length === 0 && <div className="opacity-70">Không có kết quả</div>}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Khi ĐÃ chọn tool -> host full màn hình, tool tự scroll trong khung (không scroll body) */}
        {slug && (
          <section className="h-full max-w-6xl mx-auto">
            {tool ? (
              <div className="flex h-full flex-col">
                <div className="shrink-0 space-y-1">
                  <h1 className="text-2xl md:text-3xl font-bold">{tool.name}</h1>
                  {tool.shortDesc && <p className="opacity-80">{tool.shortDesc}</p>}
                </div>

                {/* khung chứa tool: chiếm hết phần còn lại của viewport, scroll nội bộ nếu tràn */}
                <div className="mt-6 grow overflow-auto rounded-2xl">
                  {ToolComp ? (
                    <Suspense fallback={<div className="rounded-2xl glass p-6">Đang tải công cụ...</div>}>
                      <div className="h-full">
                        <ToolComp />
                      </div>
                    </Suspense>
                  ) : (
                    <div className="rounded-2xl glass p-6">
                      Tool <strong>{tool.slug}</strong> chưa khai báo <code>componentPath</code>.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="opacity-80">Không tìm thấy công cụ.</div>
            )}
          </section>
        )}
        {/* <SmokeyCursor /> */}
      </main>
    </div>
  );
}
