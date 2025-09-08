import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
const overlayBase = "fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center";
const panelBase = "w-[92vw] max-w-[900px] max-h-[88vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase = "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const sectionPad = "p-4 sm:p-5";
const closeBtn = "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const inputBase = "w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-zinc-300/60 outline-none focus:ring-2 focus:ring-blue-400/60 px-3 py-2";
const selectBase = "rounded-lg bg-white/5 border border-white/15 text-white outline-none px-3 py-2";
const btnBase = "rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400";
const btnSecondary = "bg-zinc-700 text-white hover:bg-zinc-900 focus:ring-2 focus:ring-zinc-400";
const cardRow = "mt-4 p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between";
function digitsBefore(str, pos) {
    let n = 0;
    for (let i = 0; i < Math.max(0, Math.min(pos, str.length)); i++) {
        if (/\d/.test(str[i]))
            n++;
    }
    return n;
}
// Format đẹp khi blur (giới hạn 6 số thập phân)
function formatConverterResult(value) {
    if (value === 0)
        return "0";
    if (value > 0 && value < 1) {
        if (value < 0.01)
            return value.toFixed(4).replace(".", ",");
        return value.toFixed(2).replace(".", ",");
    }
    return Math.round(value).toLocaleString("de-DE");
}
export default function XChangeButton({ label = "XChange", portalSelector = "body", className = "" }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState("currency");
    const cAmountRef = useRef(null);
    const [cAmount, setCAmount] = useState("1");
    const [cFrom, setCFrom] = useState("USD");
    const [cTo, setCTo] = useState("VND");
    const [cResult, setCResult] = useState("0 VND");
    const [cLoading, setCLoading] = useState(false);
    const [wInput, setWInput] = useState("1");
    const [wFrom, setWFrom] = useState("lbs");
    const [wTo, setWTo] = useState("kg");
    const [wResult, setWResult] = useState("0 kg");
    const [lInput, setLInput] = useState("1");
    const [lFrom, setLFrom] = useState("inch");
    const [lTo, setLTo] = useState("cm");
    const [lResult, setLResult] = useState("0 cm");
    const [tInput, setTInput] = useState("32");
    const [tFrom, setTFrom] = useState("F");
    const [tTo, setTTo] = useState("C");
    const [tResult, setTResult] = useState("0 °C");
    const [aInput, setAInput] = useState("1");
    const [aFrom, setAFrom] = useState("sqm");
    const [aTo, setATo] = useState("sqft");
    const [aResult, setAResult] = useState("0 ft²");
    useEffect(() => {
        if (!open)
            return;
        document.body.style.overflow = "hidden";
        const onEsc = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("keydown", onEsc);
            document.body.style.overflow = "";
        };
    }, [open]);
    function copyText(text) {
        if (!text)
            return;
        navigator.clipboard?.writeText(text).catch(() => { });
    }
    async function convertCurrency(amountOverride) {
        // Lấy amount:
        const amount = amountOverride != null
            ? amountOverride
            : Number((cAmount || "0").replace(/,/g, "")); // giống index: bỏ dấu phẩy
        if (!isFinite(amount) || amount < 0) {
            setCResult("Nhập số hợp lệ!");
            return;
        }
        setCLoading(true);
        setCResult("Đang tải tỷ giá...");
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${cFrom.toUpperCase()}`);
            if (!res.ok)
                throw new Error(res.statusText);
            const data = await res.json();
            if (data.result === "success" && data.rates?.[cTo] != null) {
                const rate = data.rates[cTo];
                const result = amount * rate;
                setCResult(`${formatConverterResult(result)} ${cTo}`);
            }
            else {
                setCResult("Lỗi API!");
            }
        }
        catch {
            setCResult("Lỗi mạng!");
        }
        finally {
            setCLoading(false);
        }
    }
    function convertWeight() {
        const a = Number(wInput);
        if (!isFinite(a) || a < 0) {
            setWResult("Nhập số hợp lệ!");
            return;
        }
        let g = { lbs: a * 453.592, kg: a * 1000, g: a }[wFrom];
        const r = { lbs: g / 453.592, kg: g / 1000, g: g }[wTo];
        setWResult(`${formatConverterResult(r)} ${wTo}`);
    }
    function convertLength() {
        const a = Number(lInput);
        if (!isFinite(a) || a < 0) {
            setLResult("Nhập số hợp lệ!");
            return;
        }
        const toM = { inch: 0.0254, cm: 0.01, m: 1, km: 1000, ft: 0.3048, yd: 0.9144, mi: 1609.34 };
        const m = a * toM[lFrom];
        const r = m / toM[lTo];
        setLResult(`${formatConverterResult(r)} ${lTo}`);
    }
    function convertTemperature() {
        const a = Number(tInput);
        if (!isFinite(a)) {
            setTResult("Nhập số hợp lệ!");
            return;
        }
        const toK = { F: (x) => (x - 32) * 5 / 9 + 273.15, C: (x) => x + 273.15, K: (x) => x }[tFrom](a);
        const fromK = { F: (k) => (k - 273.15) * 9 / 5 + 32, C: (k) => k - 273.15, K: (k) => k }[tTo](toK);
        setTResult(`${formatConverterResult(fromK)} ${tTo === "F" ? "°F" : tTo === "C" ? "°C" : "K"}`);
    }
    function convertArea() {
        const a = Number(aInput);
        if (!isFinite(a) || a < 0) {
            setAResult("Nhập số hợp lệ!");
            return;
        }
        const toSqm = { sqm: 1, sqft: 0.092903, sqkm: 1_000_000, acre: 4046.86, ha: 10000 };
        const sqm = a * toSqm[aFrom];
        const r = sqm / toSqm[aTo];
        const label = { sqm: "m²", sqft: "ft²", sqkm: "km²", acre: "acre", ha: "ha" };
        setAResult(`${formatConverterResult(r)} ${label[aTo]}`);
    }
    useEffect(() => {
        if (!open)
            return;
        convertCurrency();
        convertWeight();
        convertLength();
        convertTemperature();
        convertArea();
    }, [open]);
    function SwapBtn({ onClick }) {
        return (_jsx("button", { type: "button", className: "shrink-0 text-blue-400 hover:text-blue-300 cursor-pointer transition text-xl select-none px-2", onClick: onClick, title: "\u0110\u1EA3o ng\u01B0\u1EE3c \u0111\u01A1n v\u1ECB", children: "\u21C6" }));
    }
    const TabButton = ({ id, text }) => (_jsx("button", { className: "flex-1 py-2.5 text-sm font-medium border-b-2 " +
            (tab === id ? "border-blue-500 text-white" : "border-transparent text-zinc-300 hover:text-white"), onClick: () => setTab(id), children: text }));
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: className || "rounded-xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 text-sm font-semibold text-white hover:bg-white/20", onClick: () => setOpen(true), children: label }), open && (_jsx(Portal, { selector: portalSelector, children: _jsx("div", { className: overlayBase, onMouseDown: (e) => e.target === e.currentTarget && setOpen(false), children: _jsxs("div", { className: `${panelBase} animate-in fade-in zoom-in duration-150`, children: [_jsxs("div", { className: headerBase, children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "B\u1ED9 chuy\u1EC3n \u0111\u1ED5i \u0111\u01A1n v\u1ECB" }), _jsx("button", { className: closeBtn, onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng", children: "\u00D7" })] }), _jsxs("div", { className: "flex border-b border-white/10 bg-white/5", children: [_jsx(TabButton, { id: "currency", text: "Ti\u1EC1n t\u1EC7" }), _jsx(TabButton, { id: "weight", text: "C\u00E2n n\u1EB7ng" }), _jsx(TabButton, { id: "length", text: "Chi\u1EC1u d\u00E0i" }), _jsx(TabButton, { id: "temperature", text: "Nhi\u1EC7t \u0111\u1ED9" }), _jsx(TabButton, { id: "area", text: "Di\u1EC7n t\u00EDch" })] }), _jsxs("div", { className: `${sectionPad} overflow-y-auto max-h-[70vh] space-y-6`, children: [tab === "currency" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-[1fr_auto_1fr] gap-2", children: [_jsx("input", { inputMode: "decimal", placeholder: "Nh\u1EADp s\u1ED1 ti\u1EC1n", className: inputBase, value: cAmount, onChange: (e) => {
                                                            // chỉ giữ số, format nghìn bằng dấu phẩy
                                                            const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                                                            const formatted = digitsOnly ? Number(digitsOnly).toLocaleString("en-US") : "";
                                                            setCAmount(formatted);
                                                            // tính lại ngay mỗi lần gõ, dùng amountOverride để không lệ thuộc state async
                                                            convertCurrency(digitsOnly ? Number(digitsOnly) : 0);
                                                        }, onKeyDown: (e) => e.key === "Enter" && convertCurrency() }), _jsx("div", { className: "hidden md:block" }), _jsx("div", {})] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("select", { className: selectBase, value: cFrom, onChange: (e) => setCFrom(e.target.value), children: ["USD", "VND", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"].map((c) => (_jsx("option", { value: c, children: c }, c))) }), _jsx(SwapBtn, { onClick: () => { const f = cFrom; setCFrom(cTo); setCTo(f); convertCurrency(); } }), _jsx("select", { className: selectBase, value: cTo, onChange: (e) => setCTo(e.target.value), children: ["VND", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"].map((c) => (_jsx("option", { value: c, children: c }, c))) })] }), _jsx("button", { onClick: () => convertCurrency(), disabled: cLoading, children: _jsx("span", { children: "Chuy\u1EC3n \u0111\u1ED5i" }) }), _jsxs("div", { className: cardRow, children: [_jsxs("p", { className: "text-blue-200", children: ["K\u1EBFt qu\u1EA3: ", _jsx("span", { className: "font-bold", children: cResult })] }), _jsx("button", { className: `${btnBase} ${btnSecondary}`, onClick: () => copyText(cResult), children: "Copy" })] })] })), tab === "weight" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: inputBase, placeholder: "Nh\u1EADp c\u00E2n n\u1EB7ng", value: wInput, onChange: (e) => setWInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && convertWeight() }), _jsxs("select", { className: selectBase, value: wFrom, onChange: (e) => setWFrom(e.target.value), children: [_jsx("option", { value: "lbs", children: "Pound (lbs)" }), _jsx("option", { value: "kg", children: "Kilogram (kg)" }), _jsx("option", { value: "g", children: "Gram (g)" })] }), _jsx(SwapBtn, { onClick: () => { const f = wFrom; setWFrom(wTo); setWTo(f); convertWeight(); } }), _jsxs("select", { className: selectBase, value: wTo, onChange: (e) => setWTo(e.target.value), children: [_jsx("option", { value: "kg", children: "Kilogram (kg)" }), _jsx("option", { value: "lbs", children: "Pound (lbs)" }), _jsx("option", { value: "g", children: "Gram (g)" })] })] }), _jsx("button", { className: `${btnBase} ${btnPrimary} w-full`, onClick: convertWeight, children: "Chuy\u1EC3n \u0111\u1ED5i" }), _jsxs("div", { className: cardRow, children: [_jsxs("p", { className: "text-blue-200", children: ["K\u1EBFt qu\u1EA3: ", _jsx("span", { className: "font-bold", children: wResult })] }), _jsx("button", { className: `${btnBase} ${btnSecondary}`, onClick: () => copyText(wResult), children: "Copy" })] })] })), tab === "length" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: inputBase, placeholder: "Nh\u1EADp chi\u1EC1u d\u00E0i", value: lInput, onChange: (e) => setLInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && convertLength() }), _jsx("select", { className: selectBase, value: lFrom, onChange: (e) => setLFrom(e.target.value), children: ["inch", "cm", "m", "km", "ft", "yd", "mi"].map((k) => _jsx("option", { value: k, children: k }, k)) }), _jsx(SwapBtn, { onClick: () => { const f = lFrom; setLFrom(lTo); setLTo(f); convertLength(); } }), _jsx("select", { className: selectBase, value: lTo, onChange: (e) => setLTo(e.target.value), children: ["cm", "inch", "m", "km", "ft", "yd", "mi"].map((k) => _jsx("option", { value: k, children: k }, k)) })] }), _jsx("button", { className: `${btnBase} ${btnPrimary} w-full`, onClick: convertLength, children: "Chuy\u1EC3n \u0111\u1ED5i" }), _jsxs("div", { className: cardRow, children: [_jsxs("p", { className: "text-blue-200", children: ["K\u1EBFt qu\u1EA3: ", _jsx("span", { className: "font-bold", children: lResult })] }), _jsx("button", { className: `${btnBase} ${btnSecondary}`, onClick: () => copyText(lResult), children: "Copy" })] })] })), tab === "temperature" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: inputBase, placeholder: "Nh\u1EADp nhi\u1EC7t \u0111\u1ED9", value: tInput, onChange: (e) => setTInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && convertTemperature() }), _jsxs("select", { className: selectBase, value: tFrom, onChange: (e) => setTFrom(e.target.value), children: [_jsx("option", { value: "F", children: "Fahrenheit (\u00B0F)" }), _jsx("option", { value: "C", children: "Celsius (\u00B0C)" }), _jsx("option", { value: "K", children: "Kelvin (K)" })] }), _jsx(SwapBtn, { onClick: () => { const f = tFrom; setTFrom(tTo); setTTo(f); convertTemperature(); } }), _jsxs("select", { className: selectBase, value: tTo, onChange: (e) => setTTo(e.target.value), children: [_jsx("option", { value: "C", children: "Celsius (\u00B0C)" }), _jsx("option", { value: "F", children: "Fahrenheit (\u00B0F)" }), _jsx("option", { value: "K", children: "Kelvin (K)" })] })] }), _jsx("button", { className: `${btnBase} ${btnPrimary} w-full`, onClick: convertTemperature, children: "Chuy\u1EC3n \u0111\u1ED5i" }), _jsxs("div", { className: cardRow, children: [_jsxs("p", { className: "text-blue-200", children: ["K\u1EBFt qu\u1EA3: ", _jsx("span", { className: "font-bold", children: tResult })] }), _jsx("button", { className: `${btnBase} ${btnSecondary}`, onClick: () => copyText(tResult), children: "Copy" })] })] })), tab === "area" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: inputBase, placeholder: "Nh\u1EADp di\u1EC7n t\u00EDch", value: aInput, onChange: (e) => setAInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && convertArea() }), _jsxs("select", { className: selectBase, value: aFrom, onChange: (e) => setAFrom(e.target.value), children: [_jsx("option", { value: "sqm", children: "M\u00E9t vu\u00F4ng (m\u00B2)" }), _jsx("option", { value: "sqft", children: "Feet vu\u00F4ng (ft\u00B2)" }), _jsx("option", { value: "sqkm", children: "Kilomet vu\u00F4ng (km\u00B2)" }), _jsx("option", { value: "acre", children: "Acre" }), _jsx("option", { value: "ha", children: "Hecta (ha)" })] }), _jsx(SwapBtn, { onClick: () => { const f = aFrom; setAFrom(aTo); setATo(f); convertArea(); } }), _jsxs("select", { className: selectBase, value: aTo, onChange: (e) => setATo(e.target.value), children: [_jsx("option", { value: "sqft", children: "Feet vu\u00F4ng (ft\u00B2)" }), _jsx("option", { value: "sqm", children: "M\u00E9t vu\u00F4ng (m\u00B2)" }), _jsx("option", { value: "sqkm", children: "Kilomet vu\u00F4ng (km\u00B2)" }), _jsx("option", { value: "acre", children: "Acre" }), _jsx("option", { value: "ha", children: "Hecta (ha)" })] })] }), _jsx("button", { className: `${btnBase} ${btnPrimary} w-full`, onClick: convertArea, children: "Chuy\u1EC3n \u0111\u1ED5i" }), _jsxs("div", { className: cardRow, children: [_jsxs("p", { className: "text-blue-200", children: ["K\u1EBFt qu\u1EA3: ", _jsx("span", { className: "font-bold", children: aResult })] }), _jsx("button", { className: `${btnBase} ${btnSecondary}`, onClick: () => copyText(aResult), children: "Copy" })] })] }))] })] }) }) }))] }));
}
