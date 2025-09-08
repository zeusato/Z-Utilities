import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
const LANG_NAMES = {
    vi: "Tiếng Việt",
    en: "Tiếng Anh",
    ja: "Tiếng Nhật",
    ko: "Tiếng Hàn",
    zh: "Tiếng Trung",
};
const ALLOWED = ["vi", "en", "ja", "ko", "zh"];
const normalizeLang = (s) => (s.toLowerCase().startsWith("zh") ? "zh" : s.toLowerCase());
const isLangKey = (x) => ALLOWED.includes(x);
const DEFAULT_ENDPOINTS = [
    "https://lt.vern.cc",
    "https://translate.terraprint.co",
    "https://libretranslate.com",
];
const overlayBase = "fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center";
const panelBase = "w-[90vw] max-w-[760px] max-h-[85vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase = "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const closeBtn = "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const sectionPad = "p-4 sm:p-5";
const inputBase = "w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-zinc-300/60 outline-none focus:ring-2 focus:ring-blue-400/60 px-3 py-2";
const selectBase = "w-full rounded-lg bg-white/5 border border-white/15 text-white outline-none px-3 py-2";
const labelBase = "text-sm font-medium text-zinc-200 mb-2";
const swapIconBase = "shrink-0 text-blue-400 hover:text-blue-300 cursor-pointer transition text-xl select-none";
const toastBase = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2 rounded-lg bg-black/80 text-white text-sm shadow-lg";
const btnPrimary = "rounded-xl px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 disabled:opacity-50";
const btnSecondary = "rounded-xl px-3 py-2 text-sm font-medium bg-zinc-700 text-white hover:bg-zinc-900 focus:ring-2 focus:ring-zinc-400 disabled:opacity-50";
export default function QuickTranslateButton({ label = "Dịch nhanh", className = "", endpoints = DEFAULT_ENDPOINTS, portalSelector = "body", // hoặc "#workspace-root"
 }) {
    const [open, setOpen] = useState(false);
    const [source, setSource] = useState("auto");
    const [target, setTarget] = useState("en");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        const onEsc = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onEsc);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onEsc);
            document.body.style.overflow = "";
        };
    }, [open]);
    function showToast(msg) {
        setToast(msg);
        window.setTimeout(() => setToast(null), 2200);
    }
    async function robustTranslate(q, src, tgt) {
        const text = q.trim();
        if (!text)
            throw new Error("Nội dung rỗng");
        // build body đúng spec, bỏ hẳn api_key khi không có
        const body = {
            q: text,
            source: src, // 'auto' | 'vi' | ...
            target: tgt, // 'en' | 'vi' | ...
            format: "text",
            // alternatives: 3, // bật nếu cần, nhiều instance không hỗ trợ sẽ trả 400
        };
        const res = await fetch("/api/lt/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
        });
        const raw = await res.text(); // đọc text trước để debug được
        if (!res.ok) {
            try {
                const j = JSON.parse(raw);
                throw new Error(j?.error || raw || `HTTP ${res.status}`);
            }
            catch {
                throw new Error(raw || `HTTP ${res.status}`);
            }
        }
        return JSON.parse(raw);
    }
    async function handleTranslate() {
        const q = input.trim();
        if (!q)
            return showToast("Nhập nội dung cần dịch đã đại ca!");
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
        }
        catch (e) {
            setOutput(`Lỗi: ${e?.message || e}`);
            showToast("Hệ thống dịch đang tắc, thử lại giúp em!");
        }
        finally {
            setLoading(false);
        }
    }
    function handleSwap() {
        if (source === "auto")
            return showToast('Đang ở "Tự động phát hiện" không thể hoán đổi!');
        const oldSrc = source;
        const oldTgt = target;
        setSource(oldTgt);
        setTarget(oldSrc);
        setInput(output);
        setOutput(input);
    }
    function handleCopy() {
        if (!output)
            return showToast("Không có nội dung để copy!");
        navigator.clipboard.writeText(output).then(() => showToast("Đã copy kết quả!"), () => showToast("Copy thất bại (trình duyệt chặn)!"));
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: className || "rounded-xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 text-sm font-semibold text-white hover:bg-white/20", onClick: () => setOpen(true), children: label }), open && (_jsx(Portal, { selector: portalSelector, children: _jsxs("div", { className: overlayBase, onMouseDown: (e) => e.target === e.currentTarget && setOpen(false), children: [_jsxs("div", { className: `${panelBase} animate-in fade-in zoom-in duration-150`, children: [_jsxs("div", { className: headerBase, children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "C\u00F4ng c\u1EE5 d\u1ECBch nhanh" }), _jsx("button", { className: closeBtn, onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng", children: "\u00D7" })] }), _jsxs("div", { className: `${sectionPad} grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4`, children: [_jsxs("div", { children: [_jsx("label", { className: labelBase, children: "Ng\u00F4n ng\u1EEF ngu\u1ED3n" }), _jsxs("select", { className: selectBase, value: source, onChange: (e) => setSource(e.target.value), children: [_jsx("option", { value: "auto", children: "T\u1EF1 \u0111\u1ED9ng ph\u00E1t hi\u1EC7n" }), ALLOWED.map(k => _jsx("option", { value: k, children: LANG_NAMES[k] }, k))] }), _jsx("div", { className: "mt-2", children: _jsx("textarea", { className: inputBase, rows: 7, placeholder: "G\u00F5 ho\u1EB7c d\u00E1n n\u1ED9i dung c\u1EA7n d\u1ECBch...", value: input, onChange: (e) => setInput(e.target.value) }) })] }), _jsx("div", { className: "flex items-center justify-center pt-6 md:pt-8", children: _jsx("button", { type: "button", className: swapIconBase, title: "\u0110\u1EA3o chi\u1EC1u", onClick: handleSwap, children: "\u21C6" }) }), _jsxs("div", { children: [_jsx("label", { className: labelBase, children: "D\u1ECBch sang" }), _jsx("select", { className: selectBase, value: target, onChange: (e) => setTarget(e.target.value), children: ALLOWED.map(k => _jsx("option", { value: k, children: LANG_NAMES[k] }, k)) }), _jsx("div", { className: "mt-2", children: _jsx("textarea", { className: `${inputBase} min-h-[2.5rem]`, rows: 7, placeholder: "K\u1EBFt qu\u1EA3 s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y...", value: output, readOnly: true }) })] })] }), _jsxs("div", { className: `${sectionPad} flex items-center justify-end gap-2 border-t border-white/10`, children: [_jsx("button", { type: "button", className: btnSecondary, onClick: handleCopy, children: "Copy k\u1EBFt qu\u1EA3" }), _jsxs("button", { type: "button", disabled: loading, className: `${btnPrimary} inline-flex items-center gap-2`, onClick: handleTranslate, children: [loading && (_jsxs("svg", { className: "h-4 w-4 animate-spin", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] })), _jsx("span", { children: loading ? "Đang dịch..." : "Dịch" })] })] })] }), toast && _jsx("div", { className: toastBase, children: toast })] }) }))] }));
}
