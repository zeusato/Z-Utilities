// src/tools/UrlShortener.tsx
import React from "react";

type ServiceResult = { url: string; service: string } | null;

function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" }) {
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`fixed top-6 right-6 z-[500] transition-transform duration-300 ${
        show ? "translate-x-0" : "translate-x-[150%]"
      } rounded-xl px-4 py-2 text-sm font-medium border
      ${type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-rose-500/90 border-rose-400 text-white"}`}
      role="status"
    >
      {type === "success" ? "✅ " : "❌ "}{msg}
    </div>
  );
}

export default function UrlShortener() {
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ServiceResult>(null);
  const [error, setError] = React.useState<string>("");
  const [toast, setToast] = React.useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const isValidUrl = (s: string) => {
    try {
      const u = new URL(s.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const doFetch = async (url: string) => {
    // Try TinyURL
    try {
      const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const t = await r.text();
        if (t && t.startsWith("https://tinyurl.com/")) return { url: t, service: "TinyURL" } as ServiceResult;
      }
    } catch {}
    // Try is.gd
    try {
      const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const t = await r.text();
        if (t && t.startsWith("https://is.gd/")) return { url: t, service: "is.gd" } as ServiceResult;
      }
    } catch {}
    // Try v.gd
    try {
      const r = await fetch(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const t = await r.text();
        if (t && t.startsWith("https://v.gd/")) return { url: t, service: "v.gd" } as ServiceResult;
      }
    } catch {}
    return null;
  };

  const onShorten = async () => {
    setCopied(false);
    setResult(null);
    setError("");
    const url = input.trim();
    if (!url) {
      setError("Vui lòng nhập URL cần rút gọn");
      return;
    }
    if (!isValidUrl(url)) {
      setError("URL không hợp lệ. Nhớ kèm http:// hoặc https://");
      return;
    }
    setLoading(true);
    try {
      const res = await doFetch(url);
      if (!res) throw new Error("Các dịch vụ rút gọn đang bận. Thử lại sau.");
      setResult(res);
      setToast({ msg: `Đã rút gọn qua ${res.service}!` });
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra khi rút gọn URL");
      setToast({ msg: e?.message || "Có lỗi xảy ra", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setToast({ msg: "Đã sao chép link rút gọn!" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToast({ msg: "Không thể copy, hãy sao chép thủ công.", type: "error" });
    }
  };

  return (
    <div className="w-full h-full px-4 md:px-6">
      {/* Card nhập liệu */}

      <div className="rounded-2xl glass p-6 w-full h-1000 flex flex-col">
        <div className="w-full">
          <label htmlFor="url" className="block mb-2 font-medium">Nhập URL cần rút gọn</label>  
        </div>        
        <div className="mt-4 flex gap = 3">          
          <input
            id="url"
            type="url"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) onShorten(); }}
            placeholder="https://example.com/very-long-url..."
            className={`w-full rounded-2xl px-4 py-3 text-base border outline-none transition
              bg-white/10 backdrop-blur border-white/20 focus:border-cyan-400/70 focus:bg-white/15
              ${error ? "border-rose-400/70 bg-rose-500/10" : ""}`}
            autoComplete="url"
          />
          {error && (
            <div className="mt-2 rounded-xl px-3 py-2 text-sm border border-rose-400/50 bg-rose-500/15">
              ❗ {error}
            </div>
          )}

          <button
          onClick={onShorten}
          disabled={loading}
          className="ml-5 w-[300px] rounded-2xl px-4 py-3 font-semibold border border-white/20
                     bg-blue-500/40 hover:bg-blue-500/60 backdrop-blur transition
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Đang rút gọn…
            </span>
          ) : ("Rút gọn Link")}
          </button>
        </div>



        {/* Kết quả */}
        {result && (
          <div className="mt-6 rounded-xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <div className="text-sm text-white/80 mb-2">✅ Link đã rút gọn thành công</div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
              <div className="font-mono text-cyan-300 break-all">{result.url}</div>
              <button
                onClick={copy}
                className={`ml-auto rounded-lg px-3 py-1.5 text-sm border transition
                  ${copied ? "bg-emerald-500/80 border-emerald-400 text-white" : "bg-white/10 hover:bg-white/15 border-white/20"}`}
              >
                {copied ? "Đã copy!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature list (nhẹ) */}
      <div className="mt-4 rounded-2xl glass p-4 w-full">
        <div className="text-white/90 font-medium mb-2">✨ Tính năng</div>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-white/85">
          <li>⚡ Rút gọn nhanh chóng</li>
          <li>🔒 An toàn, không cần API key</li>
          <li>📋 Copy 1 chạm</li>
          <li>📱 Tối ưu mobile</li>
        </ul>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
