// src/data/tools.ts
// Danh sách category + tool theo yêu cầu của đại ca

export type CategoryId =
  | "image_pdf"
  | "text_data"
  | "qr_cccd"
  | "media"
  | "other";

export type Tool = {
  id: number;
  slug: string; // dùng cho router: /tool/:slug
  name: string;
  shortDesc: string;
  icon?: string; // emoji hoặc ký tự, dùng tạm cho thẻ nhỏ
  featured?: boolean;
  categoryId: CategoryId; // nhóm
  componentPath: string; // đường dẫn component tool, dùng để lazy load
};

export const TOOLS: Tool[] = [
  // --- Công cụ xử lý hình ảnh & PDF ---
  {
    id: 101,
    slug: "pdf-editor",
    name: "PDF Editor",
    shortDesc: "Chỉnh sửa PDF và ảnh trực quan.",
    icon: "📝",
    featured: true,
    categoryId: "image_pdf",
    componentPath: "../Tools/PDFEditorTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 102,
    slug: "image-to-pdf",
    name: "Chuyển đổi ảnh thành PDF",
    shortDesc: "Tạo PDF scan từ ảnh, batch upload.",
    icon: "📄",
    categoryId: "image_pdf",
    componentPath: "../tools/IMGtoPDF.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 103,
    slug: "image-to-base64",
    name: "Image to Base64",
    shortDesc: "Chuyển ảnh sang Base64, kéo thả hỗ trợ.",
    icon: "🔁",
    categoryId: "image_pdf",
    componentPath: "../tools/ImgToBase64Tool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 104,
    slug: "palette-from-image",
    name: "Tạo Bảng Màu Từ Ảnh",
    shortDesc: "Tạo bảng màu đẹp từ ảnh của bạn.",
    icon: "🎨",
    categoryId: "image_pdf",
    componentPath: "../tools/ColorPaletteTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 105,
    slug: "cccd-passport-resize",
    name: "Resize ảnh CCCD/Hộ chiếu",
    shortDesc: "Tạo ảnh chuẩn từ ảnh chân dung.",
    icon: "🪪",
    categoryId: "image_pdf",
    componentPath: "../Tools/CCCDPhotoResizer.tsx" // 👈 cái này ToolPage sẽ dùng
  },

  // --- Công cụ xử lý văn bản & dữ liệu ---
  {
    id: 201,
    slug: "ocr-from-image",
    name: "Trích xuất văn bản từ ảnh",
    shortDesc: "OCR từ ảnh hoặc PDF, xuất ra TXT.",
    icon: "🔤",
    featured: true,
    categoryId: "text_data",
    componentPath: "../tools/OCRExtractTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 202,
    slug: "excel-cleaner",
    name: "Dọn rác file Excel",
    shortDesc: "Làm sạch file Excel, tối ưu dung lượng.",
    icon: "🧹",
    categoryId: "text_data",
    componentPath: "../tools/ExcelCleanerTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 101, // số bất kỳ, chỉ cần unique
    slug: "url-shortener",
    name: "URL Shortener",
    shortDesc: "Rút gọn link nhanh chóng, copy 1 chạm",
    icon: "🔗",
    categoryId: "other",
    featured: true,
    componentPath: "../Tools/UrlShortener.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 204,
    slug: "mail-template-builder",
    name: "Mail Template Builder",
    shortDesc: "Tạo email HTML chuyên nghiệp.",
    icon: "✉️",
    categoryId: "text_data",
    componentPath: "../tools/MailTemplate.tsx" // 👈 cái này ToolPage sẽ dùng
  },

  // --- Công cụ QR Code & CCCD ---
  {
    id: 301,
    slug: "qr-generator",
    name: "Tạo QR Đa Dụng",
    shortDesc: "QR cho link, Vcard, Wi‑Fi với tuỳ chỉnh.",
    icon: "🔲",
    featured: true,
    categoryId: "qr_cccd",
    componentPath: "../tools/QRTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },
  {
    id: 302,
    slug: "qr-bank-transfer",
    name: "Tạo QR nhận tiền",
    shortDesc: "QR chuyển khoản nhanh cho ngân hàng VN.",
    icon: "💳",
    categoryId: "qr_cccd",
    componentPath: "../tools/ReceiveQRTool" // 👈 cái này ToolPage sẽ dùng
  },

  // --- Công cụ đa phương tiện ---
  {
    id: 401,
    slug: "av-separator",
    name: "Tách Hình / Tiếng Từ Video",
    shortDesc: "Tách audio/video, xuất MP3 hoặc không âm thanh.",
    icon: "🎬",
    categoryId: "media",
    componentPath: "../tools/VideoExtractTool.tsx" // 👈 cái này ToolPage sẽ dùng
  },

  // --- Tiện ích khác ---
  {
    id: 501,
    slug: "lucky-wheel",
    name: "Vòng Quay May Mắn",
    shortDesc: "Tạo vòng quay ngẫu nhiên từ danh sách.",
    icon: "🌀",
    featured: true,
    categoryId: "other",
    componentPath: "../tools/RandomSpiner.tsx" // 👈 cái này ToolPage sẽ dùng
  },
];
