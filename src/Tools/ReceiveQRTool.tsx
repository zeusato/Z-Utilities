"use client";
import React from "react";

const fieldClass =
  "w-full rounded-xl border border-zinc-300/70 bg-white/60 backdrop-blur px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/60 dark:bg-zinc-900/50 dark:border-zinc-700";

const bankOptions = [
  "970415 - VietinBank","970436 - Vietcombank","970418 - BIDV","970405 - Agribank","970448 - OCB","970422 - MBBank","970407 - Techcombank","970416 - ACB","970432 - VPBank","970423 - TPBank","970403 - Sacombank","970437 - HDBank","970454 - VietCapitalBank","970429 - SCB","970441 - VIB","970443 - SHB","970431 - Eximbank","970426 - MSB","546034 - CAKE","546035 - Ubank","963388 - Timo","971005 - ViettelMoney","971011 - VNPTMoney","970400 - SaigonBank","970409 - BacABank","970412 - PVcomBank","970414 - MBV","970419 - NCB","970424 - ShinhanBank","970425 - ABBANK","970427 - VietABank","970428 - NamABank","970430 - PGBank","970433 - VietBank","970438 - BaoVietBank","970440 - SeABank","970446 - COOPBANK","970449 - LPBank","970452 - KienLongBank","668888 - KBank","970462 - KookminHN","970466 - KEBHanaHCM","970467 - KEBHanaHN","977777 - MAFC","533948 - Citibank","970463 - KookminHCM","999888 - VBSP","970457 - Woori","970421 - VRB","970458 - UnitedOverseas","970410 - StandardChartered","970439 - PublicBank","801011 - Nonghyup","970434 - IndovinaBank","970456 - IBKHCM","970455 - IBKHN","458761 - HSBC","970442 - HongLeong","970408 - GPBank","970406 - Vikki","796500 - DBSBank","422589 - CIMB","970444 - CBBank",
];

function useLocalStorage(key: string, initial: string) {
  const [value, setValue] = React.useState<string>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const v = localStorage.getItem(key);
      return v ?? initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, value); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export default function ReceiveQRTool() {
  const [stk, setStk] = useLocalStorage("savedStkPro", "");
  const [bank, setBank] = useLocalStorage("savedBankPro", "");
  const [saveStk, setSaveStk] = useLocalStorage("saveStkProChecked", "false");
  const [saveBank, setSaveBank] = useLocalStorage("saveBankProChecked", "false");
  const [amount, setAmount] = React.useState("");
  const [msg, setMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [qrUrl, setQrUrl] = React.useState<string | null>(null);

  const onAmountInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) return setAmount("");
    const n = Number(digits);
    setAmount(n.toLocaleString("vi-VN"));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!stk.trim() || !bank.trim()) {
      setMsg({ type: "error", text: "Vui lòng nhập đủ STK và Ngân hàng" });
      return;
    }
    if (saveStk !== "true") localStorage.removeItem("savedStkPro");
    if (saveBank !== "true") localStorage.removeItem("savedBankPro");

    const bankCode = bank.trim().split(" ")[0];
    const amountRaw = amount.replace(/[^0-9]/g, "") || "0";

    const newUrl = `https://img.vietqr.io/image/${bankCode}-${stk.trim()}-compact2.png?amount=${amountRaw}`;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setQrUrl(newUrl);
      setMsg({ type: "success", text: "QR code đã được tạo!" });
    }, 800);
  };

  return (
    <div className="w-full h-full">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LEFT: form */}
        <div className="min-w-0">
            <div className="text-xl font-semibold tracking-tight ml-2 mb-3">Hãy nhập các thông tin cần thiết</div>
          {msg && (
            <div className={`mb-3 rounded-xl px-3 py-2 text-sm ${
              msg.type === "success" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
            }`}>{msg.text}</div>
          )}

          <form onSubmit={submit} autoComplete="off" className="space-y-3 ml-2 mr-2">
            <div>
              <label className="text-sm font-medium">Số tài khoản nhận tiền</label>
              <input
                value={stk}
                onChange={(e) => setStk(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className={fieldClass}
                placeholder="Nhập số tài khoản"
                required
              />
              <label className="mt-2 flex items-center gap-2 text-xs opacity-80">
                <input type="checkbox" className="size-4 accent-cyan-500" checked={saveStk === "true"} onChange={(e)=>setSaveStk(String(e.target.checked))} />
                Lưu thông tin này
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Ngân hàng thụ hưởng</label>
              <input
                list="bankListPro"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className={fieldClass}
                placeholder="Tìm và chọn ngân hàng…"
                required
              />
              <datalist id="bankListPro">
                {bankOptions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <label className="mt-2 flex items-center gap-2 text-xs opacity-80">
                <input type="checkbox" className="size-4 accent-cyan-500" checked={saveBank === "true"} onChange={(e)=>setSaveBank(String(e.target.checked))} />
                Lưu thông tin này
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Số tiền (VNĐ) – bỏ trống nếu không cố định</label>
              <input
                value={amount}
                onChange={(e) => onAmountInput(e.target.value)}
                inputMode="numeric"
                className={fieldClass}
                placeholder="Nhập số tiền (mặc định 0)"
              />
            </div>

            <button type="submit" className="w-full rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white shadow hover:bg-cyan-700 disabled:opacity-60">
              {loading ? "⏳ Đang tạo QR…" : "🎯 Tạo mã QR"}
            </button>
          </form>
        </div>

        {/* RIGHT: result */}
        <div id="qr-result" className="min-w-0 flex flex-col items-center justify-start">
          <div className="rounded-2xl p-3 w-full flex flex-col items-center">
            <div className="mb-2 text-sm opacity-80 mt-0">Kết quả</div>
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR chuyển khoản" className="max-w-[300px]" />
                {/* <p className="mt-2 text-xs opacity-70">STK: {stk} | Bank: {bank.split(" ")[0]} | Số tiền: {amount || 0} VND</p> */}
              </>
            ) : (
              <p className="text-sm text-gray-500">Chưa có QR nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
