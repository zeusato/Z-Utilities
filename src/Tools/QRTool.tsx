"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
// ---- Import QRCodeStyling with fallbacks (helps in some bundlers) ----
// Prefer ESM default import; fallback to require if needed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let QRCodeStyling: any;
try {
  // @ts-ignore
  QRCodeStyling = (await import("qr-code-styling")).default ?? (await import("qr-code-styling"));
} catch (e) {
  // @ts-ignore
  QRCodeStyling = (window as any)?.QRCodeStyling; // if loaded via CDN in index.html
}

// Small helper to de-accent Vietnamese (always-on as per requirement)
const removeVietnameseTones = (str: string) => {
  let s = str;
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  s = s.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  s = s.replace(/đ/g, "d");
  s = s.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  s = s.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  s = s.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  s = s.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  s = s.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  s = s.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  s = s.replace(/Đ/g, "D");
  s = s.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  s = s.replace(/\u02C6|\u0306|\u031B/g, "");
  s = s.replace(/ + /g, " ");
  return s.trim();
};

type QRType = "link" | "vcard" | "wifi";

type DownloadExt = "png" | "svg" | "jpeg";

const fieldClass =
  "w-full rounded-xl border border-zinc-300/70 bg-white/60 backdrop-blur px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/60 dark:bg-zinc-900/50 dark:border-zinc-700";

