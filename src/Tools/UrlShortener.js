import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// src/tools/UrlShortener.tsx
import React from "react";
function Toast({ msg, type = "success" }) {
    const [show, setShow] = React.useState(true);
    React.useEffect(() => {
        const t = setTimeout(() => setShow(false), 2500);
        return () => clearTimeout(t);
    }, []);
    return (_jsxs("div", { className: `fixed top-6 right-6 z-[500] transition-transform duration-300 ${show ? "translate-x-0" : "translate-x-[150%]"} rounded-xl px-4 py-2 text-sm font-medium border
      ${type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-rose-500/90 border-rose-400 text-white"}`, role: "status", children: [type === "success" ? "✅ " : "❌ ", msg] }));
}
export default function UrlShortener() {
    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState("");
    const [toast, setToast] = React.useState(null);
    const [copied, setCopied] = React.useState(false);
    const isValidUrl = (s) => {
        try {
            const u = new URL(s.trim());
            return u.protocol === "http:" || u.protocol === "https:";
        }
        catch {
            return false;
        }
    };
    const doFetch = async (url) => {
        // Try TinyURL
        try {
            const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            if (r.ok) {
                const t = await r.text();
                if (t && t.startsWith("https://tinyurl.com/"))
                    return { url: t, service: "TinyURL" };
            }
        }
        catch { }
        // Try is.gd
        try {
            const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
            if (r.ok) {
                const t = await r.text();
                if (t && t.startsWith("https://is.gd/"))
                    return { url: t, service: "is.gd" };
            }
        }
        catch { }
        // Try v.gd
        try {
            const r = await fetch(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
            if (r.ok) {
                const t = await r.text();
                if (t && t.startsWith("https://v.gd/"))
                    return { url: t, service: "v.gd" };
            }
        }
        catch { }
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
            if (!res)
                throw new Error("Các dịch vụ rút gọn đang bận. Thử lại sau.");
            setResult(res);
            setToast({ msg: `Đã rút gọn qua ${res.service}!` });
        }
        catch (e) {
            setError(e?.message || "Có lỗi xảy ra khi rút gọn URL");
            setToast({ msg: e?.message || "Có lỗi xảy ra", type: "error" });
        }
        finally {
            setLoading(false);
        }
    };
    const copy = async () => {
        if (!result?.url)
            return;
        try {
            await navigator.clipboard.writeText(result.url);
            setCopied(true);
            setToast({ msg: "Đã sao chép link rút gọn!" });
            setTimeout(() => setCopied(false), 1500);
        }
        catch {
            setToast({ msg: "Không thể copy, hãy sao chép thủ công.", type: "error" });
        }
    };
    return (_jsxs("div", { className: "w-full h-full px-4 md:px-6", children: [_jsxs("div", { className: "rounded-2xl glass p-6 w-full h-1000 flex flex-col", children: [_jsx("div", { className: "w-full", children: _jsx("label", { htmlFor: "url", className: "block mb-2 font-medium", children: "Nh\u1EADp URL c\u1EA7n r\u00FAt g\u1ECDn" }) }), _jsxs("div", { className: "mt-4 flex gap = 3", children: [_jsx("input", { id: "url", type: "url", value: input, onChange: (e) => { setInput(e.target.value); setError(""); }, onKeyDown: (e) => { if (e.key === "Enter" && !loading)
                                    onShorten(); }, placeholder: "https://example.com/very-long-url...", className: `w-full rounded-2xl px-4 py-3 text-base border outline-none transition
              bg-white/10 backdrop-blur border-white/20 focus:border-cyan-400/70 focus:bg-white/15
              ${error ? "border-rose-400/70 bg-rose-500/10" : ""}`, autoComplete: "url" }), error && (_jsxs("div", { className: "mt-2 rounded-xl px-3 py-2 text-sm border border-rose-400/50 bg-rose-500/15", children: ["\u2757 ", error] })), _jsx("button", { onClick: onShorten, disabled: loading, className: "ml-5 w-[300px] rounded-2xl px-4 py-3 font-semibold border border-white/20\r\n                     bg-blue-500/40 hover:bg-blue-500/60 backdrop-blur transition\r\n                     disabled:opacity-60 disabled:cursor-not-allowed", children: loading ? (_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("span", { className: "h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" }), "\u0110ang r\u00FAt g\u1ECDn\u2026"] })) : ("Rút gọn Link") })] }), result && (_jsxs("div", { className: "mt-6 rounded-xl border border-white/15 bg-white/10 backdrop-blur p-4", children: [_jsx("div", { className: "text-sm text-white/80 mb-2", children: "\u2705 Link \u0111\u00E3 r\u00FAt g\u1ECDn th\u00E0nh c\u00F4ng" }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2", children: [_jsx("div", { className: "font-mono text-cyan-300 break-all", children: result.url }), _jsx("button", { onClick: copy, className: `ml-auto rounded-lg px-3 py-1.5 text-sm border transition
                  ${copied ? "bg-emerald-500/80 border-emerald-400 text-white" : "bg-white/10 hover:bg-white/15 border-white/20"}`, children: copied ? "Đã copy!" : "Copy" })] })] }))] }), _jsxs("div", { className: "mt-4 rounded-2xl glass p-4 w-full", children: [_jsx("div", { className: "text-white/90 font-medium mb-2", children: "\u2728 T\u00EDnh n\u0103ng" }), _jsxs("ul", { className: "grid sm:grid-cols-2 gap-2 text-sm text-white/85", children: [_jsx("li", { children: "\u26A1 R\u00FAt g\u1ECDn nhanh ch\u00F3ng" }), _jsx("li", { children: "\uD83D\uDD12 An to\u00E0n, kh\u00F4ng c\u1EA7n API key" }), _jsx("li", { children: "\uD83D\uDCCB Copy 1 ch\u1EA1m" }), _jsx("li", { children: "\uD83D\uDCF1 T\u1ED1i \u01B0u mobile" })] })] }), toast && _jsx(Toast, { msg: toast.msg, type: toast.type })] }));
}
