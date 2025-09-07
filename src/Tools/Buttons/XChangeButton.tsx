import React, { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";


type XChangeButtonProps = {
  label?: string;
  className?: string;
  portalSelector?: string; // 'body' | '#workspace-root'
};

type TabKey = "currency" | "weight" | "length" | "temperature" | "area";

const overlayBase =
  "fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center";
const panelBase =
  "w-[92vw] max-w-[900px] max-h-[88vh] overflow-hidden glass rounded-2xl border border-white/15 shadow-2xl bg-white/10 backdrop-blur-xl text-zinc-100";
const headerBase =
  "flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10";
const sectionPad = "p-4 sm:p-5";
const closeBtn =
  "text-zinc-300 hover:text-white text-2xl leading-none font-bold px-2";
const inputBase =
  "w-full rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-zinc-300/60 outline-none focus:ring-2 focus:ring-blue-400/60 px-3 py-2";
const selectBase =
  "rounded-lg bg-white/5 border border-white/15 text-white outline-none px-3 py-2";
const btnBase =
  "rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50";
const btnPrimary =
  "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400";
const btnSecondary =
  "bg-zinc-700 text-white hover:bg-zinc-900 focus:ring-2 focus:ring-zinc-400";
const cardRow =
  "mt-4 p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between";


function digitsBefore(str: string, pos: number) {
  let n = 0;
  for (let i = 0; i < Math.max(0, Math.min(pos, str.length)); i++) {
    if (/\d/.test(str[i])) n++;
  }
  return n;
}


// Format đẹp khi blur (giới hạn 6 số thập phân)

function formatConverterResult(value: number): string {
  if (value === 0) return "0";
  if (value > 0 && value < 1) {
    if (value < 0.01) return value.toFixed(4).replace(".", ",");
    return value.toFixed(2).replace(".", ",");
  }
  return Math.round(value).toLocaleString("de-DE");
}

export default function XChangeButton({ label = "XChange", portalSelector = "body", className = "" }: XChangeButtonProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("currency");
  const cAmountRef = useRef<HTMLInputElement>(null);

  const [cAmount, setCAmount] = useState<string>("1");
  const [cFrom, setCFrom] = useState("USD");
  const [cTo, setCTo] = useState("VND");
  const [cResult, setCResult] = useState<string>("0 VND");
  const [cLoading, setCLoading] = useState(false);

  const [wInput, setWInput] = useState<string>("1");
  const [wFrom, setWFrom] = useState("lbs");
  const [wTo, setWTo] = useState("kg");
  const [wResult, setWResult] = useState<string>("0 kg");

  const [lInput, setLInput] = useState<string>("1");
  const [lFrom, setLFrom] = useState("inch");
  const [lTo, setLTo] = useState("cm");
  const [lResult, setLResult] = useState<string>("0 cm");

  const [tInput, setTInput] = useState<string>("32");
  const [tFrom, setTFrom] = useState("F");
  const [tTo, setTTo] = useState("C");
  const [tResult, setTResult] = useState<string>("0 °C");

  const [aInput, setAInput] = useState<string>("1");
  const [aFrom, setAFrom] = useState("sqm");
  const [aTo, setATo] = useState("sqft");
  const [aResult, setAResult] = useState<string>("0 ft²");

  
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

  function copyText(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  async function convertCurrency(amountOverride?: number) {
  // Lấy amount:
  const amount =
    amountOverride != null
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
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (data.result === "success" && data.rates?.[cTo] != null) {
      const rate = data.rates[cTo];
      const result = amount * rate;
      setCResult(`${formatConverterResult(result)} ${cTo}`);
    } else {
      setCResult("Lỗi API!");
    }
  } catch {
    setCResult("Lỗi mạng!");
  } finally {
    setCLoading(false);
  }
}

  function convertWeight() {
    const a = Number(wInput);
    if (!isFinite(a) || a < 0) {
      setWResult("Nhập số hợp lệ!");
      return;
    }
    let g = { lbs: a * 453.592, kg: a * 1000, g: a }[wFrom as "lbs" | "kg" | "g"];
    const r = { lbs: g / 453.592, kg: g / 1000, g: g }[wTo as "lbs" | "kg" | "g"];
    setWResult(`${formatConverterResult(r)} ${wTo}`);
  }

  function convertLength() {
    const a = Number(lInput);
    if (!isFinite(a) || a < 0) {
      setLResult("Nhập số hợp lệ!");
      return;
    }
    const toM: Record<string, number> = { inch: 0.0254, cm: 0.01, m: 1, km: 1000, ft: 0.3048, yd: 0.9144, mi: 1609.34 };
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
    const toK = { F: (x: number) => (x - 32) * 5 / 9 + 273.15, C: (x: number) => x + 273.15, K: (x: number) => x }[tFrom as "F"|"C"|"K"](a);
    const fromK = { F: (k: number) => (k - 273.15) * 9 / 5 + 32, C: (k: number) => k - 273.15, K: (k: number) => k }[tTo as "F"|"C"|"K"](toK);
    setTResult(`${formatConverterResult(fromK)} ${tTo === "F" ? "°F" : tTo === "C" ? "°C" : "K"}`);
  }

  function convertArea() {
    const a = Number(aInput);
    if (!isFinite(a) || a < 0) {
      setAResult("Nhập số hợp lệ!");
      return;
    }
    const toSqm: Record<string, number> = { sqm: 1, sqft: 0.092903, sqkm: 1_000_000, acre: 4046.86, ha: 10000 };
    const sqm = a * toSqm[aFrom];
    const r = sqm / toSqm[aTo];
    const label: Record<string, string> = { sqm: "m²", sqft: "ft²", sqkm: "km²", acre: "acre", ha: "ha" };
    setAResult(`${formatConverterResult(r)} ${label[aTo]}`);
  }

  useEffect(() => {
    if (!open) return;
    convertCurrency(); convertWeight(); convertLength(); convertTemperature(); convertArea();
  }, [open]);

  function SwapBtn({ onClick }: { onClick: () => void }) {
    return (
      <button
        type="button"
        className="shrink-0 text-blue-400 hover:text-blue-300 cursor-pointer transition text-xl select-none px-2"
        onClick={onClick}
        title="Đảo ngược đơn vị"
      >
        &#8646;
      </button>
    );
  }

  const TabButton = ({ id, text }: { id: TabKey; text: string }) => (
    <button
      className={
        "flex-1 py-2.5 text-sm font-medium border-b-2 " +
        (tab === id ? "border-blue-500 text-white" : "border-transparent text-zinc-300 hover:text-white")
      }
      onClick={() => setTab(id)}
    >
      {text}
    </button>
  );

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
              <h3 className="text-lg font-semibold text-white">Bộ chuyển đổi đơn vị</h3>
              <button className={closeBtn} onClick={() => setOpen(false)} aria-label="Đóng">
                &times;
              </button>
            </div>

            <div className="flex border-b border-white/10 bg-white/5">
              <TabButton id="currency" text="Tiền tệ" />
              <TabButton id="weight" text="Cân nặng" />
              <TabButton id="length" text="Chiều dài" />
              <TabButton id="temperature" text="Nhiệt độ" />
              <TabButton id="area" text="Diện tích" />
            </div>

            <div className={`${sectionPad} overflow-y-auto max-h-[70vh] space-y-6`}>
              {tab === "currency" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                    <input
                      inputMode="decimal"
                      placeholder="Nhập số tiền"
                      className={inputBase}
                      value={cAmount}
                      onChange={(e) => {
                        // chỉ giữ số, format nghìn bằng dấu phẩy
                        const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                        const formatted = digitsOnly ? Number(digitsOnly).toLocaleString("en-US") : "";
                        setCAmount(formatted);
                        // tính lại ngay mỗi lần gõ, dùng amountOverride để không lệ thuộc state async
                        convertCurrency(digitsOnly ? Number(digitsOnly) : 0);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && convertCurrency()}
                      />
                    <div className="hidden md:block" />
                    <div />
                  </div>

                  <div className="flex items-center gap-2">
                    <select className={selectBase} value={cFrom} onChange={(e) => setCFrom(e.target.value)}>
                      {["USD","VND","EUR","GBP","JPY","CAD","AUD","CHF","CNY"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <SwapBtn onClick={() => { const f = cFrom; setCFrom(cTo); setCTo(f); convertCurrency(); }} />
                    <select className={selectBase} value={cTo} onChange={(e) => setCTo(e.target.value)}>
                      {["VND","USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <button onClick={() => convertCurrency()} disabled={cLoading}>
                    <span>Chuyển đổi</span>
                  </button>

                  <div className={cardRow}>
                    <p className="text-blue-200">Kết quả: <span className="font-bold">{cResult}</span></p>
                    <button className={`${btnBase} ${btnSecondary}`} onClick={() => copyText(cResult)}>Copy</button>
                  </div>
                </div>
              )}

              {tab === "weight" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={inputBase}
                      placeholder="Nhập cân nặng"
                      value={wInput}
                      onChange={(e) => setWInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && convertWeight()}
                    />
                    <select className={selectBase} value={wFrom} onChange={(e) => setWFrom(e.target.value)}>
                      <option value="lbs">Pound (lbs)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                    </select>
                    <SwapBtn onClick={() => { const f = wFrom; setWFrom(wTo); setWTo(f); convertWeight(); }} />
                    <select className={selectBase} value={wTo} onChange={(e) => setWTo(e.target.value)}>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="lbs">Pound (lbs)</option>
                      <option value="g">Gram (g)</option>
                    </select>
                  </div>

                  <button className={`${btnBase} ${btnPrimary} w-full`} onClick={convertWeight}>Chuyển đổi</button>
                  <div className={cardRow}>
                    <p className="text-blue-200">Kết quả: <span className="font-bold">{wResult}</span></p>
                    <button className={`${btnBase} ${btnSecondary}`} onClick={() => copyText(wResult)}>Copy</button>
                  </div>
                </div>
              )}

              {tab === "length" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={inputBase}
                      placeholder="Nhập chiều dài"
                      value={lInput}
                      onChange={(e) => setLInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && convertLength()}
                    />
                    <select className={selectBase} value={lFrom} onChange={(e) => setLFrom(e.target.value)}>
                      {["inch","cm","m","km","ft","yd","mi"].map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <SwapBtn onClick={() => { const f = lFrom; setLFrom(lTo); setLTo(f); convertLength(); }} />
                    <select className={selectBase} value={lTo} onChange={(e) => setLTo(e.target.value)}>
                      {["cm","inch","m","km","ft","yd","mi"].map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>

                  <button className={`${btnBase} ${btnPrimary} w-full`} onClick={convertLength}>Chuyển đổi</button>
                  <div className={cardRow}>
                    <p className="text-blue-200">Kết quả: <span className="font-bold">{lResult}</span></p>
                    <button className={`${btnBase} ${btnSecondary}`} onClick={() => copyText(lResult)}>Copy</button>
                  </div>
                </div>
              )}

              {tab === "temperature" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={inputBase}
                      placeholder="Nhập nhiệt độ"
                      value={tInput}
                      onChange={(e) => setTInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && convertTemperature()}
                    />
                    <select className={selectBase} value={tFrom} onChange={(e) => setTFrom(e.target.value)}>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="C">Celsius (°C)</option>
                      <option value="K">Kelvin (K)</option>
                    </select>
                    <SwapBtn onClick={() => { const f = tFrom; setTFrom(tTo); setTTo(f); convertTemperature(); }} />
                    <select className={selectBase} value={tTo} onChange={(e) => setTTo(e.target.value)}>
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="K">Kelvin (K)</option>
                    </select>
                  </div>

                  <button className={`${btnBase} ${btnPrimary} w-full`} onClick={convertTemperature}>Chuyển đổi</button>
                  <div className={cardRow}>
                    <p className="text-blue-200">Kết quả: <span className="font-bold">{tResult}</span></p>
                    <button className={`${btnBase} ${btnSecondary}`} onClick={() => copyText(tResult)}>Copy</button>
                  </div>
                </div>
              )}

              {tab === "area" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={inputBase}
                      placeholder="Nhập diện tích"
                      value={aInput}
                      onChange={(e) => setAInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && convertArea()}
                    />
                    <select className={selectBase} value={aFrom} onChange={(e) => setAFrom(e.target.value)}>
                      <option value="sqm">Mét vuông (m²)</option>
                      <option value="sqft">Feet vuông (ft²)</option>
                      <option value="sqkm">Kilomet vuông (km²)</option>
                      <option value="acre">Acre</option>
                      <option value="ha">Hecta (ha)</option>
                    </select>
                    <SwapBtn onClick={() => { const f = aFrom; setAFrom(aTo); setATo(f); convertArea(); }} />
                    <select className={selectBase} value={aTo} onChange={(e) => setATo(e.target.value)}>
                      <option value="sqft">Feet vuông (ft²)</option>
                      <option value="sqm">Mét vuông (m²)</option>
                      <option value="sqkm">Kilomet vuông (km²)</option>
                      <option value="acre">Acre</option>
                      <option value="ha">Hecta (ha)</option>
                    </select>
                  </div>

                  <button className={`${btnBase} ${btnPrimary} w-full`} onClick={convertArea}>Chuyển đổi</button>
                  <div className={cardRow}>
                    <p className="text-blue-200">Kết quả: <span className="font-bold">{aResult}</span></p>
                    <button className={`${btnBase} ${btnSecondary}`} onClick={() => copyText(aResult)}>Copy</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Portal>
      )}
    </>
  );
}
