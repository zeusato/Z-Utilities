# SHS Utilities – React Starter (Vite + TS + Tailwind)

## Cài đặt
```bash
npm i
npm run dev -- --host   # bật LAN + QR, test bằng điện thoại
```
Mặc định chạy ở: `http://localhost:5173`

## Cấu trúc chính
- `/` — Intro (Hero + CTA "Enter Workspace" + Spotlight)
- `/app` — Workspace (search trung tâm + grid 2x2 featured/recent + Sidebar)
- `/tool/:slug` — Trang tool placeholder (ghi nhận recent)

## Thành phần đáng chú ý
- `src/components/Header.tsx`: header glass, nút "Tải ứng dụng" (mobile: mở link; desktop: toggle QR panel).
- `src/components/Sidebar.tsx`: sidebar compact + optional pinned list.
- `src/components/ContactFAB.tsx`: nút gọi nổi + popup danh bạ (data: `src/assets/contact.json`). Có lọc theo Miền & Loại (Chi nhánh/PGD).

## Tailwind helpers
- `.glass`, `.glass-hover` — style nền mờ đồng bộ.
- `.scrollbar-none` — ẩn thanh cuộn; `.scrollbar-glass` — thanh cuộn kiểu glass.

## Build & Deploy
```bash
npm run build
npm run preview
```
Có thể deploy GH Pages / Vercel tuỳ nhu cầu.