export default function QRTool() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<any>(null);

  const [qrType, setQrType] = useState<QRType>("link");

  // --- Always strip accents ---
  const DISPLAY_SIZE = 300; // fixed preview size
  const [exportSize, setExportSize] = useState(1024); // only used for download
  const [margin, setMargin] = useState(2);
  const [dotColor, setDotColor] = useState("#6a1a4c");
  const [cornerColor, setCornerColor] = useState("#0000ff");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("H");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);

  // LINK
  const [linkText, setLinkText] = useState("");

  // VCARD
  const [vName, setVName] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vCompany, setVCompany] = useState("");
  const [vTitle, setVTitle] = useState("");

  // WIFI
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [security, setSecurity] = useState<"WPA" | "WEP" | "None">("WPA");

  const dataString = useMemo(() => {
    if (qrType === "link") {
      const base = removeVietnameseTones(linkText);
      return base || " ";
    }
    if (qrType === "vcard") {
      const name = removeVietnameseTones(vName);
      const company = removeVietnameseTones(vCompany);
      const title = removeVietnameseTones(vTitle);
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${company}\nTITLE:${title}\nTEL:${vPhone}\nEMAIL:${vEmail}\nEND:VCARD`;
    }
    // wifi
    return `WIFI:T:${security};S:${ssid};P:${wifiPass};;`;
  }, [qrType, linkText, vName, vPhone, vEmail, vCompany, vTitle, ssid, wifiPass, security]);

  // Initialize once
  useEffect(() => {
    if (!containerRef.current || !QRCodeStyling) return;
    if (qrRef.current) return;

    qrRef.current = new QRCodeStyling({
      width: DISPLAY_SIZE,
      height: DISPLAY_SIZE,
      type: "svg",
      data: dataString,
      qrOptions: { errorCorrectionLevel: ecc, mode: "Byte" },
      image: logoDataUrl,
      imageOptions: { crossOrigin: "anonymous", margin },
      dotsOptions: { color: dotColor, type: "rounded" },
      cornersSquareOptions: { color: cornerColor, type: "extra-rounded" },
      backgroundOptions: { color: bgColor },
    });

    qrRef.current.append(containerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update on option/data changes (preview stays 300x300)
  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.update({
      width: DISPLAY_SIZE,
      height: DISPLAY_SIZE,
      data: dataString,
      qrOptions: { errorCorrectionLevel: ecc, mode: "Byte" },
      image: logoDataUrl,
      imageOptions: { crossOrigin: "anonymous", margin },
      dotsOptions: { color: dotColor, type: "rounded" },
      cornersSquareOptions: { color: cornerColor, type: "extra-rounded" },
      backgroundOptions: { color: bgColor },
    });
  }, [dataString, ecc, logoDataUrl, margin, dotColor, cornerColor, bgColor]);

  const onLogoUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = (ev) => setLogoDataUrl(String(ev.target?.result || ""));
    rd.readAsDataURL(f);
  };

  const doDownload = (ext: DownloadExt) => {
    if (!qrRef.current) return;
    const prev = { width: DISPLAY_SIZE, height: DISPLAY_SIZE };
    qrRef.current.update({ width: exportSize, height: exportSize });
    qrRef.current.download({ name: "qr-code", extension: ext });
    qrRef.current.update(prev);
  };

  // --- UI ---
  return (
    <div className="w-full h-full overflow-hidden">
      {/* Title + top controls (transparent backgrounds) */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xl font-semibold tracking-tight">🔳 Tạo QR Đa Dụng</div>
        <div className="flex items-center gap-2 text-xs opacity-90 mr-28">
          {/* 3) Size controls positioned where old logo button was (here, same top row) */}
          <span>ECC</span>
          <select
            className={`${fieldClass} h-8 w-[76px] py-1`}
            value={ecc}
            onChange={(e) => setEcc(e.target.value as any)}
          >
            <option value="L">L</option>
            <option value="M">M</option>
            <option value="Q">Q</option>
            <option value="H">H</option>
          </select>
          <span>Xuất (px)</span>
          <input
            className={`${fieldClass} h-8 w-[96px] py-1`}
            type="number"
            min={300}
            max={4096}
            step={10}
            value={exportSize}
            onChange={(e) => setExportSize(Number(e.target.value))}
          />
          <span>Margin</span>
          <input
            className={`${fieldClass} h-8 w-[64px] py-1`}
            type="number"
            min={0}
            max={8}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Horizontal: left form | right preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-1.5rem)]">
        {/* LEFT */}
        <div className="min-w-0 overflow-auto lg:overflow-hidden">
          {/* Switcher + color style (transparent container) */}
          <div className="mb-3 flex flex-wrap items-center gap-2 ml-2 mr-2 mt-2">
            <select
              className={`${fieldClass} w-[200px]`}
              value={qrType}
              onChange={(e) => setQrType(e.target.value as QRType)}
            >
              <option value="link">Link / Text</option>
              <option value="vcard">vCard</option>
              <option value="wifi">Wi‑Fi</option>
            </select>
            <div className="mt-3 flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span>Dots</span>
              <input
                type="color"
                value={dotColor}
                onChange={(e) => setDotColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-zinc-300"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Corner</span>
              <input
                type="color"
                value={cornerColor}
                onChange={(e) => setCornerColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-zinc-300"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>BG</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-zinc-300"
              />
            </label>
            </div>
            <label className="flex items-center gap-2 text-sm ml-auto mt-3 cursor-pointer">
            <span className="hidden sm:inline">Logo</span>
            <span className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs text-white hover:bg-cyan-600">
                Chọn tệp
            </span>
            <input
                type="file"
                accept="image/*"
                onChange={onLogoUpload}
                className="hidden"
            />
            </label>
            {logoDataUrl && <span className="text-xs opacity-70 ml-2 mt-3">Đã chọn 1 file</span>}
          </div>

          {/* Dynamic fields */}
          {qrType === "link" && (
            <div className="flex flex-col gap-2 ml-2 mr-2">
              <label className="text-sm font-medium">Nội dung</label>
              <textarea
                className={`${fieldClass} min-h-[120px]`}
                maxLength={500}
                placeholder="Dán link hoặc nhập text…"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
          )}

          {qrType === "vcard" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">Họ tên</label>
                <input className={fieldClass} value={vName} onChange={(e) => setVName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">SĐT</label>
                <input className={fieldClass} value={vPhone} onChange={(e) => setVPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" className={fieldClass} value={vEmail} onChange={(e) => setVEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Công ty</label>
                <input className={fieldClass} value={vCompany} onChange={(e) => setVCompany(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Chức danh</label>
                <input className={fieldClass} value={vTitle} onChange={(e) => setVTitle(e.target.value)} />
              </div>
            </div>
          )}

          {qrType === "wifi" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tên mạng (SSID)</label>
                <input className={fieldClass} value={ssid} onChange={(e) => setSsid(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Mật khẩu</label>
                <input className={fieldClass} value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Bảo mật</label>
                <select className={fieldClass} value={security} onChange={(e) => setSecurity(e.target.value as any)}>
                  <option value="WPA">WPA</option>
                  <option value="WEP">WEP</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PREVIEW (transparent wrapper, centered, pulled up) */}
        <div className="min-w-0 overflow-hidden">
          <div className="flex h-full flex-col items-center justify-start p-0">
            <div className="flex w-full items-start justify-center">
              <div ref={containerRef} className="h-[300px] w-[300px] rounded-xl p-0" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => doDownload("png")} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700">Tải PNG</button>
              <button onClick={() => doDownload("svg")} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black">Tải SVG</button>
              <button onClick={() => doDownload("jpeg")} className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-300">Tải JPEG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
