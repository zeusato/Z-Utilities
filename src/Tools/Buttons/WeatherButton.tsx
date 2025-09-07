import React, { useEffect, useState } from "react";
import Portal from "@/components/Portal";

type WeatherButtonProps = {
  label?: string;
  className?: string;
  apiKey?: string;
  portalSelector?: string;
};

type CurrentWeather = {
  name?: string;
  main?: { temp: number; feels_like: number };
  weather?: { description: string; icon?: string }[];
};

type OneCallDaily = {
  dt: number;
  temp: { min: number; max: number };
  weather: { description: string }[];
  clouds?: number;
  uvi?: number;
  pop?: number;
};

const overlayBase =
  "fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center";
const panelBase =
  "w-[92vw] max-w-[720px] max-h-[88vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase =
  "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const closeBtn =
  "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const sectionPad = "p-4 sm:p-5";

export default function WeatherButton({
  label = "Weather",
  className = "",
  apiKey = "56c6e90bfff82043ae93482cab965c0f",
  portalSelector = "body",
}: WeatherButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [city, setCity] = useState<string>("");
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [daily, setDaily] = useState<OneCallDaily[]>([]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function getWeatherByCoords(lat: number, lon: number) {
    setLoading(true); setErr(null);
    try {
      const curUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
      const curRes = await fetch(curUrl);
      if (curRes.ok) {
        const curJson: CurrentWeather = await curRes.json();
        setCurrent(curJson);
        setCity(curJson.name || "Vị trí hiện tại");
      }

      const ocUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi&exclude=minutely,alerts`;
      try {
        const ocRes = await fetch(ocUrl);
        if (ocRes.ok) {
          const ocJson = await ocRes.json();
          const d = (ocJson?.daily || []) as OneCallDaily[];
          setDaily(d.slice(0, 3));
        } else {
          await fallbackForecast(lat, lon);
        }
      } catch {
        await fallbackForecast(lat, lon);
      }
    } catch (e: any) {
      setErr(e?.message || "Không thể tải thời tiết");
    } finally {
      setLoading(false);
    }
  }

  async function fallbackForecast(lat: number, lon: number) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Lỗi API: ${res.status}`);
      const data = await res.json();
      const list = data?.list || [];
      const out: OneCallDaily[] = [];
      const used = new Set<string>();
      for (const item of list) {
        const date = new Date(item.dt * 1000);
        const key = date.toDateString();
        if (used.has(key)) continue;
        out.push({
          dt: item.dt,
          temp: { min: item.main.temp_min, max: item.main.temp_max },
          weather: item.weather,
          clouds: item.clouds?.all ?? 0,
          pop: item.pop ?? 0,
        });
        used.add(key);
        if (out.length >= 3) break;
      }
      setDaily(out);
    } catch (e: any) {
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
      } catch {}
    }

    try {
      // @ts-ignore
      if (navigator.permissions?.query) {
        // @ts-ignore
        const p = await navigator.permissions.query({ name: "geolocation" as any });
        if (p.state === "denied") {
          localStorage.setItem("locationPermission", "denied");
          setErr("Quyền truy cập vị trí đã bị từ chối");
          return;
        }
      }
    } catch {}

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          localStorage.setItem("locationPermission", "granted");
          localStorage.setItem(
            "savedLocation",
            JSON.stringify({ latitude, longitude, timestamp: Date.now() })
          );
          await getWeatherByCoords(latitude, longitude);
          resolve();
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            localStorage.setItem("locationPermission", "denied");
            setErr("Đại ca chưa cấp quyền vị trí");
          } else {
            setErr(`Không lấy được vị trí: ${error.message}`);
          }
          resolve();
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    });
  }

  useEffect(() => {
    if (open) {
      locateAndLoad();
    }
  }, [open]);

  function DayRow({ d, idx }: { d: OneCallDaily; idx: number }) {
    const date = new Date(d.dt * 1000);
    const label = idx === 0 ? "Hôm nay" : date.toLocaleDateString("vi-VN", { weekday: "short" });
    const tmin = Math.round(d.temp.min);
    const tmax = Math.round(d.temp.max);
    const desc = d.weather?.[0]?.description || "";
    const clouds = d.clouds ?? 0;
    const pop = Math.round((d.pop ?? 0) * 100);
    return (
      <div className="py-2 border-b border-white/10 last:border-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs opacity-80">{tmin}°/{tmax}°C, {desc}</div>
        <div className="text-[11px] opacity-60">☁️{clouds}% · 🌧️{pop}%</div>
      </div>
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
                <h3 className="text-lg font-semibold text-white">Thời tiết</h3>
                <button className={closeBtn} onClick={() => setOpen(false)} aria-label="Đóng">
                  &times;
                </button>
              </div>

              <div className={`${sectionPad} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                <div className="space-y-2">
                  <div className="text-sm opacity-80">Địa điểm</div>
                  <div className="text-xl font-semibold">{city || "Đang xác định..."}</div>

                  <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm opacity-80">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang tải dữ liệu...
                      </div>
                    ) : err ? (
                      <div className="text-red-200 text-sm">{err}</div>
                    ) : current ? (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{Math.round(current.main?.temp ?? 0)}°C</div>
                        <div className="text-sm opacity-80">{current.weather?.[0]?.description}</div>
                        <div className="text-xs opacity-60">Cảm nhận: {Math.round(current.main?.feels_like ?? 0)}°C</div>
                      </div>
                    ) : (
                      <div className="text-sm opacity-80">Không có dữ liệu.</div>
                    )}
                  </div>

                  <button
                    className="mt-2 rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-2 hover:bg-blue-700"
                    onClick={() => locateAndLoad()}
                  >
                    Làm mới vị trí
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm opacity-80">Dự báo 3 ngày</div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    {daily.length ? (
                      daily.map((d, i) => <DayRow key={d.dt} d={d} idx={i} />)
                    ) : (
                      <div className="text-sm opacity-80">{loading ? "Đang tải..." : "Chưa có dự báo"}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
