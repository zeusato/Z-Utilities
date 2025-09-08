import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
const overlayBase = "fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center";
const panelBase = "w-[92vw] max-w-[720px] max-h-[88vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase = "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const closeBtn = "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const sectionPad = "p-4 sm:p-5";
export default function WeatherButton({ label = "Weather", className = "", apiKey = "56c6e90bfff82043ae93482cab965c0f", portalSelector = "body", }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [city, setCity] = useState("");
    const [current, setCurrent] = useState(null);
    const [daily, setDaily] = useState([]);
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
    async function getWeatherByCoords(lat, lon) {
        setLoading(true);
        setErr(null);
        try {
            const curUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
            const curRes = await fetch(curUrl);
            if (curRes.ok) {
                const curJson = await curRes.json();
                setCurrent(curJson);
                setCity(curJson.name || "Vị trí hiện tại");
            }
            const ocUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi&exclude=minutely,alerts`;
            try {
                const ocRes = await fetch(ocUrl);
                if (ocRes.ok) {
                    const ocJson = await ocRes.json();
                    const d = (ocJson?.daily || []);
                    setDaily(d.slice(0, 3));
                }
                else {
                    await fallbackForecast(lat, lon);
                }
            }
            catch {
                await fallbackForecast(lat, lon);
            }
        }
        catch (e) {
            setErr(e?.message || "Không thể tải thời tiết");
        }
        finally {
            setLoading(false);
        }
    }
    async function fallbackForecast(lat, lon) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`Lỗi API: ${res.status}`);
            const data = await res.json();
            const list = data?.list || [];
            const out = [];
            const used = new Set();
            for (const item of list) {
                const date = new Date(item.dt * 1000);
                const key = date.toDateString();
                if (used.has(key))
                    continue;
                out.push({
                    dt: item.dt,
                    temp: { min: item.main.temp_min, max: item.main.temp_max },
                    weather: item.weather,
                    clouds: item.clouds?.all ?? 0,
                    pop: item.pop ?? 0,
                });
                used.add(key);
                if (out.length >= 3)
                    break;
            }
            setDaily(out);
        }
        catch (e) {
            setErr(e?.message || "Không thể tải dự báo");
        }
    }
    async function locateAndLoad() {
        setErr(null);
        if (!("geolocation" in navigator)) {
            setErr("Trình duyệt không hỗ trợ định vị");
            return;
        }
        const saved = localStorage.getItem("savedLocation");
        const permission = localStorage.getItem("locationPermission");
        if (saved && permission === "granted") {
            try {
                const parsed = JSON.parse(saved);
                const age = Date.now() - (parsed.timestamp || 0);
                if (age < 30 * 60 * 1000) {
                    await getWeatherByCoords(parsed.latitude, parsed.longitude);
                    return;
                }
            }
            catch { }
        }
        try {
            // @ts-ignore
            if (navigator.permissions?.query) {
                // @ts-ignore
                const p = await navigator.permissions.query({ name: "geolocation" });
                if (p.state === "denied") {
                    localStorage.setItem("locationPermission", "denied");
                    setErr("Quyền truy cập vị trí đã bị từ chối");
                    return;
                }
            }
        }
        catch { }
        await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                localStorage.setItem("locationPermission", "granted");
                localStorage.setItem("savedLocation", JSON.stringify({ latitude, longitude, timestamp: Date.now() }));
                await getWeatherByCoords(latitude, longitude);
                resolve();
            }, (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    localStorage.setItem("locationPermission", "denied");
                    setErr("Đại ca chưa cấp quyền vị trí");
                }
                else {
                    setErr(`Không lấy được vị trí: ${error.message}`);
                }
                resolve();
            }, { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 });
        });
    }
    useEffect(() => {
        if (open) {
            locateAndLoad();
        }
    }, [open]);
    function DayRow({ d, idx }) {
        const date = new Date(d.dt * 1000);
        const label = idx === 0 ? "Hôm nay" : date.toLocaleDateString("vi-VN", { weekday: "short" });
        const tmin = Math.round(d.temp.min);
        const tmax = Math.round(d.temp.max);
        const desc = d.weather?.[0]?.description || "";
        const clouds = d.clouds ?? 0;
        const pop = Math.round((d.pop ?? 0) * 100);
        return (_jsxs("div", { className: "py-2 border-b border-white/10 last:border-0", children: [_jsx("div", { className: "text-sm font-medium", children: label }), _jsxs("div", { className: "text-xs opacity-80", children: [tmin, "\u00B0/", tmax, "\u00B0C, ", desc] }), _jsxs("div", { className: "text-[11px] opacity-60", children: ["\u2601\uFE0F", clouds, "% \u00B7 \uD83C\uDF27\uFE0F", pop, "%"] })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: className || "rounded-xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 text-sm font-semibold text-white hover:bg-white/20", onClick: () => setOpen(true), children: label }), open && (_jsx(Portal, { selector: portalSelector, children: _jsx("div", { className: overlayBase, onMouseDown: (e) => e.target === e.currentTarget && setOpen(false), children: _jsxs("div", { className: `${panelBase} animate-in fade-in zoom-in duration-150`, children: [_jsxs("div", { className: headerBase, children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Th\u1EDDi ti\u1EBFt" }), _jsx("button", { className: closeBtn, onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng", children: "\u00D7" })] }), _jsxs("div", { className: `${sectionPad} grid grid-cols-1 md:grid-cols-2 gap-4`, children: [_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm opacity-80", children: "\u0110\u1ECBa \u0111i\u1EC3m" }), _jsx("div", { className: "text-xl font-semibold", children: city || "Đang xác định..." }), _jsx("div", { className: "mt-3 p-3 rounded-xl bg-white/5 border border-white/10", children: loading ? (_jsxs("div", { className: "flex items-center gap-2 text-sm opacity-80", children: [_jsxs("svg", { className: "h-4 w-4 animate-spin", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), "\u0110ang t\u1EA3i d\u1EEF li\u1EC7u..."] })) : err ? (_jsx("div", { className: "text-red-200 text-sm", children: err })) : current ? (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-2xl font-bold", children: [Math.round(current.main?.temp ?? 0), "\u00B0C"] }), _jsx("div", { className: "text-sm opacity-80", children: current.weather?.[0]?.description }), _jsxs("div", { className: "text-xs opacity-60", children: ["C\u1EA3m nh\u1EADn: ", Math.round(current.main?.feels_like ?? 0), "\u00B0C"] })] })) : (_jsx("div", { className: "text-sm opacity-80", children: "Kh\u00F4ng c\u00F3 d\u1EEF li\u1EC7u." })) }), _jsx("button", { className: "mt-2 rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700", onClick: () => locateAndLoad(), children: "L\u00E0m m\u1EDBi v\u1ECB tr\u00ED" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm opacity-80", children: "D\u1EF1 b\u00E1o 3 ng\u00E0y" }), _jsx("div", { className: "rounded-xl bg-white/5 border border-white/10 p-3", children: daily.length ? (daily.map((d, i) => _jsx(DayRow, { d: d, idx: i }, d.dt))) : (_jsx("div", { className: "text-sm opacity-80", children: loading ? "Đang tải..." : "Chưa có dự báo" })) })] })] })] }) }) }))] }));
}
