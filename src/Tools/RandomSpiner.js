import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
/* helpers */
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const palette = ["#00BCD4", "#8BC34A", "#FFC107", "#E91E63", "#9C27B0", "#03A9F4", "#4CAF50", "#FF9800", "#F44336", "#3F51B5"];
function useResize(ref) {
    const [rect, setRect] = useState({ w: 0, h: 0 });
    useEffect(() => {
        if (!ref.current)
            return;
        const ro = new ResizeObserver(() => {
            const el = ref.current;
            setRect({ w: el.clientWidth, h: el.clientHeight });
        });
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, [ref]);
    return rect;
}
export default function RandomSpinner() {
    const [mode, setMode] = useState("list");
    const [allowDup, setAllowDup] = useState(true);
    // list
    const [listText, setListText] = useState("Táo\nCam\nNho\nDâu\nXoài\nChuối\nvải");
    const items = useMemo(() => listText.split("\n").map(s => s.trim()).filter(Boolean), [listText]);
    const [picked, setPicked] = useState(null);
    // number
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(100);
    const [numPicked, setNumPicked] = useState(null);
    const [usedNums, setUsedNums] = useState([]);
    /* wheel */
    const stageRef = useRef(null);
    const { w: stageW, h: stageH } = useResize(stageRef);
    const canvasRef = useRef(null);
    const rotationRef = useRef(0);
    const animRef = useRef(null);
    const draw = (rot) => {
        const cvs = canvasRef.current;
        if (!cvs)
            return;
        const ctx = cvs.getContext("2d");
        if (!ctx)
            return;
        const dpr = window.devicePixelRatio || 1;
        // fit trọn khung bên phải, tránh tràn
        const size = Math.min(stageW, stageH) * 0.98;
        const pad = 16;
        const R = Math.max(50, size / 2 - pad);
        cvs.width = Math.floor(size * dpr);
        cvs.height = Math.floor(size * dpr);
        cvs.style.width = `${size}px`;
        cvs.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        const cx = size / 2, cy = size / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        const n = Math.max(2, items.length);
        const arc = TAU / n;
        for (let i = 0; i < n; i++) {
            const start = i * arc, end = start + arc;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, start, end);
            ctx.closePath();
            ctx.fillStyle = palette[i % palette.length];
            ctx.globalAlpha = 0.88;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "rgba(255,255,255,.25)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, start, end);
            ctx.stroke();
            // label
            const mid = start + arc / 2;
            ctx.save();
            ctx.rotate(mid);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fff";
            ctx.font = `${Math.max(12, Math.floor(R / 9))}px ui-sans-serif, system-ui, -apple-system`;
            ctx.fillText(items[i] ?? `Item ${i + 1}`, R * 0.62, 0);
            ctx.restore();
        }
        // center cap
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.08, 0, TAU);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();
        ctx.restore();
        // pointer (top)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(R + 10, 0);
        ctx.lineTo(R - 10, 10);
        ctx.lineTo(R - 10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // ring
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.strokeStyle = "rgba(255,255,255,.7)";
        ctx.lineWidth = 3;
        ctx.stroke();
    };
    useEffect(() => { draw(rotationRef.current); }, [stageW, stageH, items.length]);
    const spinWheel = () => {
        if (items.length < 2)
            return alert("Cần ít nhất 2 mục để quay.");
        let pool = items.map((_, i) => i);
        if (!allowDup && picked) {
            pool = pool.filter(i => items[i] !== picked);
            if (!pool.length)
                pool = items.map((_, i) => i);
        }
        const idx = pool[Math.floor(Math.random() * pool.length)];
        const n = items.length;
        const base = -Math.PI / 2 - ((idx + 0.5) / n) * TAU;
        const cur = rotationRef.current;
        const minTurns = 3, extraTurns = Math.floor(Math.random() * 3);
        const target = base + (Math.ceil((cur - base) / TAU + minTurns) + extraTurns) * TAU;
        const dur = 4200, t0 = performance.now();
        const tick = (now) => {
            const t = clamp((now - t0) / dur, 0, 1), v = easeOutCubic(t), rot = cur + (target - cur) * v;
            rotationRef.current = rot;
            draw(rot);
            if (t < 1)
                animRef.current = requestAnimationFrame(tick);
            else {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
                setPicked(items[idx]);
            }
        };
        if (animRef.current)
            cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(tick);
    };
    const spinNumber = () => {
        const a = Math.min(min, max), b = Math.max(min, max);
        if (!allowDup) {
            const rest = Array.from({ length: b - a + 1 }, (_, i) => a + i).filter(x => !usedNums.includes(x));
            if (!rest.length)
                return alert("Hết số để quay!");
            const v = rest[Math.floor(Math.random() * rest.length)];
            setUsedNums(u => [...u, v]);
            setNumPicked(v);
        }
        else
            setNumPicked(Math.floor(Math.random() * (b - a + 1)) + a);
    };
    useEffect(() => () => { if (animRef.current)
        cancelAnimationFrame(animRef.current); }, []);
    return (_jsxs("div", { className: "w-full h-full flex flex-col overflow-hidden", children: [_jsxs("div", { className: "relative flex items-center gap-3 mb-3 mt-3", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setMode("list"), className: `px-4 py-2 rounded-xl border transition
              ${mode === "list" ? "bg-cyan-500/80 border-cyan-400 text-white"
                                    : "bg-white/10 hover:bg-white/15 border-white/20"}`, children: "V\u00F2ng quay danh s\u00E1ch" }), _jsx("button", { onClick: () => setMode("number"), className: `px-4 py-2 rounded-xl border transition
              ${mode === "number" ? "bg-cyan-500/80 border-cyan-400 text-white"
                                    : "bg-white/10 hover:bg-white/15 border-white/20"}`, children: "Quay s\u1ED1 trong kho\u1EA3ng" })] }), _jsx("div", { className: "flex-1 flex items-center justify-center ml-10", children: mode === "list" && (_jsx("div", { className: `rounded-2xl glass px-4 py-2 text-center ml-20
                             text-3xl md:text-4xl font-extrabold
                             bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent
                             ${picked ? "" : "opacity-50"}`, children: picked ?? "Chưa có kết quả" })) }), _jsxs("label", { className: "flex items-center gap-2 text-sm opacity-90", children: [_jsx("input", { type: "checkbox", checked: allowDup, onChange: e => setAllowDup(e.target.checked) }), "Cho ph\u00E9p tr\u00F9ng l\u1EB7p"] })] }), mode === "list" ? (_jsxs("div", { className: "flex flex-1 gap-6 min-h-0 overflow-hidden", children: [_jsxs("div", { className: "w-[360px] max-w-[45%] h-full min-h-0 flex flex-col", children: [_jsx("label", { className: "mb-2 text-sm opacity-80", children: "M\u1ED7i d\u00F2ng 1 l\u1EF1a ch\u1ECDn" }), _jsx("textarea", { value: listText, onChange: (e) => setListText(e.target.value), className: "flex-1 min-h-0 rounded-2xl glass p-3 resize-none overflow-auto" }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("button", { onClick: spinWheel, className: "rounded-2xl px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400 transition", children: "Quay" }), _jsx("button", { onClick: () => setPicked(null), className: "rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20", children: "Xo\u00E1 k\u1EBFt qu\u1EA3" })] }), picked && _jsxs("div", { className: "mt-3 rounded-xl glass px-3 py-2 text-sm", children: ["\u2705 K\u1EBFt qu\u1EA3: ", _jsx("b", { children: picked })] })] }), _jsx("div", { className: "flex-1 min-w-0 h-full min-h-0 overflow-hidden flex items-center justify-center mr-5", children: _jsx("div", { ref: stageRef, className: "w-full h-full flex items-center justify-center", children: _jsx("canvas", { ref: canvasRef, className: "rounded-2xl bg-black/10 backdrop-blur" }) }) })] })) : (_jsxs("div", { className: "flex flex-1 gap-6 min-h-0 overflow-hidden", children: [_jsxs("div", { className: "w-[360px] max-w-[45%] h-full min-h-0 flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", value: min, onChange: e => setMin(parseInt(e.target.value || "0", 10)), className: "w-28 rounded-xl glass p-2 text-center" }), _jsx("span", { className: "opacity-80", children: "\u0111\u1EBFn" }), _jsx("input", { type: "number", value: max, onChange: e => setMax(parseInt(e.target.value || "0", 10)), className: "w-28 rounded-xl glass p-2 text-center" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: spinNumber, className: "rounded-2xl px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400 transition", children: "Quay s\u1ED1" }), _jsx("button", { onClick: () => { setNumPicked(null); setUsedNums([]); }, className: "rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20", children: "Reset" })] }), usedNums.length > 0 && !allowDup && _jsxs("div", { className: "text-xs opacity-70", children: ["\u0110\u00E3 ra: ", usedNums.join(", ")] })] }), _jsx("div", { className: "flex-1 min-w-0 h-full min-h-0 overflow-hidden flex items-center justify-center", children: _jsx("div", { className: "flex items-center justify-center w-[80%] h-[80%] rounded-2xl glass", children: numPicked === null ? (_jsx("div", { className: "opacity-60", children: "Ch\u01B0a c\u00F3 k\u1EBFt qu\u1EA3" })) : (_jsx("div", { className: "text-center font-extrabold leading-none\r\n                            text-6xl sm:text-7xl md:text-8xl lg:text-9xl\r\n                            bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent", children: numPicked })) }) })] }))] }));
}
